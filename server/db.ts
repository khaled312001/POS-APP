import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let poolConfig: pg.PoolConfig;

// NEON_DATABASE_URL (user-set secret) always takes priority — points to the main production Neon DB
// PGHOST/etc are Replit-auto-managed and may point to a different Neon instance
const neonUrl = process.env.NEON_DATABASE_URL || "";
const isNeonUrl = neonUrl.includes("neon.tech");

const pgHost     = process.env.PGHOST     || "";
const pgDatabase = process.env.PGDATABASE || "";
const pgUser     = process.env.PGUSER     || "";
const pgPassword = process.env.PGPASSWORD || "";
const pgPort     = process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432;
const isNeonHost = pgHost.includes("neon.tech");

if (isNeonUrl) {
  // NEON_DATABASE_URL is the authoritative production database — parse with regex
  // (Node's URL class misparses the postgresql:// scheme)
  const match = neonUrl.match(
    /^(?:postgresql|postgres):\/\/([^:@]+):([^@]+)@([^/:]+)(?::(\d+))?\/([^?]*)?/
  );

  const host     = match?.[3] || "";
  const user     = match?.[1] ? decodeURIComponent(match[1]) : "";
  const password = match?.[2] ? decodeURIComponent(match[2]) : "";
  const port     = match?.[4] ? parseInt(match[4]) : 5432;
  const database = match?.[5] || "neondb";  // default to "neondb" when path is empty

  console.log(`[DB] Neon via NEON_DATABASE_URL — host: ${host}, database: ${database}, user: ${user}`);
  poolConfig = {
    host,
    database,
    user,
    password,
    port,
    ssl: { rejectUnauthorized: false },
  };
} else if (isNeonHost) {
  // Fallback: use Replit-managed PG* vars (when no NEON_DATABASE_URL is set)
  console.log(`[DB] Neon via PG* vars — host: ${pgHost}, database: ${pgDatabase}, user: ${pgUser}`);
  poolConfig = {
    host:     pgHost,
    database: pgDatabase || "neondb",
    user:     pgUser,
    password: pgPassword,
    port:     pgPort,
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
