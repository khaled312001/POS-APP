import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let poolConfig: pg.PoolConfig;

// PGHOST/PGDATABASE/etc are Replit-managed — they point to Neon only when using Neon integration
const pgHost     = process.env.PGHOST     || "";
const pgDatabase = process.env.PGDATABASE || "";
const pgUser     = process.env.PGUSER     || "";
const pgPassword = process.env.PGPASSWORD || "";
const pgPort     = process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432;

const isNeonHost = pgHost.includes("neon.tech");

// The NEON_DATABASE_URL secret (set by the user) or the workflow-overridden DATABASE_URL
const neonUrl = process.env.NEON_DATABASE_URL || "";
const isNeonUrl = neonUrl.includes("neon.tech");

if (isNeonHost) {
  // PG* vars point directly at Neon — most reliable, no URL parsing
  console.log(`[DB] Neon via PG* vars — host: ${pgHost}, database: ${pgDatabase}, user: ${pgUser}`);
  poolConfig = {
    host:     pgHost,
    database: pgDatabase || "neondb",
    user:     pgUser,
    password: pgPassword,
    port:     pgPort,
    ssl: { rejectUnauthorized: false },
  };
} else if (isNeonUrl) {
  // Parse the Neon URL — do NOT use local PG* vars (they point to Helium)
  const match = neonUrl.match(
    /^(?:postgresql|postgres):\/\/([^:@]+):([^@]+)@([^/:]+)(?::(\d+))?\/([^?]*)?/
  );

  const host     = match?.[3] || "";
  const user     = match?.[1] ? decodeURIComponent(match[1]) : "";
  const password = match?.[2] ? decodeURIComponent(match[2]) : "";
  const port     = match?.[4] ? parseInt(match[4]) : 5432;
  const database = match?.[5] || "neondb";  // default to "neondb" when path is empty

  console.log(`[DB] Neon via URL parse — host: ${host}, database: ${database}, user: ${user}`);
  poolConfig = {
    host,
    database,
    user,
    password,
    port,
    ssl: { rejectUnauthorized: false },
  };
} else {
  // Local / Replit Helium
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  console.log(`[DB] Local/Helium — using DATABASE_URL`);
  poolConfig = { connectionString };
}

export const pool = new Pool(poolConfig);

// Ensure UTF-8 encoding for all connections to properly handle special characters
pool.on("connect", (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

export const db = drizzle(pool, { schema });
