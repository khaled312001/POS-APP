/**
 * Vercel Serverless Function — catch-all for /api/*
 *
 * Receives every request to pos.barmagly.tech/api/... and passes it to the
 * Express router so the same server code works both on Replit (long-running)
 * and on Vercel (serverless).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { tenantAuthMiddleware } from "./tenantAuth";
import { registerSuperAdminRoutes } from "./superAdminRoutes";
import { registerRoutes } from "./routes";

// ── Build DATABASE_URL from Vercel/Neon env vars if not already set ───────────
if (!process.env.DATABASE_URL) {
  const host = process.env.PGHOST || process.env.PGHOST_UNPOOLED;
  if (host) {
    process.env.DATABASE_URL =
      `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}` +
      `@${host}:${process.env.PGPORT || 5432}` +
      `/${process.env.PGDATABASE || "neondb"}?sslmode=require`;
  } else if (process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
  }
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowed = new Set([
    "https://pos.barmagly.tech",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:8080",
  ]);
  const origin = req.header("origin");
  const isLocalhost =
    origin?.startsWith("http://localhost:") ||
    origin?.startsWith("http://127.0.0.1:");
  if (origin && (allowed.has(origin) || isLocalhost)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-license-key, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Bootstrap: register routes once at module load (runs on cold start) ───────
const ready: Promise<void> = (async () => {
  app.use(tenantAuthMiddleware());
  registerSuperAdminRoutes(app);
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) res.status(status).json({ message });
  });
})().catch((err) => {
  // Surface init failures in function logs instead of letting Vercel return
  // an opaque 503 HTML page. The handler below will translate the rejection
  // into a JSON 500 with a useful message.
  console.error("[vercelHandler] Bootstrap failed:", err);
  throw err;
});

// ── Vercel handler ────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ready;
  } catch (err: any) {
    return res.status(500).json({
      error: "Server initialization failed",
      message: err?.message || String(err),
    });
  }
  // @ts-ignore — express accepts the Vercel req/res shapes
  return app(req, res);
}
