/**
 * A store's own WhatsApp: link it (QR), test it, read and answer chats, edit
 * the order-message templates and pick the group that gets new-order alerts.
 * The session itself runs in the WhatsApp bridge (server/waBridge.ts).
 *
 * Mounted under /api/whatsapp/… — not under /api/store/, which is the public
 * storefront prefix where no tenant is resolved (server/tenantAuth.ts).
 */
import type { Express, Response } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import { whatsappService, storeKey } from "./whatsappService";
import { requireAdmin, type EmployeeRequest } from "./employeeAuth";
import { rateLimit } from "./rateLimit";
import { asciiDigits, canonicalPhone } from "./phone";
import { storeTimeZone, dayStart } from "./storeTime";
import { TEMPLATE_EVENTS, TEMPLATE_VARIABLES, defaultTemplate, resolveTemplate, type TemplateEvent, type TemplateLang } from "./waTemplates";

function tenantOf(req: EmployeeRequest, res: Response): number | null {
  const tenantId = Number((req as any).tenantId ?? 0) || 0;
  if (!tenantId) {
    res.status(400).json({ error: "tenant required" });
    return null;
  }
  return tenantId;
}

/** Digits the bridge can dial: Arabic-Indic digits and local Syrian/Egyptian mobiles normalised. */
function dialDigits(raw: unknown): string {
  const typed = asciiDigits(raw).trim();
  if (!typed) return "";
  return (canonicalPhone(typed) || typed).replace(/\D/g, "");
}

/**
 * The bridge waits for WhatsApp's ack, which on a slow phone connection can
 * take a minute and left the screen spinning. After 15 s answer "queued" —
 * the bridge keeps the message and still delivers it (no resend here).
 */
