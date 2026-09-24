/**
 * Web-app side of the WhatsApp bridge (server/waBridge.ts): a small HTTP
 * client over the bridge's unix socket, plus a watchdog that starts the
 * bridge whenever it is not answering. Every copy of the web app runs the
 * watchdog; the bridge's own pid lock makes sure only one of them wins.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ROOT = path.resolve(process.cwd(), ".whatsapp");
const SOCK_PATH = path.join(ROOT, "bridge.sock");
const SPAWN_MARK = path.join(ROOT, "spawn.mark");
const LOG_FILE = path.join(ROOT, "bridge.log");

function bridgeScript(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "server_dist", "wa-bridge.js"),
    path.resolve(__dirname, "wa-bridge.js"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function bridgeCall<T = any>(method: "GET" | "POST", route: string, body?: any, timeoutMs = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        socketPath: SOCK_PATH,
        path: route,
        method,
        headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {},
        timeout: timeoutMs,
      },
      (res) => {
        let d = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          let j: any = {};
          try { j = d ? JSON.parse(d) : {}; } catch { j = { error: d }; }
          if ((res.statusCode || 500) >= 400 && res.statusCode !== 409) return reject(new Error(j.error || `bridge ${res.statusCode}`));
          resolve(j);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("bridge timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let healthyAt = 0;

/** Start the bridge if it isn't answering. Cheap when it is. */
export async function ensureBridge(): Promise<boolean> {
  if (process.env.WHATSAPP_DISABLED === "1") return false;
  if (Date.now() - healthyAt < 10_000) return true;
  try {
    await bridgeCall("GET", "/health", undefined, 3000);
    healthyAt = Date.now();
    return true;
  } catch { }
  const script = bridgeScript();
  if (!script) return false;
  fs.mkdirSync(ROOT, { recursive: true });
  // Several web processes notice at once — only one spawns per 20 s.
  try {
    const st = fs.statSync(SPAWN_MARK);
    if (Date.now() - st.mtimeMs < 20_000) return false;
  } catch { }
  try { fs.writeFileSync(SPAWN_MARK, String(process.pid)); } catch { }
  try {
    // Keep the log small: start fresh when it passes 2 MB.
    try { if (fs.statSync(LOG_FILE).size > 2e6) fs.renameSync(LOG_FILE, LOG_FILE + ".1"); } catch { }
    // Started through a short-lived launcher, so the bridge's parent is init,
    // not this web process: when LiteSpeed restarts or reaps the web app it
    // kills that process's children, which used to take WhatsApp down (and a
    // kill in the middle of a credential write could unlink a store).
    const child = spawn(process.execPath, ["-e", LAUNCHER, script, LOG_FILE], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env: { ...process.env, UV_THREADPOOL_SIZE: "2", NODE_OPTIONS: "--v8-pool-size=2" },
    });
    child.unref();
    console.log(`[WhatsApp] starting bridge (launcher pid ${child.pid})`);
  } catch (e: any) {
    console.error("[WhatsApp] could not start bridge:", e?.message || e);
  }
  return false;
}

/** Call the bridge, starting it (and waiting a moment) if it is down. */
export async function bridge<T = any>(method: "GET" | "POST", route: string, body?: any, timeoutMs?: number): Promise<T> {
  try {
    return await bridgeCall<T>(method, route, body, timeoutMs);
  } catch (e: any) {
    if (!/ENOENT|ECONNREFUSED|timeout/i.test(String(e?.message))) throw e;
    healthyAt = 0;
    await ensureBridge();
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try { return await bridgeCall<T>(method, route, body, timeoutMs); } catch { }
    }
    throw new Error("خدمة واتساب لا تستجيب حالياً، حاول بعد قليل");
  }
}

const LAUNCHER = [
  'const { spawn } = require("child_process");',
  'const fs = require("fs");',
  'const [script, log] = process.argv.slice(1);',
  'const out = fs.openSync(log, "a");',
  'spawn(process.execPath, [script], { cwd: process.cwd(), detached: true, stdio: ["ignore", out, out], env: process.env }).unref();',
  'process.exit(0);',
].join("\n");

let watchdog: any = null;
export function startBridgeWatchdog() {
  if (watchdog || process.env.WHATSAPP_DISABLED === "1") return;
  ensureBridge().catch(() => { });
  watchdog = setInterval(() => { ensureBridge().catch(() => { }); }, 30_000);
  watchdog.unref?.();
}
