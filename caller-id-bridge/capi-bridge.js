/**
 * FRITZ!Card USB v2.1 — CAPI 2.0 Bridge for POS
 *
 * Listens for incoming ISDN calls via capi2032.dll (AVM FRITZ!Card driver).
 * When a call arrives, sends the caller ID to the remote POS server
 * which then shows a popup in the browser with customer info.
 *
 * Requirements:
 *   - Windows 10/11 with AVM FRITZ!Card USB v2.1 drivers installed
 *   - capi2032.dll in C:\Windows\System32\
 *   - Node.js >= 16
 *   - npm install (installs koffi, axios)
 *
 * Usage:
 *   node capi-bridge.js
 */

"use strict";

const path = require("path");
const fs = require("fs");
const axios = require("axios");

// ─── Pre-flight: locate capi2032.dll ─────────────────────────────────────────
const CAPI_DLL_SEARCH = [
  // Standard CAPI DLL locations
  "C:\\Windows\\System32\\capi2032.dll",
  "C:\\Windows\\SysWOW64\\capi2032.dll",
  "C:\\Program Files\\AVM\\FRITZ!Card USB\\capi2032.dll",
  "C:\\Program Files (x86)\\AVM\\FRITZ!Card USB\\capi2032.dll",
  "C:\\Program Files\\AVM\\capi2032.dll",
  "C:\\Program Files (x86)\\AVM\\capi2032.dll",
  "C:\\AVM\\capi2032.dll",
  // AVM newer packages — DLL renamed to avmc2032.dll
  "C:\\Windows\\System32\\avmc2032.dll",
  "C:\\Windows\\SysWOW64\\avmc2032.dll",
  "C:\\Program Files\\AVM\\avmc2032.dll",
  "C:\\Program Files (x86)\\AVM\\avmc2032.dll",
  "C:\\AVM\\avmc2032.dll",
];
let CAPI_DLL = CAPI_DLL_SEARCH.find(p => fs.existsSync(p));
if (!CAPI_DLL) {
  console.error("=================================================");
  console.error("  [ERROR] capi2032.dll NOT FOUND");
  console.error("=================================================");
  console.error("");
  console.error("  Searched in:");
  CAPI_DLL_SEARCH.forEach(p => console.error("    " + p));
  console.error("");
  console.error("  Your FRITZ!Card shows in Device Manager but is");
  console.error("  using a generic Microsoft driver (from 2005).");
  console.error("  The AVM CAPI software layer is NOT installed.");
  console.error("");
  console.error("  FIX:");
  console.error("   1. Download full AVM driver:");
  console.error("      https://avm.de/service/download/");
  console.error("      Search: FRITZ!Card USB v2.1");
  console.error("   2. Run installer as Administrator");
  console.error("   3. Reboot, then start bridge again");
  console.error("");
  console.error("  See install-drivers.md for details.");
  console.error("=================================================");
  process.exit(1);
}
console.log(`[Bridge] Found capi2032.dll at: ${CAPI_DLL}`);

// ─── Config ──────────────────────────────────────────────────────────────────
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("[Bridge] config.json not found.");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const {
  serverUrl,
  tenantId,
  secret,
  pollingIntervalMs = 100,
  capiController = 1,
} = config;

// ─── CAPI 2.0 Message Codes ───────────────────────────────────────────────────
const CMD_LISTEN_REQ        = 0x05;
const CMD_LISTEN_CONF       = 0x05;
const CMD_CONNECT_IND       = 0x02;
const CMD_CONNECT_RESP      = 0x02;
const CMD_DISCONNECT_IND    = 0x04;
const CMD_DISCONNECT_RESP   = 0x04;
const SUB_REQ               = 0x80;
const SUB_CONF              = 0x81;
const SUB_IND               = 0x82;
const SUB_RESP              = 0x83;

// ─── Load koffi and CAPI DLL ─────────────────────────────────────────────────
let koffi = null;
let capi = null;
let appId = 0;
let isRunning = false;

