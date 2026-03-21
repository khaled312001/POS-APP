"use strict";
const koffi = require("koffi");
const fs = require("fs");
const dll = "C:\\Windows\\System32\\capi2032.dll";

console.log("=== CAPI DLL Diagnostic v2 ===\n");

// 0. Check DLL bitness from PE header
try {
  const buf = fs.readFileSync(dll);
  const e_lfanew = buf.readUInt32LE(0x3C);
  const machine = buf.readUInt16LE(e_lfanew + 4);
  const bits = machine === 0x8664 ? "64-bit (x64)" : machine === 0x014C ? "32-bit (x86)" : `unknown (0x${machine.toString(16)})`;
  console.log(`[PE] capi2032.dll is ${bits}  (machine=0x${machine.toString(16)})`);
} catch(e) { console.log("PE check error:", e.message); }

const lib = koffi.load(dll);

// 1. CAPI_INSTALLED
try {
  const fn = lib.func("uint32 CAPI_INSTALLED()");
  const r = fn();
  console.log(`\nCAPI_INSTALLED() = 0x${r.toString(16)} (0=OK)`);
} catch(e) { console.log("CAPI_INSTALLED error:", e.message); }

// 2. CAPI_GET_MANUFACTURER
try {
  const fn = lib.func("uint32 CAPI_GET_MANUFACTURER(uint8 *out)");
  const buf = Buffer.alloc(64).fill(0);
  const r = fn(buf);
  console.log(`CAPI_GET_MANUFACTURER() = "${buf.toString("ascii").replace(/\0/g,"").trim()}"`);
} catch(e) { console.log("CAPI_GET_MANUFACTURER error:", e.message); }

// 3. CAPI_GET_PROFILE — controller 1 info (no AppID needed)
try {
  const fn = lib.func("uint32 CAPI_GET_PROFILE(uint8 *out, uint32 controller)");
  const buf = Buffer.alloc(64).fill(0);
  const r = fn(buf, 1);
  console.log(`CAPI_GET_PROFILE(ctrl=1) = 0x${r.toString(16)}`);
  if (r === 0) {
    const numCtrl = buf.readUInt16LE(0);
    console.log(`  numControllers=${numCtrl}`);
  }
} catch(e) { console.log("CAPI_GET_PROFILE error:", e.message); }

// 4a. CAPI_REGISTER — 4-param (old convention: returns AppID directly)
let appId4 = 0;
try {
  const fn = lib.func("uint32 CAPI_REGISTER(uint32, uint32, uint32, uint32)");
  const r = fn(4096, 2, 7, 2048);
  console.log(`\nCAPI_REGISTER(4-param) ret=0x${r.toString(16)} (if old convention: appId=${r})`);
  appId4 = r;
} catch(e) { console.log("CAPI_REGISTER(4-param) error:", e.message); }

// 4b. CAPI_REGISTER — 5-param uint32 out (standard CAPI 2.0)
let appId5u32 = 0;
try {
  const fn = lib.func("uint32 CAPI_REGISTER(uint32, uint32, uint32, uint32, uint32 *out)");
  const idOut = [0];
  const r = fn(4096, 2, 7, 2048, idOut);
  appId5u32 = idOut[0];
  console.log(`CAPI_REGISTER(5-param,u32) ret=0x${r.toString(16)} appId=${idOut[0]}`);
} catch(e) { console.log("CAPI_REGISTER(5-param,u32) error:", e.message); }

// 4c. CAPI_REGISTER — 5-param uint16 out (WORD convention)
let appId5u16 = 0;
try {
  const fn = lib.func("uint16 CAPI_REGISTER(uint32, uint32, uint32, uint32, uint16 *out)");
  const idOut = [0];
  const r = fn(4096, 2, 7, 2048, idOut);
  appId5u16 = idOut[0];
  console.log(`CAPI_REGISTER(5-param,u16) ret=0x${r.toString(16)} appId=${idOut[0]}`);
} catch(e) { console.log("CAPI_REGISTER(5-param,u16) error:", e.message); }

// 5. Try CAPI_PUT_MESSAGE with various AppIDs to find which one works
console.log("\n--- Probing CAPI_PUT_MESSAGE with candidate AppIDs ---");
const CAPI_PUT_MESSAGE = lib.func("uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)");

const candidates = [...new Set([appId4, appId5u32, appId5u16, 1, 2, 3, 4].filter(x => x >= 0 && x <= 64))];
for (const id of candidates) {
  try {
    const buf = Buffer.alloc(32).fill(0);
    buf.writeUInt16LE(32, 0);
    buf.writeUInt16LE(id, 2);
    buf.writeUInt8(0x05, 4);  // LISTEN_REQ cmd
    buf.writeUInt8(0x80, 5);
    buf.writeUInt16LE(1, 6);
    buf.writeUInt32LE(1, 8);          // controller 1
    buf.writeUInt32LE(0xFFFF, 12);    // InfoMask
    buf.writeUInt32LE(0x1FFF03FF, 16); // CIP mask
    const pr = CAPI_PUT_MESSAGE(id, buf);
    const ok = pr === 0 ? " ✓ SUCCESS" : ` (err=0x${pr.toString(16)})`;
    console.log(`  CAPI_PUT_MESSAGE(appId=${id}) = 0x${pr.toString(16)}${ok}`);
  } catch(e) { console.log(`  CAPI_PUT_MESSAGE(appId=${id}) error: ${e.message}`); }
}

// 6. CAPI_RELEASE for any registered IDs
for (const id of [appId4, appId5u32, appId5u16].filter(x => x > 0)) {
  try {
    const fn = lib.func("uint32 CAPI_RELEASE(uint32)");
    fn(id);
  } catch(_) {}
}

console.log("\n=== Done ===");
