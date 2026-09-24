"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/waBridge.ts
var import_http = __toESM(require("http"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var import_url = require("url");
var import_qrcode = __toESM(require("qrcode"));
var import_promise = __toESM(require("mysql2/promise"));
try {
  require("dotenv").config({ path: import_path.default.resolve(process.cwd(), ".env") });
} catch {
}
var ROOT = import_path.default.resolve(process.cwd(), ".whatsapp");
var SESSIONS_DIR = import_path.default.join(ROOT, "sessions");
var SOCK_PATH = import_path.default.join(ROOT, "bridge.sock");
var PID_FILE = import_path.default.join(ROOT, "bridge.pid");
var BAILEYS_DIR = process.env.BAILEYS_DIR || import_path.default.resolve(process.cwd(), "wa-baileys");
for (const level of ["log", "info", "warn", "error"]) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    const first = String(args[0] ?? "");
    if (/^(Closing (open )?session|Removing old closed session|Session error|Failed to decrypt|Decrypted message with closed session|Closing stale open session)/.test(first)) return;
    orig(...args);
  };
}
var log = (key, msg) => console.log(`[wa-bridge ${(/* @__PURE__ */ new Date()).toISOString()}] [${key}] ${msg}`);
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
import_fs.default.mkdirSync(SESSIONS_DIR, { recursive: true });
function acquireLock() {
  for (let i = 0; i < 2; i++) {
    try {
      const fd = import_fs.default.openSync(PID_FILE, "wx");
      import_fs.default.writeSync(fd, String(process.pid));
      import_fs.default.closeSync(fd);
      return true;
    } catch {
      const other = Number((() => {
        try {
          return import_fs.default.readFileSync(PID_FILE, "utf8");
        } catch {
          return "0";
        }
      })());
      if (other && alive(other)) return false;
      try {
        import_fs.default.rmSync(PID_FILE, { force: true });
      } catch {
      }
    }
  }
  return false;
}
if (!acquireLock()) {
  console.log("[wa-bridge] another bridge is running \u2014 exiting");
  process.exit(0);
}
var pool = import_promise.default.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  connectionLimit: 3,
  charset: "utf8mb4"
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
  await pool.query(`CREATE TABLE IF NOT EXISTS wa_optouts (
    session_key VARCHAR(32) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_key, phone)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
var OPT_OUT = /^\s*(stop|unsubscribe|إلغاء|الغاء|ألغاء|توقف|إيقاف|ايقاف|الغاء الاشتراك|إلغاء الاشتراك)\s*[.!]?\s*$/i;
var tenantOfKey = (key) => key.startsWith("t") ? Number(key.slice(1)) || null : null;
var B = null;
async function baileys() {
  if (B) return B;
  const entry = import_path.default.join(BAILEYS_DIR, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
  B = import_fs.default.existsSync(entry) ? await import((0, import_url.pathToFileURL)(entry).href) : await import("@whiskeysockets/baileys");
  return B;
}
async function atomicAuthState(folder) {
  const { initAuthCreds, BufferJSON, proto } = await baileys();
  import_fs.default.mkdirSync(folder, { recursive: true });
  const fix = (f) => f.replace(/\//g, "__").replace(/:/g, "-");
  const file = (f) => import_path.default.join(folder, fix(f));
  const write = async (data, f) => {
    const target = file(f);
    const tmp = `${target}.${process.pid}.${import_crypto.default.randomBytes(4).toString("hex")}.tmp`;
    await import_fs.default.promises.writeFile(tmp, JSON.stringify(data, BufferJSON.replacer));
    await import_fs.default.promises.rename(tmp, target);
  };
  const read = async (f) => {
    try {
      return JSON.parse(await import_fs.default.promises.readFile(file(f), "utf8"), BufferJSON.reviver);
    } catch {
      return null;
    }
  };
  const remove = async (f) => {
    try {
      await import_fs.default.promises.unlink(file(f));
    } catch {
    }
  };
  try {
    for (const f of import_fs.default.readdirSync(folder)) if (f.endsWith(".tmp")) import_fs.default.rmSync(import_path.default.join(folder, f), { force: true });
  } catch {
  }
  const creds = await read("creds.json") || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await read(`${type}-${id}.json`);
            if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const f = `${category}-${id}.json`;
              tasks.push(value ? write(value, f) : remove(f));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => write(creds, "creds.json")
  };
}
var waVersion;
var waVersionAt = 0;
async function version() {
  if (waVersion && Date.now() - waVersionAt < 6 * 36e5) return waVersion;
  try {
    waVersion = (await (await baileys()).fetchLatestBaileysVersion()).version;
    waVersionAt = Date.now();
  } catch {
  }
  return waVersion;
}
var quietLogger = {
  level: "silent",
  child() {
    return quietLogger;
  },
  trace() {
  },
  debug() {
  },
  info() {
  },
  warn() {
  },
  error() {
  },
  fatal() {
  }
};
function toJid(to) {
  if (to.includes("@")) return to;
  let d = to.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("410") && d.length === 12) d = "41" + d.slice(3);
  else if (d.startsWith("0") && d.length === 10 && /^07/.test(d)) d = "41" + d.slice(1);
  else if (d.startsWith("09") && d.length === 10) d = "963" + d.slice(1);
  else if (/^9\d{8}$/.test(d)) d = "963" + d;
  else if (/^01[0125]\d{8}$/.test(d)) d = "20" + d.slice(1);
  return `${d}@s.whatsapp.net`;
}
function textOf(m) {
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
var Session = class {
  key;
  dir;
  authDir;
  queueDir;
  sock = null;
  status = "disconnected";
  qr = null;
  phone = null;
  name = null;
  lastError = null;
  connectedAt = null;
  events = [];
  groups = [];
  groupsAt = 0;
  reconnectTimer = null;
  attempts = 0;
  loggedOutStrikes = 0;
  /** Disconnected on purpose (Disconnect / Log out): don't bring it back. */
  userStopped = false;
  stopped = true;
  lastSendAt = 0;
  sending = false;
  constructor(key) {
    this.key = key;
    this.dir = import_path.default.join(SESSIONS_DIR, key);
    this.authDir = import_path.default.join(this.dir, "auth");
    this.queueDir = import_path.default.join(this.dir, "queue");
    import_fs.default.mkdirSync(this.queueDir, { recursive: true });
  }
  event(e) {
    this.events.unshift({ time: (/* @__PURE__ */ new Date()).toISOString(), event: e });
    if (this.events.length > 40) this.events.length = 40;
    log(this.key, e);
  }
  hasCreds() {
    try {
      const c = JSON.parse(import_fs.default.readFileSync(import_path.default.join(this.authDir, "creds.json"), "utf8"));
      return !!(c.registered || c.me);
    } catch {
      return false;
    }
  }
  pending() {
    try {
      return import_fs.default.readdirSync(this.queueDir).filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
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
      log: this.events.slice(0, 20)
    };
  }
  async start() {
    this.stopped = false;
    this.userStopped = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const b = await baileys();
    const makeWASocket = b.default?.default || b.default || b.makeWASocket;
    const { Browsers, DisconnectReason } = b;
    this.close();
    import_fs.default.mkdirSync(this.authDir, { recursive: true });
    const { state, saveCreds } = await atomicAuthState(this.authDir);
    this.status = "connecting";
    this.qr = null;
    const sock = makeWASocket({
      auth: state,
      logger: quietLogger,
      version: await version(),
      browser: Browsers.ubuntu("Kassenta POS"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });
    this.sock = sock;
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async (u) => {
      if (this.sock !== sock) return;
      if (u.qr) {
        try {
          this.qr = await import_qrcode.default.toDataURL(u.qr, { margin: 1, width: 320 });
          this.status = "qr_ready";
          this.event("QR ready \u2014 scan it with WhatsApp");
        } catch (e) {
          this.event(`QR render failed: ${e?.message || e}`);
        }
      }
      if (u.connection === "open") {
        this.status = "connected";
        this.qr = null;
        this.lastError = null;
        this.attempts = 0;
        this.loggedOutStrikes = 0;
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
        if (code === DisconnectReason.loggedOut && state.creds?.registered) {
          this.loggedOutStrikes++;
          if (this.loggedOutStrikes <= 2) {
            this.lastError = "WhatsApp \u0631\u0641\u0636 \u0627\u0644\u062C\u0644\u0633\u0629 \u2014 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629\u2026";
            this.event(`Logged-out reply (${this.loggedOutStrikes}/2) \u2014 retrying the same login`);
            this.schedule(this.loggedOutStrikes === 1 ? 2e4 : 12e4);
            return;
          }
          this.lastError = "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0645\u0646 \u0627\u0644\u0647\u0627\u062A\u0641 \u2014 \u0627\u0631\u0628\u0637\u0647 \u0645\u0646 \u062C\u062F\u064A\u062F";
          this.event("Logged out from the phone \u2014 relink needed");
          this.archiveAuth();
          this.stopped = true;
          notifyRelink(this).catch(() => {
          });
          return;
        }
        if (code === DisconnectReason.restartRequired) {
          this.event("Linked \u2014 restarting the session");
          this.schedule(300);
          return;
        }
        if (code === DisconnectReason.connectionReplaced) {
          this.lastError = "\u0627\u0644\u062C\u0644\u0633\u0629 \u0641\u064F\u062A\u062D\u062A \u0645\u0646 \u0645\u0643\u0627\u0646 \u0622\u062E\u0631";
          this.event("Connection replaced \u2014 backing off");
          this.schedule(6e4);
          return;
        }
        if (!state.creds?.registered && (code === DisconnectReason.timedOut || /QR refs attempts ended/i.test(reason))) {
          this.lastError = "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0631\u0645\u0632 QR \u2014 \u0627\u0636\u063A\u0637 \u0631\u0628\u0637 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F";
          this.event("QR expired");
          this.stopped = true;
          return;
        }
        this.lastError = `${reason}${code ? ` (${code})` : ""}`;
        this.event(`Closed: ${this.lastError}`);
        this.schedule();
      }
    });
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;
      for (const m of messages || []) this.store(m).catch((e) => this.event(`store failed: ${e?.message || e}`));
    });
    sock.ev.on("messages.update", (updates) => {
      for (const u of updates || []) {
        const st = u.update?.status;
        if (typeof st === "number" && u.key?.id) {
          pool.query("UPDATE wa_messages SET status = GREATEST(status, ?) WHERE session_key = ? AND wa_id = ?", [st, this.key, u.key.id]).catch(() => {
          });
        }
      }
    });
  }
  /** Linked, meant to be on, but not connected and nothing scheduled. */
  needsRevive() {
    return !this.userStopped && !this.reconnectTimer && !this.sock && this.status === "disconnected" && this.hasCreds();
  }
  revive() {
    this.stopped = false;
    this.start().catch((e) => {
      this.event(`Start failed: ${e?.message || e}`);
      this.schedule();
    });
  }
  schedule(delay) {
    if (this.stopped || this.reconnectTimer) return;
    this.attempts++;
    const d = delay ?? Math.min(12e4, 3e3 * 2 ** Math.min(this.attempts - 1, 6));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start().catch((e) => {
        this.event(`Reconnect failed: ${e?.message || e}`);
        this.schedule();
      });
    }, d);
  }
  close() {
    const s = this.sock;
    this.sock = null;
    if (!s) return;
    try {
      s.ev.removeAllListeners();
    } catch {
    }
    try {
      s.end(void 0);
    } catch {
    }
  }
  stop() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.close();
    this.status = "disconnected";
    this.qr = null;
  }
  /** Keep the last login's files instead of deleting them. */
  archiveAuth() {
    try {
      for (const f of import_fs.default.readdirSync(this.dir)) if (f.startsWith("auth.old-")) import_fs.default.rmSync(import_path.default.join(this.dir, f), { recursive: true, force: true });
      if (import_fs.default.existsSync(this.authDir)) import_fs.default.renameSync(this.authDir, import_path.default.join(this.dir, `auth.old-${Date.now()}`));
    } catch {
      this.wipeAuth();
    }
  }
  wipeAuth() {
    try {
      import_fs.default.rmSync(this.authDir, { recursive: true, force: true });
    } catch {
    }
    this.phone = null;
    this.name = null;
  }
  async logout() {
    this.stopped = true;
    this.userStopped = true;
    try {
      await this.sock?.logout();
    } catch {
    }
    this.stop();
    this.wipeAuth();
    this.lastError = null;
    this.event("Logged out");
  }
  // ── Inbox storage ──
  async store(m) {
    const k = m.key || {};
    let jid = k.remoteJid || "";
    if (!jid || jid === "status@broadcast" || jid.endsWith("@newsletter")) return;
    if (jid.endsWith("@lid") && k.remoteJidAlt?.endsWith("@s.whatsapp.net")) jid = k.remoteJidAlt;
    if (jid.endsWith("@lid") && k.senderPn) jid = k.senderPn;
    const { type, body } = textOf(m);
    if (!type) return;
    const fromMe = !!k.fromMe;
    const isGroup = jid.endsWith("@g.us");
    const ts = new Date(Number(m.messageTimestamp || Date.now() / 1e3) * 1e3);
    const tenantId = tenantOfKey(this.key);
    const senderJid = isGroup ? k.participantAlt || k.participant || "" : fromMe ? "" : jid;
    const pushName = fromMe ? null : m.pushName || null;
    const [res] = await pool.query(
      `INSERT IGNORE INTO wa_messages (session_key, tenant_id, jid, wa_id, from_me, sender, sender_name, msg_type, body, status, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [this.key, tenantId, jid, k.id, fromMe ? 1 : 0, senderJid, pushName, type, body, fromMe ? 2 : 0, ts]
    );
    if (!res?.affectedRows) return;
    const phone = jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0] : null;
    if (!fromMe && !isGroup && phone && OPT_OUT.test(body) && type === "text") {
      await pool.query("INSERT IGNORE INTO wa_optouts (session_key, phone) VALUES (?, ?)", [this.key, phone]);
      this.event(`+${phone} opted out of offers`);
      this.send(phone, "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0639\u0631\u0648\u0636 \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645. \u2705\nYou won't receive offers from us anymore.", false).catch(() => {
      });
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
      [this.key, tenantId, jid, chatName, phone, isGroup ? 1 : 0, preview.slice(0, 500), fromMe ? 1 : 0, ts, fromMe ? 0 : 1]
    );
  }
  // ── Sending ──
  /** Send now if connected; otherwise (or on failure) leave it queued. */
  async send(to, text, wait) {
    const item = { id: import_crypto.default.randomUUID(), to, text, attempts: 0, nextAt: 0, createdAt: Date.now() };
    if (wait && this.status === "connected" && this.sock) {
      const r = await this.deliver(item);
      if (r.ok || r.permanent) return { ok: r.ok, id: r.id, error: r.error };
    }
    import_fs.default.writeFileSync(import_path.default.join(this.queueDir, `${item.createdAt}-${item.id}.json`), JSON.stringify(item));
    this.pump();
    return { ok: false, queued: true };
  }
  async deliver(item) {
    const sock = this.sock;
    if (!sock) return { ok: false, error: "not connected" };
    const gap = 1200 + Math.random() * 1300 - (Date.now() - this.lastSendAt);
    if (gap > 0) await new Promise((r) => setTimeout(r, gap));
    this.lastSendAt = Date.now();
    try {
      let jid = toJid(item.to);
      if (jid.endsWith("@s.whatsapp.net")) {
        const [found] = await sock.onWhatsApp(jid) || [];
        if (found && found.exists === false) return { ok: false, permanent: true, error: "\u0627\u0644\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0633\u062C\u0651\u0644 \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628" };
        if (found?.jid) jid = found.jid;
      }
      const sent = await sock.sendMessage(jid, { text: item.text });
      if (sent) this.store(sent).catch(() => {
      });
      return { ok: true, id: sent?.key?.id };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }
  /** Work through the on-disk queue while connected. */
  async pump() {
    if (this.sending || this.status !== "connected") return;
    this.sending = true;
    try {
      const files = import_fs.default.readdirSync(this.queueDir).filter((f) => f.endsWith(".json")).sort();
      for (const f of files) {
        if (this.status !== "connected") break;
        const p = import_path.default.join(this.queueDir, f);
        let item;
        try {
          item = JSON.parse(import_fs.default.readFileSync(p, "utf8"));
        } catch {
          import_fs.default.rmSync(p, { force: true });
          continue;
        }
        if (item.nextAt > Date.now()) continue;
        if (Date.now() - item.createdAt > 24 * 36e5) {
          import_fs.default.rmSync(p, { force: true });
          continue;
        }
        const r = await this.deliver(item);
        if (r.ok || r.permanent || item.attempts >= 5) {
          if (!r.ok) this.event(`Dropped message to ${item.to}: ${r.error}`);
          import_fs.default.rmSync(p, { force: true });
        } else {
          item.attempts++;
          item.nextAt = Date.now() + Math.min(6e5, 3e4 * 2 ** (item.attempts - 1));
          import_fs.default.writeFileSync(p, JSON.stringify(item));
        }
      }
    } catch {
    } finally {
      this.sending = false;
    }
  }
  async fetchGroups(force = false) {
    if (!this.sock || this.status !== "connected") return this.groups;
    if (!force && Date.now() - this.groupsAt < 10 * 6e4 && this.groups.length) return this.groups;
    try {
      const all = await this.sock.groupFetchAllParticipating();
      this.groups = Object.values(all || {}).map((g) => ({ id: g.id, name: g.subject || g.id, size: (g.participants || []).length })).sort((a, b) => a.name.localeCompare(b.name));
      this.groupsAt = Date.now();
    } catch (e) {
      this.event(`Groups fetch failed: ${e?.message || e}`);
    }
    return this.groups;
  }
  async markRead(jid) {
    await pool.query("UPDATE wa_chats SET unread = 0 WHERE session_key = ? AND jid = ?", [this.key, jid]);
    if (!this.sock || this.status !== "connected") return;
    const [rows] = await pool.query(
      "SELECT wa_id, sender FROM wa_messages WHERE session_key = ? AND jid = ? AND from_me = 0 AND status < 4 ORDER BY ts DESC LIMIT 20",
      [this.key, jid]
    );
    if (!rows.length) return;
    try {
      await this.sock.readMessages(rows.map((r) => ({ remoteJid: jid, id: r.wa_id, participant: jid.endsWith("@g.us") ? r.sender || void 0 : void 0 })));
      await pool.query("UPDATE wa_messages SET status = 4 WHERE session_key = ? AND jid = ? AND from_me = 0", [this.key, jid]);
    } catch {
    }
  }
};
var sessions = /* @__PURE__ */ new Map();
async function notifyRelink(s) {
  const tenantId = tenantOfKey(s.key);
  if (!tenantId) return;
  const platform = sessions.get("platform");
  if (!platform || !platform.hasCreds()) return;
  const [rows] = await pool.query("SELECT business_name, owner_phone, metadata FROM tenants WHERE id = ?", [tenantId]);
  const t = rows?.[0];
  if (!t) return;
  let meta = {};
  try {
    meta = typeof t.metadata === "string" ? JSON.parse(t.metadata) : t.metadata || {};
  } catch {
  }
  const targets = /* @__PURE__ */ new Set();
  for (const v of [s.phone, meta.whatsappLinkedPhone, meta.whatsappAdminPhone, t.owner_phone]) {
    const d = String(v || "").replace(/\D/g, "");
    if (d.length >= 8) targets.add(d);
  }
  const base = (process.env.APP_URL || "https://kassenta.com").replace(/\/$/, "");
  const text = `\u26A0\uFE0F \u0648\u0627\u062A\u0633\u0627\u0628 \u0645\u062A\u062C\u0631 ${t.business_name} \u0644\u0645 \u064A\u0639\u062F \u0645\u0631\u0628\u0648\u0637\u0627\u064B \u0628\u0640 Kassenta.
\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u062A\u0648\u0642\u0641\u0629 \u062D\u062A\u0649 \u062A\u0639\u064A\u062F \u0627\u0644\u0631\u0628\u0637: \u0627\u0641\u062A\u062D ${base}/app/whatsapp \u062B\u0645 \u0627\u0645\u0633\u062D \u0631\u0645\u0632 QR \u0645\u0646 \u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u062A\u062C\u0631.

The WhatsApp of ${t.business_name} is no longer linked to Kassenta. Order messages are paused until you relink it at ${base}/app/whatsapp.`;
  for (const to of targets) await platform.send(to, text, false).catch(() => {
  });
}
var validKey = (k) => typeof k === "string" && /^(platform|t\d{1,9})$/.test(k);
function session(key) {
  let s = sessions.get(key);
  if (!s) {
    s = new Session(key);
    sessions.set(key, s);
  }
  return s;
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => {
      d += c;
      if (d.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch {
        resolve({});
      }
    });
  });
}
var server = import_http.default.createServer(async (req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  try {
    const url = new URL(req.url || "/", "http://bridge");
    const body = req.method === "POST" ? await readBody(req) : {};
    const key = url.searchParams.get("key") || body.key;
    const route = `${req.method} ${url.pathname}`;
    if (route === "GET /health") return send(200, { ok: true, pid: process.pid, sessions: sessions.size, uptime: process.uptime() });
    if (route === "GET /sessions") return send(200, [...sessions.values()].map((s2) => ({ ...s2.view(), qrCode: void 0, log: void 0 })));
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
        s.userStopped = true;
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
        if (s.status === "disconnected") s.start().catch(() => {
        });
        return send(200, await s.send(to, text, body.wait !== false));
      }
      case "POST /send-batch": {
        const items = Array.isArray(body.items) ? body.items.slice(0, 2e3) : [];
        if (!s.hasCreds() && s.status !== "connected") return send(409, { ok: false, error: "not linked" });
        let n = 0;
        for (const it of items) {
          const to = String(it?.to || ""), text = String(it?.text || "");
          if (!to || !text.trim()) continue;
          const item = { id: import_crypto.default.randomUUID(), to, text, attempts: 0, nextAt: 0, createdAt: Date.now() + n };
          import_fs.default.writeFileSync(import_path.default.join(s.queueDir, `${item.createdAt}-${item.id}.json`), JSON.stringify(item));
          n++;
        }
        if (s.status === "disconnected") s.start().catch(() => {
        });
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
  } catch (e) {
    send(500, { error: e?.message || String(e) });
  }
});
async function main() {
  await migrate().catch((e) => console.error("[wa-bridge] migrate failed:", e?.message || e));
  const legacy = import_path.default.join(ROOT, "auth");
  const platformAuth = import_path.default.join(SESSIONS_DIR, "platform", "auth");
  if (import_fs.default.existsSync(import_path.default.join(legacy, "creds.json")) && !import_fs.default.existsSync(platformAuth)) {
    import_fs.default.mkdirSync(import_path.default.dirname(platformAuth), { recursive: true });
    import_fs.default.renameSync(legacy, platformAuth);
  }
  try {
    import_fs.default.rmSync(SOCK_PATH, { force: true });
  } catch {
  }
  server.listen(SOCK_PATH, () => {
    try {
      import_fs.default.chmodSync(SOCK_PATH, 384);
    } catch {
    }
    console.log(`[wa-bridge] listening on ${SOCK_PATH} (pid ${process.pid})`);
  });
  let delay = 500;
  for (const key of import_fs.default.readdirSync(SESSIONS_DIR)) {
    if (!validKey(key)) continue;
    const s = session(key);
    if (!s.hasCreds()) continue;
    setTimeout(() => s.revive(), delay);
    delay += 2500;
  }
  setInterval(() => {
    for (const s of sessions.values()) {
      if (s.status === "connected") s.pump();
      else if (s.needsRevive()) {
        s.event("Reviving dropped session");
        s.revive();
      }
    }
  }, 15e3);
  setInterval(() => {
    try {
      if (Number(import_fs.default.readFileSync(PID_FILE, "utf8")) !== process.pid) {
        console.log("[wa-bridge] pid file taken over \u2014 exiting");
        process.exit(0);
      }
    } catch {
      import_fs.default.writeFileSync(PID_FILE, String(process.pid));
    }
  }, 3e4);
}
var stopping = false;
var shutdown = () => {
  if (stopping) return;
  stopping = true;
  try {
    server.close();
  } catch {
  }
  for (const s of sessions.values()) s.close();
  setTimeout(() => {
    try {
      if (Number(import_fs.default.readFileSync(PID_FILE, "utf8")) === process.pid) import_fs.default.rmSync(PID_FILE, { force: true });
    } catch {
    }
    try {
      import_fs.default.rmSync(SOCK_PATH, { force: true });
    } catch {
    }
    process.exit(0);
  }, 3e3);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (e) => console.error("[wa-bridge] unhandled:", e?.message || e));
process.on("uncaughtException", (e) => console.error("[wa-bridge] uncaught:", e?.message || e));
main();
