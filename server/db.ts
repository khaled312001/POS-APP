import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// In production, Replit runtime provides the correct DATABASE_URL for the Production Database.
// In development, prefer NEON_DATABASE_URL if set (allows pointing to a specific Neon DB).
const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });

// Ensure UTF-8 encoding for all connections to properly handle special characters (German, Arabic, etc.)
pool.on("connect", (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

export const db = drizzle(pool, { schema });
