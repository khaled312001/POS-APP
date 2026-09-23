/**
 * Store WhatsApp number, verified by code.
 *
 * A store's order notifications go to its own WhatsApp number (sent from the
 * platform's WhatsApp session). A number only takes effect once the owner has
 * proved they hold it: we send a 6-digit code to it over WhatsApp and they
 * type it back. That also proves the number actually has WhatsApp.
 */
import crypto from "crypto";
import type { Express, Response } from "express";
import { storage } from "./storage";
import { whatsappService } from "./whatsappService";
import { requireAdmin, type EmployeeRequest } from "./employeeAuth";
import { rateLimit } from "./rateLimit";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Pending {
  phone: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

// One pending code per store. In memory on purpose: a restart simply means
// asking for a new code.
const pending = new Map<number, Pending>();

const hash = (code: string) => crypto.createHash("sha256").update(code).digest("hex");
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function tenantOf(req: EmployeeRequest, res: Response): number | null {
  const tenantId = Number((req as any).tenantId ?? 0) || 0;
  if (!tenantId) {
    res.status(400).json({ error: "tenant required" });
    return null;
  }
  return tenantId;
}

async function readMeta(tenantId: number): Promise<any> {
  const tenant = await storage.getTenant(tenantId);
  return { ...((tenant?.metadata as any) || {}) };
}

/** Verified store number, or "" — the only number notifications may use. */
export function verifiedStorePhone(metadata: any): string {
  const m = metadata || {};
  return m.whatsappVerifiedAt && m.whatsappAdminPhone ? String(m.whatsappAdminPhone) : "";
}

export function registerWhatsAppVerifyRoutes(app: Express): void {
  app.get("/api/store/whatsapp", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const meta = await readMeta(tenantId);
      const p = pending.get(tenantId);
      res.json({
        phone: meta.whatsappAdminPhone || "",
        verified: !!verifiedStorePhone(meta),
        verifiedAt: meta.whatsappVerifiedAt || null,
        pendingPhone: p && p.expiresAt > Date.now() ? p.phone : null,
        platformConnected: whatsappService.getStatus().status === "connected",
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Error" });
    }
  });

  app.post(
    "/api/store/whatsapp/verify/start",
    requireAdmin,
    rateLimit({
      name: "wa-verify-start",
      max: 5,
      windowMs: 15 * 60 * 1000,
      keyFn: (req: any) => String(req.tenantId ?? "unknown"),
      message: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
    }),
    async (req: EmployeeRequest, res) => {
      try {
        const tenantId = tenantOf(req, res);
        if (tenantId == null) return;
        const phone = digits(req.body?.phone);
        if (phone.length < 8 || phone.length > 15) {
          return res.status(400).json({ error: "رقم واتساب غير صالح. اكتبه مع رمز الدولة، مثال: 963944123456" });
        }
        if (whatsappService.getStatus().status !== "connected") {
          return res.status(503).json({ error: "خدمة واتساب غير متصلة حالياً. حاول لاحقاً أو تواصل مع الدعم." });
        }
        const code = String(crypto.randomInt(100000, 1000000));
        const tenant = await storage.getTenant(tenantId);
        const sent = await whatsappService.sendText(
          phone,
          `رمز تأكيد رقم واتساب لمتجر ${tenant?.businessName || "Kassenta"}: *${code}*\n` +
            `Kassenta WhatsApp verification code: *${code}*\n` +
            `ينتهي خلال 10 دقائق. لا تشاركه مع أحد.`,
        );
        if (!sent) {
          return res.status(502).json({ error: "تعذّر إرسال الرمز. تأكد أن الرقم مسجّل على واتساب ومكتوب مع رمز الدولة." });
        }
        pending.set(tenantId, { phone, codeHash: hash(code), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
        res.json({ ok: true, phone, expiresInSeconds: CODE_TTL_MS / 1000 });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || "Error" });
      }
    },
  );

  app.post("/api/store/whatsapp/verify/confirm", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      const p = pending.get(tenantId);
      if (!p || p.expiresAt < Date.now()) {
        pending.delete(tenantId);
        return res.status(400).json({ error: "انتهت صلاحية الرمز. اطلب رمزاً جديداً." });
      }
      p.attempts += 1;
      if (p.attempts > MAX_ATTEMPTS) {
        pending.delete(tenantId);
        return res.status(429).json({ error: "محاولات خاطئة كثيرة. اطلب رمزاً جديداً." });
      }
      const code = digits(req.body?.code);
      const a = Buffer.from(hash(code));
      const b = Buffer.from(p.codeHash);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(400).json({ error: "الرمز غير صحيح." });
      }
      pending.delete(tenantId);
      const meta = await readMeta(tenantId);
      meta.whatsappAdminPhone = p.phone;
      meta.whatsappVerifiedAt = new Date().toISOString();
      await storage.updateTenant(tenantId, { metadata: meta } as any);
      res.json({ ok: true, phone: p.phone, verified: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Error" });
    }
  });

  /** Unlink: notifications stop until a number is verified again. */
  app.delete("/api/store/whatsapp", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = tenantOf(req, res);
      if (tenantId == null) return;
      pending.delete(tenantId);
      const meta = await readMeta(tenantId);
      meta.whatsappAdminPhone = "";
      meta.whatsappVerifiedAt = null;
      await storage.updateTenant(tenantId, { metadata: meta } as any);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Error" });
    }
  });
}
