/**
 * WhatsApp bridge — one long-lived process that owns every WhatsApp session:
 * the platform's own number ("platform") and one per store ("t<tenantId>").
 *
 * Why a separate process: LiteSpeed runs several copies of the web app at
 * once (and keeps old ones around after a restart). Two copies opening the
 * same WhatsApp login knock each other off in a loop, so exactly one process
 * may hold the sessions. The web app talks to it over a unix socket
 * (.whatsapp/bridge.sock) and starts it again whenever it is not answering
 * (server/waClient.ts) — there is no cron on the shared host.
 *
 * Sessions use Baileys (WhatsApp Web's WebSocket protocol, no browser), so
 * they cost almost no threads on the shared account. Each session:
 *   .whatsapp/sessions/<key>/auth/   linked-device credentials
 *   .whatsapp/sessions/<key>/queue/  outgoing messages waiting to be sent
 * Incoming and outgoing messages are stored in MySQL (wa_chats, wa_messages)
 * for the store's inbox.
 */
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pathToFileURL } from "url";
// @ts-ignore -- qrcode ships no type declarations
import QRCode from "qrcode";
import mysql from "mysql2/promise";

try { require("dotenv").config({ path: path.resolve(process.cwd(), ".env") }); } catch { }

const ROOT = path.resolve(process.cwd(), ".whatsapp");
const SESSIONS_DIR = path.join(ROOT, "sessions");
const SOCK_PATH = path.join(ROOT, "bridge.sock");
const PID_FILE = path.join(ROOT, "bridge.pid");
const BAILEYS_DIR = process.env.BAILEYS_DIR || path.resolve(process.cwd(), "wa-baileys");

// libsignal prints whole session objects on every re-key; they drown the log.
for (const level of ["log", "info", "warn", "error"] as const) {
  const orig = console[level].bind(console);
  (console as any)[level] = (...args: any[]) => {
    const first = String(args[0] ?? "");
    if (/^(Closing (open )?session|Removing old closed session|Session error|Failed to decrypt|Decrypted message with closed session|Closing stale open session)/.test(first)) return;
    orig(...args);
  };
}

const log = (key: string, msg: string) => console.log(`[wa-bridge ${new Date().toISOString()}] [${key}] ${msg}`);

