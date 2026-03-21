import * as fs from "fs";
import { db } from "../server/db";
import { customers, tenants } from "../shared/schema";
import { eq } from "drizzle-orm";
import { normalizePhone } from "../server/phoneUtils";

// Default tenant for Pizza Lemon based on previous import script
const TENANT_ID = 24;
const CSV_FILE = "C:\\Users\\AIA\\Downloads\\data\\merged\\KUNDEN.csv";

interface ParsedCustomer {
    phone: string;
    name: string;
    street: string;
    city: string;
    streetNumber: string;
    address: string;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function parseCSVFile(filePath: string): ParsedCustomer[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);

    // Use a map to ensure phone uniqueness within the CSV itself
    const phoneMap = new Map<string, ParsedCustomer>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = parseCSVLine(line);

        if (fields.length < 14) continue;

        const lastName = fields[3] ? fields[3].trim() : "";
        const firstName = fields[4] ? fields[4].trim() : "";
        const name = `${firstName} ${lastName}`.trim();

        const street = fields[5] ? fields[5].trim() : "";
        const city = fields[9] ? fields[9].trim() : "";
        const phone = fields[11] ? fields[11].trim() : "";
        const streetNumber = fields[13] ? fields[13].trim() : "";

        let addressParts = [];
        if (street) {
            addressParts.push(streetNumber ? `${street} ${streetNumber}` : street);
        }
        if (city) {
            addressParts.push(city);
        }
        const address = addressParts.join(', ');

        if (phone) {
            const normalized = normalizePhone(phone);
            // We only insert the first occurrence if duplicates exist in the CSV
            if (!phoneMap.has(normalized)) {
                phoneMap.set(normalized, {
                    phone: normalized,
                    name: name || "Unknown",
                    street,
                    city,
                    streetNumber,
                    address
                });
            }
        }
    }

    return Array.from(phoneMap.values());
}

async function run() {
    console.log(`[IMPORT CSV] Reading CSV file: ${CSV_FILE}`);

    const parsed = parseCSVFile(CSV_FILE);
    console.log(`[IMPORT CSV] Parsed ${parsed.length} unique customers from CSV.`);

    console.log(`[IMPORT CSV] Deleting all existing customers for tenant ${TENANT_ID}...`);
    await db.delete(customers).where(eq(customers.tenantId, TENANT_ID));
    console.log(`[IMPORT CSV] Deleted existing customers.`);

    const toInsert = parsed.map(c => ({
        tenantId: TENANT_ID,
        name: c.name,
        phone: c.phone,
        address: c.address,
        isActive: true,
    }));

    const BATCH_SIZE = 500;
    let inserted = 0;

    console.log(`[IMPORT CSV] Starting batch inserts. Total to Insert: ${toInsert.length}`);

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        try {
            await db.insert(customers).values(batch);
            inserted += batch.length;
            process.stdout.write(`\rInserted ${inserted} / ${toInsert.length}`);
        } catch (e) {
            console.error(`\n[IMPORT CSV] Error inserting batch at index ${i}:`, e);
        }
    }

    console.log(`\n[IMPORT CSV] Finished! Successfully inserted ${inserted} customers.`);
    process.exit(0);
}

run().catch((e) => {
    console.error("[IMPORT CSV] Error:", e);
    process.exit(1);
});
