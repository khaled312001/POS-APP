import * as fs from "fs";
import { db } from "../server/db";
import { customers } from "../shared/schema";
import { normalizePhone } from "../server/phoneUtils";
import { eq } from "drizzle-orm";

const TENANT_ID = 1;
const CSV_FILE = "C:\\Users\\AIA\\Downloads\\data\\merged\\KUNDEN.csv";

async function importKunden() {
    console.log(`[IMPORT] Reading CSV file: ${CSV_FILE}`);

    // Read file with potential encoding issues - using a buffer first might be safer if it's not UTF-8
    // But let's try reading as string and replacing common Blach issues if needed.
    // The user's snippet showed "Blach" which is usually "Bülach" (ü is \xfc in Windows-1252)
    const content = fs.readFileSync(CSV_FILE, "binary");
    // Simple conversion from Windows-1252 to UTF-8 (rough approximation for common German chars)
    const lines = content.split(/\r?\n/);
    const header = lines[0].split(",");

    console.log(`[IMPORT] Found ${lines.length - 1} possible records`);

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Very simple CSV split (doesn't handle commas inside quotes, but looking at the data it seems simple)
        const cols = line.split(",");
        if (cols.length < 12) continue;

        const nameMain = cols[3]?.trim() || "";
        const nameFirst = cols[4]?.trim() || "";
        const name = `${nameFirst} ${nameMain}`.trim();

        if (!name && !cols[7]) continue; // Skip if no name and no firm

        const phoneRaw = cols[11]?.trim() || "";
        const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

        const street = cols[5]?.trim() || "";
        const houseNr = cols[12]?.trim() || cols[13]?.trim() || "";
        const plz = cols[10]?.trim() || "";
        const ort = cols[9]?.trim() || "";

        let address = "";
        if (street) address += street;
        if (houseNr) address += " " + houseNr;
        if (plz || ort) {
            if (address) address += ", ";
            address += `${plz} ${ort}`.trim();
        }

        const howToGo = cols[6]?.trim() || "";
        const screenInfo = cols[15]?.trim() || "";
        const notes = `${howToGo} ${screenInfo}`.trim();

        parsed.push({
            tenantId: TENANT_ID,
            name: name || cols[7]?.trim() || "Unknown",
            phone,
            email: null,
            address: address || null,
            notes: notes || null,
            loyaltyPoints: 0,
            visitCount: 0,
            totalSpent: "0",
            isActive: true,
            createdAt: new Date(),
        });
    }

    console.log(`[IMPORT] Parsed ${parsed.length} valid customers`);

    const BATCH_SIZE = 100;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
        const batch = parsed.slice(i, i + BATCH_SIZE);

        // Filter out duplicates within the batch or against DB (simplified: just insert if phone is unique or name/address combination)
        // For now, let's just insert and let the DB handle constraints if any, 
        // but the schema probably doesn't have unique constraints on phone yet.

        try {
            await db.insert(customers).values(batch);
            inserted += batch.length;
            if (i % 1000 === 0) console.log(`[IMPORT] Processed ${i}/${parsed.length}...`);
        } catch (e) {
            console.error(`[IMPORT] Batch error at ${i}:`, e.message);
            // Fallback: insert one by one in this batch if it failed
            for (const item of batch) {
                try {
                    await db.insert(customers).values(item);
                    inserted++;
                } catch (inner) {
                    skipped++;
                }
            }
        }
    }

    console.log(`[IMPORT] ✅ Successfully imported ${inserted} customers. Skipped ${skipped}.`);
    process.exit(0);
}

importKunden().catch((e) => {
    console.error("[IMPORT] Error:", e);
    process.exit(1);
});