const SEND_WAIT_MS = 15_000;
async function sendCapped(tenantId: number, to: string, text: string): Promise<{ ok: boolean; queued?: boolean; error?: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ ok: boolean; queued: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, queued: true }), SEND_WAIT_MS);
  });
  try {
    return await Promise.race([whatsappService.storeSend(tenantId, to, text), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Seconds since midnight in the store's own time zone (Damascus for SYP). */
async function secondsSinceStoreMidnight(tenantId: number): Promise<number> {
  const tz = await storeTimeZone(tenantId);
  return Math.max(0, Math.floor((Date.now() - dayStart(tz, new Date()).getTime()) / 1000));
}

async function readMeta(tenantId: number): Promise<any> {
  const tenant = await storage.getTenant(tenantId);
  return { ...((tenant?.metadata as any) || {}) };
}

async function writeMeta(tenantId: number, meta: any) {
  await storage.updateTenant(tenantId, { metadata: meta } as any);
}

async function storeLang(tenantId: number, meta: any): Promise<TemplateLang> {
  if (meta.whatsappTemplates?.lang) return meta.whatsappTemplates.lang;
  try {
    const [rows]: any = await pool.query("SELECT currency FROM branches WHERE tenant_id = ? ORDER BY is_main DESC, id LIMIT 1", [tenantId]);
    return rows?.[0]?.currency === "SYP" ? "ar" : "en";
  } catch {
    return "en";
  }
}

const fail = (res: Response, e: any) => res.status(500).json({ error: e?.message || "Error" });

/** Same number → same key the bridge uses (so opt-outs and duplicates match). */
function phoneKey(raw: string): string {
  let d = asciiDigits(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("410") && d.length === 12) d = "41" + d.slice(3);
  else if (d.startsWith("0") && d.length === 10 && /^07/.test(d)) d = "41" + d.slice(1);
  else if (d.startsWith("09") && d.length === 10) d = "963" + d.slice(1);
  return d.length >= 8 && d.length <= 15 ? d : "";
}

type Audience = "all" | "online" | "wholesale";
const CAMPAIGN_DAILY_CAP = 1000;

async function ensureCampaignTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS wa_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    audience VARCHAR(20) NOT NULL,
    body TEXT NOT NULL,
    promo_code VARCHAR(64) NULL,
    recipients INT NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_wa_campaign_tenant (tenant_id, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

/** Customers with a phone number for an audience, de-duplicated, minus opt-outs. */
async function audienceList(tenantId: number, audience: Audience): Promise<{ phone: string; name: string }[]> {
  const rows: { name: string; phone: string }[] = [];
  if (audience === "all" || audience === "wholesale") {
    const [r]: any = await pool.query(
      `SELECT name, phone FROM customers WHERE tenant_id = ? AND phone IS NOT NULL AND phone <> ''${audience === "wholesale" ? " AND customer_type = 'wholesale'" : ""}`,
      [tenantId]);
    rows.push(...r);
  }
  if (audience === "all" || audience === "online") {
    const [r]: any = await pool.query(
      "SELECT customer_name AS name, customer_phone AS phone FROM online_orders WHERE tenant_id = ? AND customer_phone IS NOT NULL AND customer_phone <> '' ORDER BY id DESC",
      [tenantId]);
    rows.push(...r);
  }
  let optedOut = new Set<string>();
  try {
    const [o]: any = await pool.query("SELECT phone FROM wa_optouts WHERE session_key = ?", [storeKey(tenantId)]);
    optedOut = new Set(o.map((x: any) => String(x.phone)));
  } catch { }
  const seen = new Map<string, { phone: string; name: string }>();
  for (const r of rows) {
    const k = phoneKey(r.phone);
    if (!k || optedOut.has(k) || seen.has(k)) continue;
    seen.set(k, { phone: k, name: String(r.name || "").trim() });
  }
  return [...seen.values()];
}

export function registerWhatsAppStoreRoutes(app: Express): void {
  // ── Connection ─────────────────────────────────────────────────────────────
  app.get("/api/whatsapp/session", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const view = await whatsappService.storeSession(tenantId, true);
      const meta = await readMeta(tenantId);
      // Linking proves the store holds this number: it becomes the store's
      // verified WhatsApp number for order alerts.
      if (view.status === "connected" && view.phone && (meta.whatsappAdminPhone !== view.phone || !meta.whatsappVerifiedAt)) {
        if (!meta.whatsappAdminPhone || meta.whatsappLinkedPhone === meta.whatsappAdminPhone) {
          meta.whatsappAdminPhone = view.phone;
          meta.whatsappVerifiedAt = new Date().toISOString();
        }
        meta.whatsappLinkedPhone = view.phone;
        await writeMeta(tenantId, meta);
      }
      res.json({ ...view, alerts: meta.whatsappAlerts || {} });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/whatsapp/session/connect", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      res.json(await whatsappService.storeConnect(tenantId));
    } catch (e) { fail(res, e); }
  });

  // Pause the store's session without unlinking the phone. Unlike logout it
  // keeps the pairing and the verified admin number (whatsappAdminPhone).
  app.post("/api/whatsapp/session/disconnect", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      res.json(await whatsappService.storeDisconnect(tenantId));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/whatsapp/session/logout", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const view = await whatsappService.storeLogout(tenantId);
      const meta = await readMeta(tenantId);
      if (meta.whatsappLinkedPhone && meta.whatsappAdminPhone === meta.whatsappLinkedPhone) {
        meta.whatsappAdminPhone = "";
        meta.whatsappVerifiedAt = null;
      }
      meta.whatsappLinkedPhone = "";
      await writeMeta(tenantId, meta);
      res.json(view);
    } catch (e) { fail(res, e); }
  });

  app.post(
    "/api/whatsapp/session/test",
    requireAdmin,
    rateLimit({ name: "wa-store-test", max: 10, windowMs: 10 * 60 * 1000, keyFn: (req: any) => String(req.tenantId ?? "unknown") }),
    async (req: EmployeeRequest, res) => {
      try {
        const tenantId = tenantOf(req, res);
        if (tenantId == null) return;
        const view = await whatsappService.storeSession(tenantId, true);
        if (view.status !== "connected") return res.status(409).json({ error: "واتساب المتجر غير متصل حالياً" });
        const to = dialDigits(req.body?.phone) || view.phone || "";
        if (!to) return res.status(400).json({ error: "اكتب رقماً لإرسال رسالة الاختبار" });
        const tenant = await storage.getTenant(tenantId);
        const text = String(req.body?.text || "").trim() ||
          `✅ رسالة اختبار من ${tenant?.businessName || "Kassenta"}\nواتساب المتجر مربوط ويعمل.\n\nTest message — the store's WhatsApp is connected.`;
        const r = await sendCapped(tenantId, to, text);
        if (!r.ok && r.queued) return res.status(202).json({ ok: false, queued: true, to, message: "تم وضع الرسالة في الانتظار وسيتم إرسالها قريباً" });
        if (!r.ok) return res.status(502).json({ error: r.error || "تعذّر الإرسال" });
        res.json({ ok: true, to });
      } catch (e) { fail(res, e); }
    },
  );

  // ── Inbox ──────────────────────────────────────────────────────────────────
  app.get("/api/whatsapp/chats", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const q = String(req.query.q || "").trim();
      const params: any[] = [storeKey(tenantId)];
      let where = "session_key = ?";
      if (q) {
        where += " AND (name LIKE ? OR phone LIKE ? OR last_message LIKE ?)";
        params.push(`%${q}%`, `%${asciiDigits(q).replace(/\D/g, "") || q}%`, `%${q}%`);
      }
      const [rows]: any = await pool.query(
        `SELECT jid, name, phone, is_group AS isGroup, last_message AS lastMessage, last_from_me AS lastFromMe,
                last_at AS lastAt, unread
           FROM wa_chats WHERE ${where} ORDER BY last_at DESC LIMIT 200`,
        params,
      );
      res.json(rows.map((r: any) => ({ ...r, isGroup: !!r.isGroup, lastFromMe: !!r.lastFromMe })));
    } catch (e: any) {
      if (/doesn't exist/i.test(String(e?.message))) return res.json([]);
      fail(res, e);
    }
  });

  app.get("/api/whatsapp/unread", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const [rows]: any = await pool.query("SELECT COALESCE(SUM(unread), 0) AS n FROM wa_chats WHERE session_key = ?", [storeKey(tenantId)]);
      res.json({ unread: Number(rows?.[0]?.n || 0) });
    } catch { res.json({ unread: 0 }); }
  });

  app.get("/api/whatsapp/chats/:jid/messages", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const jid = String(req.params.jid);
      const before = req.query.before ? new Date(String(req.query.before)) : null;
      const params: any[] = [storeKey(tenantId), jid];
      let where = "session_key = ? AND jid = ?";
      if (before && !isNaN(before.getTime())) { where += " AND ts < ?"; params.push(before); }
      const [rows]: any = await pool.query(
        `SELECT id, wa_id AS waId, from_me AS fromMe, sender, sender_name AS senderName, msg_type AS type, body, status, ts
           FROM wa_messages WHERE ${where} ORDER BY ts DESC, id DESC LIMIT 60`,
        params,
      );
      res.json(rows.reverse().map((r: any) => ({ ...r, fromMe: !!r.fromMe })));
    } catch (e: any) {
      if (/doesn't exist/i.test(String(e?.message))) return res.json([]);
      fail(res, e);
    }
  });

  const sendLimiter = rateLimit({ name: "wa-store-send", max: 60, windowMs: 60 * 1000, keyFn: (req: any) => String(req.tenantId ?? "unknown") });

  app.post("/api/whatsapp/chats/:jid/send", requireAdmin, sendLimiter, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const text = String(req.body?.text || "").trim();
      if (!text) return res.status(400).json({ error: "الرسالة فارغة" });
      const r = await sendCapped(tenantId, String(req.params.jid), text);
      if (!r.ok && !r.queued) return res.status(502).json({ error: r.error || "تعذّر الإرسال" });
      res.json(r);
    } catch (e) { fail(res, e); }
  });

  app.post("/api/whatsapp/send", requireAdmin, sendLimiter, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const phone = dialDigits(req.body?.phone);
      const text = String(req.body?.text || "").trim();
      if (phone.length < 8 || !text) return res.status(400).json({ error: "اكتب الرقم مع رمز الدولة ونص الرسالة" });
      const r = await sendCapped(tenantId, phone, text);
      if (!r.ok && !r.queued) return res.status(502).json({ error: r.error || "تعذّر الإرسال" });
      res.json(r);
    } catch (e) { fail(res, e); }
  });

  app.post("/api/whatsapp/chats/:jid/read", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      await whatsappService.storeMarkRead(tenantId, String(req.params.jid));
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ── Templates ──────────────────────────────────────────────────────────────
  app.get("/api/whatsapp/templates", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const meta = await readMeta(tenantId);
      const lang = await storeLang(tenantId, meta);
      const settings = { ...(meta.whatsappTemplates || {}), lang };
      res.json({
        lang,
        events: TEMPLATE_EVENTS.map((event) => {
          const t = resolveTemplate(settings, event, lang);
          return { event, enabled: t.enabled, text: t.text, isDefault: t.isDefault, defaultText: defaultTemplate(event, lang), variables: TEMPLATE_VARIABLES[event] };
        }),
      });
    } catch (e) { fail(res, e); }
  });

  app.put("/api/whatsapp/templates", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const meta = await readMeta(tenantId);
      const lang: TemplateLang = req.body?.lang === "en" ? "en" : req.body?.lang === "ar" ? "ar" : await storeLang(tenantId, meta);
      const overrides: Record<string, { enabled?: boolean; text?: string }> = {};
      const incoming = req.body?.events || [];
      for (const e of Array.isArray(incoming) ? incoming : []) {
        if (!TEMPLATE_EVENTS.includes(e?.event)) continue;
        const event = e.event as TemplateEvent;
        const text = typeof e.text === "string" ? e.text.slice(0, 2000) : "";
        const o: { enabled?: boolean; text?: string } = {};
        if (e.enabled === false) o.enabled = false;
        if (text.trim() && text.trim() !== defaultTemplate(event, lang).trim()) o.text = text;
        if (Object.keys(o).length) overrides[event] = o;
      }
      meta.whatsappTemplates = { lang, overrides };
      await writeMeta(tenantId, meta);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ── Offers & promotions (campaigns) ────────────────────────────────────────
  app.get("/api/whatsapp/campaigns", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      await ensureCampaignTable();
      const [all, online, wholesale] = await Promise.all([
        audienceList(tenantId, "all"), audienceList(tenantId, "online"), audienceList(tenantId, "wholesale"),
      ]);
      let optedOut = 0;
      try {
        const [o]: any = await pool.query("SELECT COUNT(*) AS n FROM wa_optouts WHERE session_key = ?", [storeKey(tenantId)]);
        optedOut = Number(o?.[0]?.n || 0);
      } catch { }
      const [campaigns]: any = await pool.query(
        "SELECT id, audience, body, promo_code AS promoCode, recipients, created_by AS createdBy, created_at AS createdAt FROM wa_campaigns WHERE tenant_id = ? ORDER BY id DESC LIMIT 30",
        [tenantId]);
      const [today]: any = await pool.query(
        "SELECT COALESCE(SUM(recipients), 0) AS n FROM wa_campaigns WHERE tenant_id = ? AND created_at >= NOW() - INTERVAL ? SECOND",
        [tenantId, await secondsSinceStoreMidnight(tenantId)]);
      const sentToday = Number(today?.[0]?.n || 0);
      res.json({
        audience: { all: all.length, online: online.length, wholesale: wholesale.length, optedOut },
        remainingToday: Math.max(0, CAMPAIGN_DAILY_CAP - sentToday),
        campaigns,
      });
    } catch (e) { fail(res, e); }
  });

  app.post(
    "/api/whatsapp/campaigns",
    requireAdmin,
    rateLimit({ name: "wa-campaign", max: 5, windowMs: 60 * 60 * 1000, keyFn: (req: any) => String(req.tenantId ?? "unknown") }),
    async (req: EmployeeRequest, res) => {
      try {
        const tenantId = tenantOf(req, res);
        if (tenantId == null) return;
        const body = String(req.body?.text || "").trim().slice(0, 3000);
        const audience: Audience = ["all", "online", "wholesale"].includes(req.body?.audience) ? req.body.audience : "all";
        const promoCode = String(req.body?.promoCode || "").trim().slice(0, 64);
        if (!body) return res.status(400).json({ error: "اكتب نص العرض" });
        const view = await whatsappService.storeSession(tenantId, true);
        if (!view.linked && view.status !== "connected") return res.status(409).json({ error: "اربط واتساب المتجر أولاً" });

        await ensureCampaignTable();
        const [today]: any = await pool.query(
          "SELECT COALESCE(SUM(recipients), 0) AS n FROM wa_campaigns WHERE tenant_id = ? AND created_at >= NOW() - INTERVAL ? SECOND",
        [tenantId, await secondsSinceStoreMidnight(tenantId)]);
        const remaining = Math.max(0, CAMPAIGN_DAILY_CAP - Number(today?.[0]?.n || 0));
        const list = (await audienceList(tenantId, audience)).slice(0, remaining);
        if (!list.length) {
          return res.status(400).json({ error: remaining ? "لا يوجد زبائن بأرقام هواتف في هذه الفئة" : "وصلت للحد اليومي لرسائل العروض، جرّب غداً" });
        }

        const tenant = await storage.getTenant(tenantId);
        const meta = (tenant?.metadata as any) || {};
        const lang = await storeLang(tenantId, meta);
        let storeLink = "";
        try {
          const [lp]: any = await pool.query("SELECT slug FROM landing_page_config WHERE tenant_id = ? LIMIT 1", [tenantId]);
          if (lp?.[0]?.slug) storeLink = `${process.env.APP_URL || "https://kassenta.com"}/order/${lp[0].slug}`;
        } catch { }
        const footer = lang === "ar" ? "\n\nلإيقاف رسائل العروض أرسل: إلغاء" : "\n\nReply STOP to stop offers";
        const fill = (name: string) =>
          body
            .replace(/\{\{\s*customerName\s*\}\}/g, name || (lang === "ar" ? "عميلنا العزيز" : "there"))
            .replace(/\{\{\s*storeName\s*\}\}/g, tenant?.businessName || "")
            .replace(/\{\{\s*storeLink\s*\}\}/g, storeLink)
            .replace(/\{\{\s*promoCode\s*\}\}/g, promoCode) + footer;

        const { bridge } = await import("./waClient");
        const r: any = await bridge("POST", "/send-batch", {
          key: storeKey(tenantId),
          items: list.map((c) => ({ to: c.phone, text: fill(c.name) })),
        }, 60000);
        const queued = Number(r?.queued || 0);
        await pool.query(
          "INSERT INTO wa_campaigns (tenant_id, audience, body, promo_code, recipients, created_by) VALUES (?, ?, ?, ?, ?, ?)",
          [tenantId, audience, body, promoCode || null, queued, (req as any).employee?.name || null]);
        // ~2 s per message on average (paced to protect the number).
        res.json({ ok: true, recipients: queued, etaMinutes: Math.ceil((queued * 2) / 60) });
      } catch (e) { fail(res, e); }
    },
  );

  // ── Groups & alerts ────────────────────────────────────────────────────────
  app.get("/api/whatsapp/groups", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const r = await whatsappService.storeGroups(tenantId, req.query.refresh === "1");
      const meta = await readMeta(tenantId);
      res.json({ ...r, alerts: meta.whatsappAlerts || {} });
    } catch (e) { fail(res, e); }
  });

  app.put("/api/whatsapp/alerts", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const b = req.body || {};
      const groupJid = typeof b.groupJid === "string" && b.groupJid.endsWith("@g.us") ? b.groupJid : "";
      const meta = await readMeta(tenantId);
      meta.whatsappAlerts = {
        groupJid,
        groupName: groupJid ? String(b.groupName || "").slice(0, 200) : "",
        groupEnabled: b.groupEnabled !== false,
        notifyOwner: b.notifyOwner !== false,
      };
      await writeMeta(tenantId, meta);
      res.json({ ok: true, alerts: meta.whatsappAlerts });
    } catch (e) { fail(res, e); }
  });
}
