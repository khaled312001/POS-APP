/**
 * Install FRITZ!Card POS Bridge as a Windows Service
 *
 * Usage (run as Administrator):
 *   node install-service.js          → Install service
 *   node install-service.js remove   → Remove service
 */

"use strict";

const path = require("path");
const { Service } = require("node-windows");

const bridgePath = path.join(__dirname, "capi-bridge.js");
const action = process.argv[2] || "install";

const svc = new Service({
  name: "BarmaglyCallerIDBridge",
  description: "FRITZ!Card CAPI caller-ID bridge for Barmagly POS — sends incoming call numbers to the POS server.",
  script: bridgePath,
  workingDirectory: __dirname,
  // Restart automatically on crash (up to 3 times in 60s, then wait 2min)
  maxRestarts: 10,
  wait: 2,
  grow: 0.5,
  // Log output to files next to this script
  logpath: path.join(__dirname, "logs"),
});

svc.on("install", () => {
  console.log("[Service] Installed successfully. Starting...");
  svc.start();
});

svc.on("start", () => {
  console.log("[Service] Service started! Bridge is now running as a Windows Service.");
  console.log("[Service] It will auto-start on every Windows boot, even after restart.");
});

svc.on("uninstall", () => {
  console.log("[Service] Service removed successfully.");
});

svc.on("error", (err) => {
  console.error("[Service] Error:", err);
});

if (action === "remove" || action === "uninstall") {
  console.log("[Service] Removing Windows Service...");
  svc.uninstall();
} else {
  console.log("[Service] Installing as Windows Service...");
  console.log(`[Service] Script: ${bridgePath}`);
  svc.install();
}
