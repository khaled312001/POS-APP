/**
 * One-time script to seed the Pizza Lemon store into the production database.
 * Run with:
 *   DATABASE_URL="..." npx tsx scripts/runPizzaLemonSeed.ts
 * Or set the env var first, then run:
 *   npx tsx scripts/runPizzaLemonSeed.ts
 */

import { seedPizzaLemon } from "../server/seedPizzaLemon";
import { pool } from "../server/db";

(async () => {
    try {
        console.log("[SEED] Connecting to database:", process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "unknown host");
        await seedPizzaLemon();
        console.log("[SEED] Done.");
    } catch (err) {
        console.error("[SEED] Error:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
