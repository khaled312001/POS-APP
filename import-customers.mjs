/**
 * Standalone CSV Import Script
 * Imports KUNDEN_ALL_fixed.csv into the customers table
 * Run: node import-customers.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = 'postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const TENANT_ID = 24;
const CSV_FILE = path.join(__dirname, 'KUNDEN_ALL_fixed.csv');

async function main() {
  console.log('Connecting to database...');
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    // Step 1: Run migration to add new columns
    console.log('Running migration...');
    await pool.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_nr integer;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS salutation text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS company text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS zhd text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_to_go text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS screen_info text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS source text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_total_spent numeric(12,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS average_order_value numeric(10,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS order_count integer DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_ref text;
    `);
    console.log('Migration complete!');

    // Step 2: Read CSV
    console.log(`Reading CSV: ${CSV_FILE}`);
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = csvContent.split('\n');
    console.log(`Total lines: ${lines.length} (including header)`);

    // Step 3: Parse and import
    const BATCH_SIZE = 200;
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let batch = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '').trim();
      if (!line) { skipped++; continue; }

      // Parse CSV line handling commas inside quotes
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      values.push(current.trim());

      // Map CSV columns
      const nr = values[0] || '';
      const anrede = values[1] || '';
      const namen = values[2] || '';
      const vorname = values[3] || '';
      const strasse = values[4] || '';
      const howToGo = values[5] || '';
      const firma = values[6] || '';
      const zhd = values[7] || '';
      const ort = values[8] || '';
      const plz = values[9] || '';
      const tel1 = values[10] || '';
      const strassNr = values[11] || '';
      const hausNr = values[12] || '';
      const quadrat = values[13] || '';
      const screenInfo = values[14] || '';
      const r1 = values[15] || '';
      const r6 = values[20] || ''; // first order date
      const r7 = values[21] || ''; // last order date
      const r10 = values[24] || ''; // total spent
      const r11 = values[25] || ''; // average order value
      const r12 = values[26] || ''; // order count
      const _source = values[values.length - 1] || '';

      // Build full name
      const fullName = [namen, vorname].filter(s => s && s.trim()).join(', ').trim() || 'Unknown';

      // Build address
      const addressParts = [strasse, strassNr, hausNr].filter(s => s && s.trim()).join(' ').trim();
      const cityParts = [plz, ort].filter(s => s && s.trim()).join(' ').trim();
      const address = [addressParts, cityParts].filter(s => s).join(', ') || null;

      // Build notes
      const noteParts = [];
      if (screenInfo) noteParts.push(screenInfo);
      if (howToGo) noteParts.push(`Directions: ${howToGo}`);
      if (quadrat) noteParts.push(`Quadrat: ${quadrat}`);
      const notes = noteParts.join(' | ') || null;

      const totalSpent = r10 ? parseFloat(r10) || 0 : 0;
      const avgOrder = r11 ? parseFloat(r11) || 0 : 0;
      const orderCnt = r12 ? parseInt(r12) || 0 : 0;

      batch.push([
        TENANT_ID, fullName, tel1 || null, address, notes, true,
        nr ? parseInt(nr) || null : null,
        anrede || null, vorname || null, namen || null,
        strasse || null, strassNr || null, hausNr || null,
        ort || null, plz || null, firma || null, zhd || null,
        howToGo || null, screenInfo || null, _source || null,
        r6 || null, r7 || null,
        totalSpent, avgOrder, orderCnt,
        r1 || null, totalSpent, orderCnt
      ]);

      if (batch.length >= BATCH_SIZE) {
        try {
          await insertBatch(pool, batch);
          imported += batch.length;
        } catch (e) {
          console.error(`Error inserting batch at line ${i}:`, e.message);
          errors += batch.length;
        }
        batch = [];
        if (imported % 2000 === 0) {
          console.log(`  Progress: ${imported} imported, ${skipped} skipped, ${errors} errors...`);
        }
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      try {
        await insertBatch(pool, batch);
        imported += batch.length;
      } catch (e) {
        console.error('Error inserting final batch:', e.message);
        errors += batch.length;
      }
    }

    console.log('\n=============================');
    console.log(`IMPORT COMPLETE!`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Errors:   ${errors}`);
    console.log(`  Total:    ${lines.length - 1}`);
    console.log('=============================');

    // Verify
    const countResult = await pool.query('SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = $1', [TENANT_ID]);
    console.log(`\nTotal customers in DB for tenant ${TENANT_ID}: ${countResult.rows[0].cnt}`);

  } catch (e) {
    console.error('FATAL ERROR:', e);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

async function insertBatch(pool, batch) {
  // Build multi-row VALUES clause
  const params = [];
  const valueRows = [];
  let paramIdx = 1;

  for (const row of batch) {
    const placeholders = row.map(() => `$${paramIdx++}`);
    valueRows.push(`(${placeholders.join(', ')})`);
    params.push(...row);
  }

  const sql = `
    INSERT INTO customers (
      tenant_id, name, phone, address, notes, is_active,
      customer_nr, salutation, first_name, last_name,
      street, street_nr, house_nr, city, postal_code,
      company, zhd, how_to_go, screen_info, source,
      first_order_date, last_order_date,
      legacy_total_spent, average_order_value, order_count,
      legacy_ref, total_spent, visit_count
    ) VALUES ${valueRows.join(', ')}
  `;

  await pool.query(sql, params);
}

main();
