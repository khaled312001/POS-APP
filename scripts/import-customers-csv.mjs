import { createReadStream } from "fs";
import { createInterface } from "readline";
import pkg from "pg";

const { Pool } = pkg;

const TENANT_ID = 24;
const CSV_PATH = "attached_assets/KUNDEN_ALL_fixed_1774539235943.csv";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const toBoolean = (v) => (v || "").trim().toUpperCase() === "TRUE";
const toDecimal = (v) => { const n = parseFloat((v||"").trim()); return isNaN(n) ? null : n; };
const toInt = (v) => { const n = parseInt((v||"").trim(), 10); return isNaN(n) ? null : n; };
const toText = (v) => { const t = (v||"").trim(); return t === "" ? null : t; };
const toNr = (v) => { const n = parseInt((v||"").trim(), 10); return isNaN(n) ? null : n; };
const buildName = (l, f) => {
  const ln = (l||"").trim(), fn = (f||"").trim();
  if (ln && fn) return `${ln}, ${fn}`;
  return ln || fn || "Unknown";
};

async function run() {
  const client = await pool.connect();
  console.log("Connected to production DB. Creating staging table...");

  await client.query(`
    CREATE TEMP TABLE csv_stage (
      customer_nr integer,
      name text, last_name text, first_name text, salutation text,
      street text, street_nr text, house_nr text,
      city text, postal_code text, quadrat text, phone text,
      company text, zhd text, how_to_go text, screen_info text,
      source text, legacy_ref text,
      first_order_date text, last_order_date text,
      legacy_total_spent numeric(12,2),
      average_order_value numeric(10,2),
      order_count integer,
      r1 text, r3 text, r4 text, r5 text, r8 text, r9 text, r10 text,
      r14 numeric(12,2), r15 numeric(12,2),
      r16 boolean, r17 boolean, r18 boolean, r19 boolean, r20 boolean
    )
  `);

  console.log("Loading CSV into staging table...");
  let lineNum = 0, rowCount = 0, skipped = 0;

  const BATCH = 300;
  let rows = [];

  const flush = async () => {
    if (!rows.length) return;
    const params = [];
    const tuples = rows.map((r) => {
      const base = params.length;
      params.push(
        r.customer_nr, r.name, r.last_name, r.first_name, r.salutation,
        r.street, r.street_nr, r.house_nr, r.city, r.postal_code,
        r.quadrat, r.phone, r.company, r.zhd, r.how_to_go, r.screen_info,
        r.source, r.legacy_ref, r.first_order_date, r.last_order_date,
        r.legacy_total_spent, r.average_order_value, r.order_count,
        r.r1, r.r3, r.r4, r.r5, r.r8, r.r9, r.r10,
        r.r14, r.r15, r.r16, r.r17, r.r18, r.r19, r.r20
      );
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18},$${base+19},$${base+20},$${base+21},$${base+22},$${base+23},$${base+24},$${base+25},$${base+26},$${base+27},$${base+28},$${base+29},$${base+30},$${base+31},$${base+32},$${base+33},$${base+34},$${base+35},$${base+36},$${base+37})`;
    });
    await client.query(
      `INSERT INTO csv_stage (customer_nr,name,last_name,first_name,salutation,street,street_nr,house_nr,city,postal_code,quadrat,phone,company,zhd,how_to_go,screen_info,source,legacy_ref,first_order_date,last_order_date,legacy_total_spent,average_order_value,order_count,r1,r3,r4,r5,r8,r9,r10,r14,r15,r16,r17,r18,r19,r20) VALUES ${tuples.join(",")}`,
      params
    );
    rowCount += rows.length;
    rows = [];
    process.stdout.write(".");
  };

  for await (const line of createInterface({ input: createReadStream(CSV_PATH) })) {
    lineNum++;
    if (lineNum === 1) continue;

    const cols = line.split(",");
    if (cols.length < 35) { skipped++; continue; }

    const nr = toNr(cols[0]);
    if (!nr) { skipped++; continue; }

    rows.push({
      customer_nr: nr,
      name:        buildName(cols[2], cols[3]),
      last_name:   toText(cols[2]),
      first_name:  toText(cols[3]),
      salutation:  toText(cols[1]),
      street:      toText(cols[4]),
      how_to_go:   toText(cols[5]),
      company:     toText(cols[6]),
      zhd:         toText(cols[7]),
      city:        toText(cols[8]),
      postal_code: toText(cols[9]),
      phone:       toText(cols[10]),
      street_nr:   toText(cols[11]),
      house_nr:    toText(cols[12]),
      quadrat:     toText(cols[13]),
      screen_info: toText(cols[14]),
      r1:          toText(cols[15]),
      legacy_ref:  toText(cols[16]),
      r3:          toText(cols[17]),
      r4:          toText(cols[18]),
      r5:          toText(cols[19]),
      first_order_date: toText(cols[20]),
      last_order_date:  toText(cols[21]),
      r8:          toText(cols[22]),
      r9:          toText(cols[23]),
      r10:         toText(cols[24]),
      legacy_total_spent:  toDecimal(cols[25]),
      average_order_value: toDecimal(cols[26]),
      order_count:         toInt(cols[27]),
      r14:         toDecimal(cols[28]),
      r15:         toDecimal(cols[29]),
      r16:         toBoolean(cols[30]),
      r17:         toBoolean(cols[31]),
      r18:         toBoolean(cols[32]),
      r19:         toBoolean(cols[33]),
      r20:         toBoolean(cols[34]),
    });

    if (rows.length >= BATCH) await flush();
  }
  await flush();
  console.log(`\n${rowCount} rows loaded (${skipped} skipped). Running bulk UPDATE...`);

  const upd = await client.query(`
    UPDATE customers c SET
      name                = s.name,
      last_name           = s.last_name,
      first_name          = s.first_name,
      salutation          = s.salutation,
      street              = s.street,
      street_nr           = s.street_nr,
      house_nr            = s.house_nr,
      city                = s.city,
      postal_code         = s.postal_code,
      quadrat             = s.quadrat,
      company             = s.company,
      zhd                 = s.zhd,
      how_to_go           = s.how_to_go,
      screen_info         = s.screen_info,
      source              = COALESCE(NULLIF(c.source,''), s.source),
      legacy_ref          = COALESCE(NULLIF(c.legacy_ref,''), s.legacy_ref),
      first_order_date    = CASE WHEN (c.first_order_date IS NULL OR c.first_order_date = '') AND s.first_order_date IS NOT NULL THEN s.first_order_date ELSE c.first_order_date END,
      last_order_date     = CASE WHEN (c.last_order_date  IS NULL OR c.last_order_date  = '') AND s.last_order_date  IS NOT NULL THEN s.last_order_date  ELSE c.last_order_date  END,
      legacy_total_spent  = CASE WHEN (c.legacy_total_spent  IS NULL OR c.legacy_total_spent  = 0) AND s.legacy_total_spent  IS NOT NULL THEN s.legacy_total_spent  ELSE c.legacy_total_spent  END,
      average_order_value = CASE WHEN (c.average_order_value IS NULL OR c.average_order_value = 0) AND s.average_order_value IS NOT NULL THEN s.average_order_value ELSE c.average_order_value END,
      order_count         = CASE WHEN (c.order_count  IS NULL OR c.order_count  = 0) AND s.order_count  IS NOT NULL THEN s.order_count  ELSE c.order_count  END,
      r1  = COALESCE(NULLIF(c.r1,''),  s.r1),
      r3  = COALESCE(NULLIF(c.r3,''),  s.r3),
      r4  = COALESCE(NULLIF(c.r4,''),  s.r4),
      r5  = COALESCE(NULLIF(c.r5,''),  s.r5),
      r8  = COALESCE(NULLIF(c.r8,''),  s.r8),
      r9  = COALESCE(NULLIF(c.r9,''),  s.r9),
      r10 = COALESCE(NULLIF(c.r10,''), s.r10),
      r14 = COALESCE(c.r14, s.r14),
      r15 = COALESCE(c.r15, s.r15),
      r16 = COALESCE(c.r16, false) OR s.r16,
      r17 = COALESCE(c.r17, false) OR s.r17,
      r18 = COALESCE(c.r18, false) OR s.r18,
      r19 = COALESCE(c.r19, false) OR s.r19,
      r20 = COALESCE(c.r20, false) OR s.r20,
      updated_at = now()
    FROM csv_stage s
    WHERE c.tenant_id = ${TENANT_ID} AND c.customer_nr = s.customer_nr
  `);
  console.log(`Updated: ${upd.rowCount} customers`);

  const ins = await client.query(`
    INSERT INTO customers (
      tenant_id, customer_nr, name, last_name, first_name, salutation,
      street, street_nr, house_nr, city, postal_code, quadrat, phone,
      company, zhd, how_to_go, screen_info, source, legacy_ref,
      first_order_date, last_order_date,
      legacy_total_spent, average_order_value, order_count,
      r1, r3, r4, r5, r8, r9, r10, r14, r15,
      r16, r17, r18, r19, r20, is_active
    )
    SELECT ${TENANT_ID}, s.customer_nr, s.name, s.last_name, s.first_name, s.salutation,
      s.street, s.street_nr, s.house_nr, s.city, s.postal_code, s.quadrat, s.phone,
      s.company, s.zhd, s.how_to_go, s.screen_info, s.source, s.legacy_ref,
      s.first_order_date, s.last_order_date,
      s.legacy_total_spent, s.average_order_value, s.order_count,
      s.r1, s.r3, s.r4, s.r5, s.r8, s.r9, s.r10, s.r14, s.r15,
      s.r16, s.r17, s.r18, s.r19, s.r20, true
    FROM csv_stage s
    WHERE NOT EXISTS (
      SELECT 1 FROM customers c WHERE c.tenant_id = ${TENANT_ID} AND c.customer_nr = s.customer_nr
    )
  `);
  console.log(`Inserted: ${ins.rowCount} new customers`);

  client.release();
  await pool.end();
  console.log("\n✅ Import complete!");
}

run().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
