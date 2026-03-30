/**
 * Compiles server/vercelHandler.ts → api/[...slug].js using esbuild.
 *
 * Why: @vercel/node's internal TypeScript compiler does not support
 * "moduleResolution": "bundler" (a TypeScript 5 feature). Pre-compiling
 * with esbuild bypasses Vercel's TypeScript step entirely — Vercel then
 * deploys the resulting .js file directly as a Node.js Lambda.
 */

const { buildSync } = require("esbuild");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const entry = path.join(root, "server", "vercelHandler.ts");
const outfile = path.join(root, "api", "[...slug].js");

// Ensure api/ directory exists
fs.mkdirSync(path.join(root, "api"), { recursive: true });

try {
  buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    // Keep npm packages external — they are resolved from node_modules at runtime
    packages: "external",
    outfile,
    // esbuild strips TypeScript types without running tsc, so moduleResolution
    // settings in tsconfig.json are irrelevant here
    logLevel: "info",
  });
  console.log("[build-api] ✓ Compiled server/vercelHandler.ts → api/[...slug].js");
} catch (err) {
  console.error("[build-api] ✗ Compilation failed:", err.message || err);
  process.exit(1);
}
