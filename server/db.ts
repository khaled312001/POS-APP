import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeon = connectionString.includes("neon.tech");

let poolConfig: pg.PoolConfig;

if (isNeon) {
  // node's URL parser does not handle postgresql:// correctly — use regex
  // Handles: postgresql://user:pass@host[:port]/dbname[?params]
  const match = connectionString.match(
    /^(?:postgresql|postgres):\/\/([^:@]+):([^@]+)@([^/:]+)(?::(\d+))?\/([^?]*)?/
  );

  let host = "";
  let user = "";
  let password = "";
  let port = 5432;
  let database = "";

  if (match) {
    user     = decodeURIComponent(match[1] || "");
    password = decodeURIComponent(match[2] || "");
    host     = match[3] || "";
    port     = match[4] ? parseInt(match[4]) : 5432;
    database = match[5] || "";
  }

  // Fall back to the environment variable override, then to "neondb" (Neon's default)
  database = process.env.NEON_DATABASE || database || "neondb";

  console.log(`[DB] Connecting to Neon — host: ${host}, database: ${database}, user: ${user}`);

  poolConfig = {
    host,
    database,
    user,
    password,
    port,
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = { connectionString };
}

export const pool = new Pool(poolConfig);

// Ensure UTF-8 encoding for all connections to properly handle special characters (German, Arabic, etc.)
pool.on("connect", (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

export const db = drizzle(pool, { schema });
