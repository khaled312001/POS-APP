import { db } from "./server/db";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function createTables() {
    console.log("Creating super_admins table...");
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'super_admin',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("Table super_admins created or already exists.");
    } catch (err) {
        console.error("Error creating table:", err);
    }
    process.exit(0);
}

createTables();