// ReadProcessMemory is used to dereference the CAPI message pointer returned by
// CAPI_GET_MESSAGE. AVM's capi2032.dll writes an 8-byte pointer (to its internal
// message buffer) into the caller's buffer rather than returning an opaque handle
// that koffi can decode directly. We therefore read the message bytes via RPM.
let hProc = null;
let ReadProcessMemory = null;

function loadCAPI() {
  try {
    koffi = require("koffi");

    // Load capi2032.dll — use full path so it works from any location
    const lib  = koffi.load(CAPI_DLL);
    const lib2 = koffi.load(CAPI_DLL); // second handle for GET_MESSAGE (different sig)

    const CAPI_REGISTER_OUT    = lib.func("uint32 CAPI_REGISTER(uint32, uint32, uint32, uint32, uint32 *out)");
    const CAPI_RELEASE         = lib.func("uint32 CAPI_RELEASE(uint32)");
    const CAPI_PUT_MESSAGE     = lib.func("uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)");
    // GET_MESSAGE: DLL writes 8-byte pointer into caller's buffer (not pointer-to-pointer)
    const CAPI_GET_MESSAGE_BUF = lib2.func("uint32 CAPI_GET_MESSAGE(uint32, uint8 *)");
    // Probe variant (void **out) used only to discover AppID via 0x1104 return code
    const CAPI_GET_MESSAGE_PRB = lib.func("uint32 CAPI_GET_MESSAGE(uint32, void **out)");
    const CAPI_GET_MANUFACTURER = lib.func("uint32 CAPI_GET_MANUFACTURER(uint8 *out)");

    // kernel32: ReadProcessMemory to dereference the 8-byte CAPI message pointer
    const kernel32 = koffi.load("kernel32.dll");
    const GetCurrentProcess = kernel32.func("void *GetCurrentProcess()");
    ReadProcessMemory = kernel32.func("bool ReadProcessMemory(void *, uintptr, uint8 *, uint32, uint32 *out)");
    hProc = GetCurrentProcess();

    capi = { CAPI_RELEASE, CAPI_PUT_MESSAGE, CAPI_GET_MESSAGE_BUF, CAPI_GET_MESSAGE_PRB, CAPI_GET_MANUFACTURER };

    // Register with CAPI
    const idOut = [0];
    const ret = CAPI_REGISTER_OUT(4096, 2, 7, 2048, idOut);
    if (ret !== 0) {
      console.error(`[Bridge] CAPI_REGISTER failed: 0x${ret.toString(16)}`);
      if (ret === 0x1001) console.error("[Bridge] → FRITZ!Card not connected or drivers not installed");
      if (ret === 0x1002) console.error("[Bridge] → FRITZ!Card already in use by another application");
      return false;
    }

    appId = idOut[0];

    // AVM Vista-era capi2032.dll never writes AppID to the out-pointer.
    // Discover the real AppID: GET_MESSAGE returns 0x1104 (queue empty) for valid handles.
    if (appId === 0) {
      console.log("[Bridge] AppID=0 — probing GET_MESSAGE for actual AppID...");
      let found = false;
      for (let id = 1; id <= 16; id++) {
        const p = [null];
        const gr = capi.CAPI_GET_MESSAGE_PRB(id, p);
        if (gr === 0x1104) {
          appId = id;
          console.log(`[Bridge] AppID discovered: ${appId}`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.error("[Bridge] Could not discover AppID — CAPI stack not responding");
        return false;
      }
    }

    console.log(`[Bridge] CAPI registered. AppID = ${appId}`);

    try {
      const mfgBuf = Buffer.alloc(64).fill(0);
      capi.CAPI_GET_MANUFACTURER(mfgBuf);
      const mfg = mfgBuf.toString("ascii").replace(/\0/g, "").trim();
      if (mfg) console.log(`[Bridge] Manufacturer: ${mfg}`);
    } catch (_) {}

    return true;
  } catch (e) {
    if (e.message && (e.message.includes("Cannot find") || e.code === "MODULE_NOT_FOUND")) {
      console.error("[Bridge] koffi not installed. Run: npm install");
    } else if (
      e.message && (
        e.message.includes("capi2032") ||
        e.message.includes("The specified module could not be found") ||
        e.message.includes("Failed to load shared library")
      )
    ) {
      console.error("[Bridge] capi2032.dll not found in C:\\Windows\\System32\\");
      console.error("[Bridge] → Install the full AVM FRITZ!Card USB v2.1 driver package.");
    } else {
      console.error("[Bridge] Failed to load CAPI:", e.message);
    }
    return false;
  }
}

// ─── CAPI Message Builders ────────────────────────────────────────────────────
let msgCounter = 1;

/**
 * LISTEN_REQ — Subscribe to incoming calls on a CAPI controller
 * Format: Length(2) AppID(2) Cmd(1)=0x05 Sub(1)=0x80 MsgNum(2)
 *         Controller(4) InfoMask(4) CIPMask(4) CIPMask2(4)
 *         CallingPartyNumber(struct) CallingPartySubaddress(struct)
 */
function buildListenReq(controller) {
  const buf = Buffer.alloc(32);
  let o = 0;
  buf.writeUInt16LE(32, o);          o += 2;  // Total length
  buf.writeUInt16LE(appId, o);       o += 2;  // AppID
  buf.writeUInt8(CMD_LISTEN_REQ, o); o += 1;  // Command: LISTEN
  buf.writeUInt8(SUB_REQ, o);        o += 1;  // Subcommand: REQ (0x80)
  buf.writeUInt16LE(msgCounter++, o); o += 2; // Message Number
  buf.writeUInt32LE(controller, o);  o += 4;  // Controller
  buf.writeUInt32LE(0x0000FFFF, o);  o += 4;  // InfoMask: all
  buf.writeUInt32LE(0x1FFF03FF, o);  o += 4;  // CIPMask: all call types
  buf.writeUInt32LE(0x00000000, o);  o += 4;  // CIPMask2
  buf.writeUInt8(0, o);              o += 1;  // CallingPartyNumber: empty
  buf.writeUInt8(0, o);              o += 1;  // CallingPartySubaddress: empty
  return buf;
}

/**
 * CONNECT_RESP — Reject the call (we don't answer, just sniff CallerID)
 * Reject = 0x0001: Ignore (don't answer)
 */
function buildConnectResp(plci, reject) {
  const buf = Buffer.alloc(20);
  let o = 0;
  buf.writeUInt16LE(20, o);           o += 2;
  buf.writeUInt16LE(appId, o);        o += 2;
  buf.writeUInt8(CMD_CONNECT_RESP, o); o += 1;
  buf.writeUInt8(SUB_RESP, o);        o += 1;  // 0x83
  buf.writeUInt16LE(msgCounter++, o); o += 2;
  buf.writeUInt32LE(plci, o);         o += 4;  // PLCI from CONNECT_IND
  buf.writeUInt16LE(reject, o);       o += 2;  // 0x0001 = reject/ignore
  buf.writeUInt8(0, o);               o += 1;  // Bprotocol struct: empty
  buf.writeUInt8(0, o);               o += 1;
  buf.writeUInt8(0, o);               o += 1;
  buf.writeUInt8(0, o);
  return buf;
}

/**
 * DISCONNECT_RESP
 */
function buildDisconnectResp(ncci) {
  const buf = Buffer.alloc(12);
  let o = 0;
  buf.writeUInt16LE(12, o);              o += 2;
  buf.writeUInt16LE(appId, o);           o += 2;
  buf.writeUInt8(CMD_DISCONNECT_RESP, o); o += 1;
  buf.writeUInt8(SUB_RESP, o);           o += 1;
  buf.writeUInt16LE(msgCounter++, o);    o += 2;
  buf.writeUInt32LE(ncci, o);
  return buf;
}

// ─── CONNECT_IND Parser ───────────────────────────────────────────────────────
/**
 * Extract CallerID from CONNECT_IND message.
 *
 * CONNECT_IND layout:
 *   [0..1]  Length
 *   [2..3]  AppID
 *   [4]     Command (0x02)
 *   [5]     SubCmd  (0x82)
 *   [6..7]  MsgNumber
 *   [8..11]  PLCI
 *   [12..13] CIPValue (WORD = 2 bytes)
 *   [14]     CalledPartyNumber struct  → [len][data...]
 *   [14+1+calledLen] CallingPartyNumber struct → [len][type][presentation][digits...]
 */
function extractCallerID(msg) {
  try {
    if (msg.length < 20) return null;
    let o = 14;  // CIPValue is WORD (2 bytes) → CalledPartyNumber starts at offset 14

    // Skip CalledPartyNumber struct
    const calledLen = msg.readUInt8(o);
    o += 1 + calledLen;
    if (o >= msg.length) return null;

    // CallingPartyNumber struct
    const callingLen = msg.readUInt8(o);
    o += 1;
    if (callingLen < 2) return null; // Must have at least type byte + 1 digit

    // First byte: type/numbering plan — skip it
    // Remaining bytes: digit characters
    const digits = msg.slice(o + 1, o + callingLen).toString("ascii").replace(/[^0-9+]/g, "");
    return digits || null;
  } catch (_) {
    return null;
  }
}

function parseMsgHeader(buf) {
  if (buf.length < 8) return null; // CAPI header is 8 bytes minimum
  return {
    length:  buf.readUInt16LE(0),
    appId:   buf.readUInt16LE(2),
    cmd:     buf.readUInt8(4),
    sub:     buf.readUInt8(5),
    msgNum:  buf.readUInt16LE(6),
    id:      buf.readUInt32LE(8),  // PLCI or NCCI
  };
}

// ─── Notify POS Server ────────────────────────────────────────────────────────
let slotCounter = 0;

async function notifyServer(phoneNumber) {
  slotCounter = (slotCounter % 4) + 1;
  try {
    const res = await axios.post(
      `${serverUrl}/api/caller-id/incoming`,
      { phoneNumber, tenantId, slot: slotCounter },
      {
        headers: { "Content-Type": "application/json", "x-bridge-secret": secret },
        timeout: 5000,
      }
    );
    if (res.data?.success) {
      console.log(`[Bridge] ✓ Notified server — phone: ${phoneNumber} slot: ${slotCounter}`);
    }
  } catch (e) {
    if (e.response?.status === 401) {
      console.error("[Bridge] ✗ Unauthorized — check 'secret' in config.json matches server CALLER_ID_BRIDGE_SECRET");
    } else {
      console.error(`[Bridge] ✗ Server notification failed: ${e.message}`);
    }
  }
}

// ─── Process Incoming CAPI Message ───────────────────────────────────────────
function processMessage(msgBuf) {
  const hdr = parseMsgHeader(msgBuf);
  if (!hdr) return;

  // CONNECT_IND (cmd=0x02, sub=0x82) — Incoming call
  if (hdr.cmd === CMD_CONNECT_IND && hdr.sub === SUB_IND) {
    const phone = extractCallerID(msgBuf) || "anonymous";
    console.log(`[Bridge] ← Incoming call: ${phone} (PLCI=0x${hdr.id.toString(16)})`);

    // Reject the call immediately so it keeps ringing on the phone
    const resp = buildConnectResp(hdr.id, 0x0001);
    capi.CAPI_PUT_MESSAGE(appId, resp);

    // Notify POS server (async, don't block message loop)
    notifyServer(phone);

  // LISTEN_CONF (cmd=0x05, sub=0x81)
  } else if (hdr.cmd === CMD_LISTEN_CONF && hdr.sub === SUB_CONF) {
    // LISTEN_CONF: header(8) + Controller(4) + Info(2) → Info at offset 12
    const info = msgBuf.length >= 14 ? msgBuf.readUInt16LE(12) : -1;
    if (info === 0) {
      console.log("[Bridge] ✓ Listening for incoming calls...");
    } else {
      console.error(`[Bridge] LISTEN_CONF error: 0x${info.toString(16)}`);
    }

  // DISCONNECT_IND (cmd=0x04, sub=0x82)
  } else if (hdr.cmd === CMD_DISCONNECT_IND && hdr.sub === SUB_IND) {
    const resp = buildDisconnectResp(hdr.id);
    capi.CAPI_PUT_MESSAGE(appId, resp);
  }
}

// ─── Message Loop ─────────────────────────────────────────────────────────────
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function messageLoop() {
  console.log("[Bridge] Message loop started.");

  // ptrHolder: 8-byte buffer that receives the CAPI message pointer from GET_MESSAGE.
  // AVM's capi2032.dll writes the pointer as raw bytes (not via koffi's out-param mechanism),
  // so we pass a plain buffer and use ReadProcessMemory to dereference it.
  const ptrHolder = Buffer.alloc(8, 0);
  const msgBuf    = Buffer.alloc(512, 0);
  const nReadOut  = [0];

  while (isRunning) {
    try {
      ptrHolder.fill(0);
      const ret = capi.CAPI_GET_MESSAGE_BUF(appId, ptrHolder);

      if (ret === 0x1104 || ret === 0x1101) {
        await sleep(pollingIntervalMs);
        continue;
      }

      if (ret !== 0) {
        console.error(`[Bridge] CAPI_GET_MESSAGE error: 0x${ret.toString(16)}`);
        await sleep(1000);
        continue;
      }

      // Read the 8-byte pointer written by the DLL
      const ptrLo  = ptrHolder.readUInt32LE(0);
      const ptrHi  = ptrHolder.readUInt32LE(4);
      const ptrNum = ptrHi * 0x100000000 + ptrLo;
      if (ptrNum === 0) continue;

      // Dereference via ReadProcessMemory
      msgBuf.fill(0);
      nReadOut[0] = 0;
      const ok = ReadProcessMemory(hProc, ptrNum, msgBuf, 512, nReadOut);
      if (!ok) continue;

      const msgLen = msgBuf.readUInt16LE(0);
      if (msgLen < 8 || msgLen > 512) continue;

      const msg = msgBuf.subarray(0, msgLen);
      console.log(`[Bridge] MSG: cmd=0x${msg[4]?.toString(16)} sub=0x${msg[5]?.toString(16)} len=${msgLen}`);
      processMessage(msg);

    } catch (e) {
      if (isRunning) {
        console.error("[Bridge] Loop error:", e.message);
        await sleep(1000);
      }
    }
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("=================================================");
  console.log("  FRITZ!Card USB - POS Caller ID Bridge v1.0");
  console.log("=================================================");
  console.log(`  Server  : ${serverUrl}`);
  console.log(`  Tenant  : ${tenantId}`);
  console.log(`  Poll ms : ${pollingIntervalMs}`);
  console.log(`  CAPI DLL: ${CAPI_DLL.replace(/\\/g, "/")}`);
  console.log("=================================================\n");

  if (!loadCAPI()) {
    console.error("\n[Bridge] Cannot continue without CAPI. See install-drivers.md\n");
    process.exit(1);
  }

  // Subscribe to incoming calls on the ISDN controller
  isRunning = true;
  const listenMsg = buildListenReq(capiController);
  const ret = capi.CAPI_PUT_MESSAGE(appId, listenMsg);
  if (ret !== 0) {
    console.error(`[Bridge] Failed to send LISTEN_REQ: 0x${ret.toString(16)}`);
    process.exit(1);
  }
  console.log(`[Bridge] LISTEN_REQ sent for controller ${capiController}`);

  // Run message loop
  await messageLoop();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\n[Bridge] Shutting down...");
  isRunning = false;
  if (capi && appId) {
    try { capi.CAPI_RELEASE(appId); } catch (_) {}
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[Bridge] Fatal:", e.message);
  process.exit(1);
});
