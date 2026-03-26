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
  // Parse URL into explicit params — avoids pg's sslmode handling issues with Neon
  const url = new URL(connectionString);
  poolConfig = {
    host: url.hostname,
    database: url.pathname.slice(1).split("?")[0],
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: parseInt(url.port || "5432"),
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