// ── Single instance ─────────────────────────────────────────────────────────
function alive(pid: number) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
fs.mkdirSync(SESSIONS_DIR, { recursive: true });
/** Create the pid file exclusively; a stale one (dead pid) is replaced. */
function acquireLock(): boolean {
  for (let i = 0; i < 2; i++) {
    try {
      const fd = fs.openSync(PID_FILE, "wx");
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch {
      const other = Number((() => { try { return fs.readFileSync(PID_FILE, "utf8"); } catch { return "0"; } })());
      if (other && alive(other)) return false;
      try { fs.rmSync(PID_FILE, { force: true }); } catch { }
    }
  }
  return false;
}
if (!acquireLock()) {
  console.log("[wa-bridge] another bridge is running — exiting");
  process.exit(0);
}

// ── Database ────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  connectionLimit: 3,
  charset: "utf8mb4",
});

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS wa_chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_key VARCHAR(32) NOT NULL,
    tenant_id INT NULL,
    jid VARCHAR(128) NOT NULL,
    name VARCHAR(255) NULL,
    phone VARCHAR(32) NULL,
    is_group TINYINT(1) NOT NULL DEFAULT 0,
    last_message TEXT NULL,
    last_from_me TINYINT(1) NOT NULL DEFAULT 0,
    last_at DATETIME NULL,
    unread INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_wa_chat (session_key, jid),
    KEY idx_wa_chat_last (session_key, last_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS wa_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_key VARCHAR(32) NOT NULL,
    tenant_id INT NULL,
    jid VARCHAR(128) NOT NULL,
    wa_id VARCHAR(128) NOT NULL,
    from_me TINYINT(1) NOT NULL DEFAULT 0,
    sender VARCHAR(128) NULL,
    sender_name VARCHAR(255) NULL,
    msg_type VARCHAR(32) NOT NULL DEFAULT 'text',
    body TEXT NULL,
    status TINYINT NOT NULL DEFAULT 0,
    ts DATETIME NOT NULL,
    UNIQUE KEY uq_wa_msg (session_key, wa_id),
    KEY idx_wa_msg_chat (session_key, jid, ts)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  // Customers who replied STOP / إلغاء to an offer: never sent campaigns again.
  await pool.query(`CREATE TABLE IF NOT EXISTS wa_optouts (
    session_key VARCHAR(32) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_key, phone)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}

const OPT_OUT = /^\s*(stop|unsubscribe|إلغاء|الغاء|ألغاء|توقف|إيقاف|ايقاف|الغاء الاشتراك|إلغاء الاشتراك)\s*[.!]?\s*$/i;

const tenantOfKey = (key: string) => (key.startsWith("t") ? Number(key.slice(1)) || null : null);

// ── Baileys ─────────────────────────────────────────────────────────────────
let B: any = null;
async function baileys() {
  if (B) return B;
  const entry = path.join(BAILEYS_DIR, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
  B = fs.existsSync(entry) ? await import(pathToFileURL(entry).href) : await import("@whiskeysockets/baileys" as any);
  return B;
}
let waVersion: number[] | undefined;
let waVersionAt = 0;
async function version() {
  if (waVersion && Date.now() - waVersionAt < 6 * 3600_000) return waVersion;
  try { waVersion = (await (await baileys()).fetchLatestBaileysVersion()).version; waVersionAt = Date.now(); } catch { }
  return waVersion;
}

const quietLogger: any = {
  level: "silent",
  child() { return quietLogger; },
  trace() { }, debug() { }, info() { }, warn() { }, error() { },
  fatal() { },
};

/** Phone number → WhatsApp JID. Group / LID JIDs pass through unchanged. */
function toJid(to: string): string {
  if (to.includes("@")) return to;
  let d = to.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  // Local Swiss formats (the platform started in Switzerland)
  if (d.startsWith("410") && d.length === 12) d = "41" + d.slice(3);
  else if (d.startsWith("0") && d.length === 10 && /^07/.test(d)) d = "41" + d.slice(1);
  // Local Syrian mobile (09xx xxx xxx)
  else if (d.startsWith("09") && d.length === 10) d = "963" + d.slice(1);
  return `${d}@s.whatsapp.net`;
}

function textOf(m: any): { type: string; body: string } {
  const msg = m.message || {};
  const inner = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg;
  if (inner.conversation) return { type: "text", body: inner.conversation };
  if (inner.extendedTextMessage) return { type: "text", body: inner.extendedTextMessage.text || "" };
  if (inner.imageMessage) return { type: "image", body: inner.imageMessage.caption || "" };
  if (inner.videoMessage) return { type: "video", body: inner.videoMessage.caption || "" };
  if (inner.audioMessage) return { type: "audio", body: "" };
  if (inner.documentMessage) return { type: "document", body: inner.documentMessage.fileName || inner.documentMessage.caption || "" };
  if (inner.stickerMessage) return { type: "sticker", body: "" };
  if (inner.locationMessage) return { type: "location", body: `${inner.locationMessage.degreesLatitude},${inner.locationMessage.degreesLongitude}` };
  if (inner.contactMessage) return { type: "contact", body: inner.contactMessage.displayName || "" };
  if (inner.buttonsResponseMessage) return { type: "text", body: inner.buttonsResponseMessage.selectedDisplayText || "" };
  if (inner.listResponseMessage) return { type: "text", body: inner.listResponseMessage.title || "" };
  return { type: "", body: "" };
}

// ── Sessions ────────────────────────────────────────────────────────────────
type Status = "disconnected" | "connecting" | "qr_ready" | "connected";

interface QueuedMessage { id: string; to: string; text: string; attempts: number; nextAt: number; createdAt: number }

class Session {
  key: string;
  dir: string;
  authDir: string;
  queueDir: string;
  sock: any = null;
  status: Status = "disconnected";
  qr: string | null = null;
  phone: string | null = null;
  name: string | null = null;
  lastError: string | null = null;
  connectedAt: number | null = null;
  events: { time: string; event: string }[] = [];
  groups: { id: string; name: string; size: number }[] = [];
  groupsAt = 0;
  private reconnectTimer: any = null;
  private attempts = 0;
  private stopped = true;
  private lastSendAt = 0;
  private sending = false;

  constructor(key: string) {
    this.key = key;
    this.dir = path.join(SESSIONS_DIR, key);
    this.authDir = path.join(this.dir, "auth");
    this.queueDir = path.join(this.dir, "queue");
    fs.mkdirSync(this.queueDir, { recursive: true });
  }

  event(e: string) {
    this.events.unshift({ time: new Date().toISOString(), event: e });
    if (this.events.length > 40) this.events.length = 40;
    log(this.key, e);
  }

  hasCreds() {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(this.authDir, "creds.json"), "utf8"));
      return !!(c.registered || c.me);
    } catch { return false; }
  }

  pending() {
    try { return fs.readdirSync(this.queueDir).filter((f) => f.endsWith(".json")).length; } catch { return 0; }
  }

  view() {
    return {
      key: this.key,
      status: this.status,
      qrCode: this.qr,
      phone: this.phone,
      name: this.name,
      lastError: this.lastError,
      connectedAt: this.connectedAt ? new Date(this.connectedAt).toISOString() : null,
      linked: this.hasCreds(),
      pending: this.pending(),
      log: this.events.slice(0, 20),
    };
  }

  async start() {
    this.stopped = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const b = await baileys();
    const makeWASocket = b.default?.default || b.default || b.makeWASocket;
    const { useMultiFileAuthState, Browsers, DisconnectReason } = b;
    this.close();
    fs.mkdirSync(this.authDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    this.status = "connecting";
    this.qr = null;
    const sock = makeWASocket({
      auth: state,
      logger: quietLogger,
      version: await version(),
      browser: Browsers.ubuntu("Kassenta POS"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });
    this.sock = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u: any) => {
      if (this.sock !== sock) return;
      if (u.qr) {
        try {
          this.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 });
          this.status = "qr_ready";
          this.event("QR ready — scan it with WhatsApp");
        } catch (e: any) { this.event(`QR render failed: ${e?.message || e}`); }
      }
      if (u.connection === "open") {
        this.status = "connected";
        this.qr = null;
        this.lastError = null;
        this.attempts = 0;
        this.connectedAt = Date.now();
        this.phone = String(sock.user?.id || "").split(":")[0].split("@")[0] || null;
        this.name = sock.user?.name || sock.user?.verifiedName || null;
        this.event(`Connected as +${this.phone}`);
        this.pump();
      }
      if (u.connection === "close") {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        const reason = u.lastDisconnect?.error?.message || "closed";
        this.sock = null;
        this.status = "disconnected";
        this.qr = null;
        if (this.stopped) return;
        if (code === DisconnectReason.loggedOut) {
          this.lastError = "تم إلغاء ربط واتساب من الهاتف — اربطه من جديد";
          this.event("Logged out from the phone — credentials removed");
          this.wipeAuth();
          this.stopped = true;
          return;
        }
        if (code === DisconnectReason.restartRequired) {
          this.event("Linked — restarting the session");
          this.schedule(300);
          return;
        }
        if (code === DisconnectReason.connectionReplaced) {
          // Another client took this login (e.g. a second bridge). Back off.
          this.lastError = "الجلسة فُتحت من مكان آخر";
          this.event("Connection replaced — backing off");
          this.schedule(60_000);
          return;
        }
        if (!state.creds?.registered && (code === DisconnectReason.timedOut || /QR refs attempts ended/i.test(reason))) {
          this.lastError = "انتهت صلاحية رمز QR — اضغط ربط للحصول على رمز جديد";
          this.event("QR expired");
          this.stopped = true;
          return;
        }
        this.lastError = `${reason}${code ? ` (${code})` : ""}`;
        this.event(`Closed: ${this.lastError}`);
        this.schedule();
      }
    });

    sock.ev.on("messages.upsert", ({ messages, type }: any) => {
      if (type !== "notify" && type !== "append") return;
      for (const m of messages || []) this.store(m).catch((e) => this.event(`store failed: ${e?.message || e}`));
    });

    sock.ev.on("messages.update", (updates: any[]) => {
      for (const u of updates || []) {
        const st = u.update?.status;
        if (typeof st === "number" && u.key?.id) {
          pool.query("UPDATE wa_messages SET status = GREATEST(status, ?) WHERE session_key = ? AND wa_id = ?", [st, this.key, u.key.id]).catch(() => { });
        }
      }
    });
  }

  private schedule(delay?: number) {
    if (this.stopped || this.reconnectTimer) return;
    this.attempts++;
    const d = delay ?? Math.min(120_000, 3000 * 2 ** Math.min(this.attempts - 1, 6));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start().catch((e) => { this.event(`Reconnect failed: ${e?.message || e}`); this.schedule(); });
    }, d);
  }

  close() {
    const s = this.sock;
    this.sock = null;
    if (!s) return;
    try { s.ev.removeAllListeners(); } catch { }
    try { s.end(undefined); } catch { }
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.close();
    this.status = "disconnected";
    this.qr = null;
  }

  wipeAuth() {
    try { fs.rmSync(this.authDir, { recursive: true, force: true }); } catch { }
    this.phone = null;
    this.name = null;
  }

  async logout() {
    this.stopped = true;
    try { await this.sock?.logout(); } catch { }
    this.stop();
    this.wipeAuth();
    this.lastError = null;
    this.event("Logged out");
  }

  // ── Inbox storage ──
  async store(m: any) {
    const k = m.key || {};
    let jid: string = k.remoteJid || "";
    if (!jid || jid === "status@broadcast" || jid.endsWith("@newsletter")) return;
    // Baileys 7 may address people by LID; keep chats keyed by phone JID when known.
    if (jid.endsWith("@lid") && k.remoteJidAlt?.endsWith("@s.whatsapp.net")) jid = k.remoteJidAlt;
    if (jid.endsWith("@lid") && k.senderPn) jid = k.senderPn;
    const { type, body } = textOf(m);
    if (!type) return; // protocol / reaction / receipt messages
    const fromMe = !!k.fromMe;
    const isGroup = jid.endsWith("@g.us");
    const ts = new Date(Number(m.messageTimestamp || Date.now() / 1000) * 1000);
    const tenantId = tenantOfKey(this.key);
    const senderJid = isGroup ? (k.participantAlt || k.participant || "") : fromMe ? "" : jid;
    const pushName = fromMe ? null : m.pushName || null;
    const [res]: any = await pool.query(
      `INSERT IGNORE INTO wa_messages (session_key, tenant_id, jid, wa_id, from_me, sender, sender_name, msg_type, body, status, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [this.key, tenantId, jid, k.id, fromMe ? 1 : 0, senderJid, pushName, type, body, fromMe ? 2 : 0, ts],
    );
    if (!res?.affectedRows) return;
    const phone = jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0] : null;
    if (!fromMe && !isGroup && phone && OPT_OUT.test(body) && type === "text") {
      await pool.query("INSERT IGNORE INTO wa_optouts (session_key, phone) VALUES (?, ?)", [this.key, phone]);
      this.event(`+${phone} opted out of offers`);
      this.send(phone, "تم إيقاف رسائل العروض لهذا الرقم. ✅\nYou won't receive offers from us anymore.", false).catch(() => { });
    }
    let chatName = !isGroup && !fromMe ? pushName : null;
    if (isGroup) chatName = this.groups.find((g) => g.id === jid)?.name || null;
    const preview = body || `[${type}]`;
    await pool.query(
      `INSERT INTO wa_chats (session_key, tenant_id, jid, name, phone, is_group, last_message, last_from_me, last_at, unread)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = COALESCE(VALUES(name), name),
         phone = COALESCE(VALUES(phone), phone),
         last_message = IF(VALUES(last_at) >= COALESCE(last_at, VALUES(last_at)), VALUES(last_message), last_message),
         last_from_me = IF(VALUES(last_at) >= COALESCE(last_at, VALUES(last_at)), VALUES(last_from_me), last_from_me),
         last_at = GREATEST(COALESCE(last_at, VALUES(last_at)), VALUES(last_at)),
         unread = IF(VALUES(last_from_me) = 1, 0, unread + VALUES(unread))`,
      [this.key, tenantId, jid, chatName, phone, isGroup ? 1 : 0, preview.slice(0, 500), fromMe ? 1 : 0, ts, fromMe ? 0 : 1],
    );
  }

  // ── Sending ──
  /** Send now if connected; otherwise (or on failure) leave it queued. */
  async send(to: string, text: string, wait: boolean): Promise<{ ok: boolean; queued?: boolean; id?: string; error?: string }> {
    const item: QueuedMessage = { id: crypto.randomUUID(), to, text, attempts: 0, nextAt: 0, createdAt: Date.now() };
    if (wait && this.status === "connected" && this.sock) {
      const r = await this.deliver(item);
      if (r.ok || r.permanent) return { ok: r.ok, id: r.id, error: r.error };
    }
    fs.writeFileSync(path.join(this.queueDir, `${item.createdAt}-${item.id}.json`), JSON.stringify(item));
    this.pump();
    return { ok: false, queued: true };
  }

  private async deliver(item: QueuedMessage): Promise<{ ok: boolean; permanent?: boolean; id?: string; error?: string }> {
    const sock = this.sock;
    if (!sock) return { ok: false, error: "not connected" };
    // A little spacing between messages: bursts get numbers flagged.
    const gap = 1200 + Math.random() * 1300 - (Date.now() - this.lastSendAt);
    if (gap > 0) await new Promise((r) => setTimeout(r, gap));
    this.lastSendAt = Date.now();
    try {
      let jid = toJid(item.to);
      if (jid.endsWith("@s.whatsapp.net")) {
        const [found] = (await sock.onWhatsApp(jid)) || [];
        if (found && found.exists === false) return { ok: false, permanent: true, error: "الرقم غير مسجّل على واتساب" };
        if (found?.jid) jid = found.jid;
      }
      const sent = await sock.sendMessage(jid, { text: item.text });
      if (sent) this.store(sent).catch(() => { });
      return { ok: true, id: sent?.key?.id };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  /** Work through the on-disk queue while connected. */
  async pump() {
    if (this.sending || this.status !== "connected") return;
    this.sending = true;
    try {
      const files = fs.readdirSync(this.queueDir).filter((f) => f.endsWith(".json")).sort();
      for (const f of files) {
        if (this.status !== "connected") break;
        const p = path.join(this.queueDir, f);
        let item: QueuedMessage;
        try { item = JSON.parse(fs.readFileSync(p, "utf8")); } catch { fs.rmSync(p, { force: true }); continue; }
        if (item.nextAt > Date.now()) continue;
        if (Date.now() - item.createdAt > 24 * 3600_000) { fs.rmSync(p, { force: true }); continue; }
        const r = await this.deliver(item);
        if (r.ok || r.permanent || item.attempts >= 5) {
          if (!r.ok) this.event(`Dropped message to ${item.to}: ${r.error}`);
          fs.rmSync(p, { force: true });
        } else {
          item.attempts++;
          item.nextAt = Date.now() + Math.min(600_000, 30_000 * 2 ** (item.attempts - 1));
          fs.writeFileSync(p, JSON.stringify(item));
        }
      }
    } catch { } finally {
      this.sending = false;
    }
  }

  async fetchGroups(force = false) {
    if (!this.sock || this.status !== "connected") return this.groups;
    if (!force && Date.now() - this.groupsAt < 10 * 60_000 && this.groups.length) return this.groups;
    try {
      const all = await this.sock.groupFetchAllParticipating();
      this.groups = Object.values(all || {}).map((g: any) => ({ id: g.id, name: g.subject || g.id, size: (g.participants || []).length }))
        .sort((a, b) => a.name.localeCompare(b.name));
      this.groupsAt = Date.now();
    } catch (e: any) { this.event(`Groups fetch failed: ${e?.message || e}`); }
    return this.groups;
  }

  async markRead(jid: string) {
    await pool.query("UPDATE wa_chats SET unread = 0 WHERE session_key = ? AND jid = ?", [this.key, jid]);
    if (!this.sock || this.status !== "connected") return;
    const [rows]: any = await pool.query(
      "SELECT wa_id, sender FROM wa_messages WHERE session_key = ? AND jid = ? AND from_me = 0 AND status < 4 ORDER BY ts DESC LIMIT 20",
      [this.key, jid],
    );
    if (!rows.length) return;
    try {
      await this.sock.readMessages(rows.map((r: any) => ({ remoteJid: jid, id: r.wa_id, participant: jid.endsWith("@g.us") ? r.sender || undefined : undefined })));
      await pool.query("UPDATE wa_messages SET status = 4 WHERE session_key = ? AND jid = ? AND from_me = 0", [this.key, jid]);
    } catch { }
  }
}

const sessions = new Map<string, Session>();
const validKey = (k: unknown): k is string => typeof k === "string" && /^(platform|t\d{1,9})$/.test(k);
function session(key: string): Session {
  let s = sessions.get(key);
  if (!s) { s = new Session(key); sessions.set(key, s); }
  return s;
}

// ── Local HTTP API (unix socket) ────────────────────────────────────────────
function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const send = (code: number, body: any) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  try {
    const url = new URL(req.url || "/", "http://bridge");
    const body = req.method === "POST" ? await readBody(req) : {};
    const key = (url.searchParams.get("key") || body.key) as string;
    const route = `${req.method} ${url.pathname}`;
    if (route === "GET /health") return send(200, { ok: true, pid: process.pid, sessions: sessions.size, uptime: process.uptime() });
    if (route === "GET /sessions") return send(200, [...sessions.values()].map((s) => ({ ...s.view(), qrCode: undefined, log: undefined })));
    if (!validKey(key)) return send(400, { error: "bad session key" });
    const s = session(key);
    switch (route) {
      case "GET /status":
        return send(200, s.view());
      case "POST /connect":
        if (s.status === "disconnected") await s.start();
        for (let i = 0; i < 20 && s.status === "connecting"; i++) await new Promise((r) => setTimeout(r, 250));
        return send(200, s.view());
      case "POST /disconnect":
        s.stop();
        s.event("Stopped");
        return send(200, s.view());
      case "POST /logout":
        await s.logout();
        return send(200, s.view());
      case "POST /send": {
        const to = String(body.to || "");
        const text = String(body.text || "");
        if (!to || !text.trim()) return send(400, { error: "to and text are required" });
        if (!s.hasCreds() && s.status !== "connected") return send(409, { ok: false, error: "not linked" });
        if (s.status === "disconnected") s.start().catch(() => { });
        return send(200, await s.send(to, text, body.wait !== false));
      }
      case "POST /send-batch": {
        // Campaigns: everything goes through the paced on-disk queue.
        const items = Array.isArray(body.items) ? body.items.slice(0, 2000) : [];
        if (!s.hasCreds() && s.status !== "connected") return send(409, { ok: false, error: "not linked" });
        let n = 0;
        for (const it of items) {
          const to = String(it?.to || ""), text = String(it?.text || "");
          if (!to || !text.trim()) continue;
          const item: QueuedMessage = { id: crypto.randomUUID(), to, text, attempts: 0, nextAt: 0, createdAt: Date.now() + n };
          fs.writeFileSync(path.join(s.queueDir, `${item.createdAt}-${item.id}.json`), JSON.stringify(item));
          n++;
        }
        if (s.status === "disconnected") s.start().catch(() => { });
        else s.pump();
        return send(200, { ok: true, queued: n });
      }
      case "GET /groups":
        return send(200, { groups: await s.fetchGroups(url.searchParams.get("refresh") === "1"), refreshedAt: s.groupsAt ? new Date(s.groupsAt).toISOString() : null });
      case "POST /read":
        await s.markRead(String(body.jid || ""));
        return send(200, { ok: true });
    }
    send(404, { error: "not found" });
  } catch (e: any) {
    send(500, { error: e?.message || String(e) });
  }
});

