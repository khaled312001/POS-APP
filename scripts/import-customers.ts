import * as fs from "fs";
import { db } from "../server/db";
import { customers } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const TENANT_ID = 24;
const SQL_FILE = "attached_assets/lemon_oc_customer_1773052719659.sql";

interface ParsedCustomer {
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  visitCount: number;
  dateAdded: string;
}

function parseSqlFile(filePath: string): ParsedCustomer[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const result: ParsedCustomer[] = [];

  const valueRegex = /\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(?:NULL|'[^']*'),\s*(?:NULL|'[^']*'),\s*\d+,\s*\d+,\s*'[^']*',\s*'[^']*',\s*(\d+),\s*(\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'(\d{4}-\d{2}-\d{2}[^']*)',\s*(?:NULL|'[^']*'),\s*(?:NULL|'[^']*'),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g;

  let match;
  while ((match = valueRegex.exec(content)) !== null) {
    const firstname = match[5].trim();
    const lastname = match[6].trim();
    const email = match[7].trim();
    const phone = match[8].trim();
    const status = parseInt(match[9]);
    const dateAdded = match[11];
    const pizzaCount = parseInt(match[12]);
    const campaignCount = parseInt(match[13]);
    const kebapCount = parseInt(match[14]);

    if (status === 1 && firstname && lastname) {
      result.push({
        name: `${firstname} ${lastname}`.trim(),
        email: email || null,
        phone: phone || null,
        loyaltyPoints: pizzaCount + campaignCount + kebapCount,
        visitCount: pizzaCount,
        dateAdded,
      });
    }
  }

  return result;
}

async function importCustomers() {
  console.log(`[IMPORT] Reading SQL file: ${SQL_FILE}`);
  const parsed = parseSqlFile(SQL_FILE);
  console.log(`[IMPORT] Parsed ${parsed.length} active customers`);

  const existing = await db
    .select({ email: customers.email, phone: customers.phone })
    .from(customers)
    .where(eq(customers.tenantId, TENANT_ID));

  const existingEmails = new Set(existing.map((c) => c.email?.toLowerCase()).filter(Boolean));
  const existingPhones = new Set(existing.map((c) => c.phone).filter(Boolean));

  console.log(`[IMPORT] Existing customers in Pizza Lemon: ${existing.length}`);

  const toInsert = parsed.filter((c) => {
    if (c.email && existingEmails.has(c.email.toLowerCase())) return false;
    if (c.phone && existingPhones.has(c.phone)) return false;
    return true;
  });

  console.log(`[IMPORT] New customers to insert: ${toInsert.length} (${parsed.length - toInsert.length} duplicates skipped)`);

  if (toInsert.length === 0) {
    console.log("[IMPORT] Nothing to import.");
    process.exit(0);
  }

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map((c) => ({
      tenantId: TENANT_ID,
      name: c.name,
      email: c.email,
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints,
      visitCount: c.visitCount,
      totalSpent: "0",
      isActive: true,
      createdAt: new Date(c.dateAdded),
    }));

    await db.insert(customers).values(batch);
    inserted += batch.length;
    console.log(`[IMPORT] Inserted ${inserted}/${toInsert.length}...`);
  }

  console.log(`[IMPORT] ✅ Successfully imported ${inserted} customers into Pizza Lemon (tenant ${TENANT_ID})`);
  process.exit(0);
}

importCustomers().catch((e) => {
  console.error("[IMPORT] Error:", e);
  process.exit(1);
});