async function main() {
  await migrate().catch((e) => console.error("[wa-bridge] migrate failed:", e?.message || e));

  // Platform session from before the bridge existed (.whatsapp/auth).
  const legacy = path.join(ROOT, "auth");
  const platformAuth = path.join(SESSIONS_DIR, "platform", "auth");
  if (fs.existsSync(path.join(legacy, "creds.json")) && !fs.existsSync(platformAuth)) {
    fs.mkdirSync(path.dirname(platformAuth), { recursive: true });
    fs.renameSync(legacy, platformAuth);
  }

  try { fs.rmSync(SOCK_PATH, { force: true }); } catch { }
  server.listen(SOCK_PATH, () => {
    try { fs.chmodSync(SOCK_PATH, 0o600); } catch { }
    console.log(`[wa-bridge] listening on ${SOCK_PATH} (pid ${process.pid})`);
  });

  // Resume every linked session, a few seconds apart.
  let delay = 500;
  for (const key of fs.readdirSync(SESSIONS_DIR)) {
    if (!validKey(key)) continue;
    const s = session(key);
    if (!s.hasCreds()) continue;
    setTimeout(() => s.start().catch((e) => s.event(`Start failed: ${e?.message || e}`)), delay);
    delay += 2500;
  }

  // Retry queued messages and nudge dead sessions back up.
  setInterval(() => {
    for (const s of sessions.values()) {
      if (s.status === "connected") s.pump();
    }
  }, 15_000);

  // Someone else took over the pid file (a second copy started): leave.
  setInterval(() => {
    try {
      if (Number(fs.readFileSync(PID_FILE, "utf8")) !== process.pid) { console.log("[wa-bridge] pid file taken over — exiting"); process.exit(0); }
    } catch { fs.writeFileSync(PID_FILE, String(process.pid)); }
  }, 30_000);
}

// Stop listening first, then give Baileys time to finish writing the
// credential files: killing it halfway through a key update leaves a login
// WhatsApp rejects (401), which would unlink the store.
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  try { server.close(); } catch { }
  for (const s of sessions.values()) s.close();
  setTimeout(() => {
    try { if (Number(fs.readFileSync(PID_FILE, "utf8")) === process.pid) fs.rmSync(PID_FILE, { force: true }); } catch { }
    try { fs.rmSync(SOCK_PATH, { force: true }); } catch { }
    process.exit(0);
  }, 3000);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (e: any) => console.error("[wa-bridge] unhandled:", e?.message || e));
process.on("uncaughtException", (e: any) => console.error("[wa-bridge] uncaught:", e?.message || e));

main();
