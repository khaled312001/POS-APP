const { Client } = require("pg");
const mysql = require("mysql2/promise");

const SOURCE_PG_URL = process.env.SOURCE_PG_URL;
const TARGET_MYSQL_HOST = process.env.TARGET_MYSQL_HOST;
const TARGET_MYSQL_PORT = Number(process.env.TARGET_MYSQL_PORT || 3306);
const TARGET_MYSQL_USER = process.env.TARGET_MYSQL_USER;
const TARGET_MYSQL_PASSWORD = process.env.TARGET_MYSQL_PASSWORD;
const TARGET_MYSQL_DATABASE = process.env.TARGET_MYSQL_DATABASE;

if (
  !SOURCE_PG_URL ||
  !TARGET_MYSQL_HOST ||
  !TARGET_MYSQL_USER ||
  !TARGET_MYSQL_PASSWORD ||
  !TARGET_MYSQL_DATABASE
) {
  console.error("Missing required environment variables for migration.");
  process.exit(1);
}

const INSERT_ORDER = [
  "super_admins",
  "tenants",
  "branches",
  "employees",
  "categories",
  "products",
  "inventory",
  "customers",
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  "sales",
  "sale_items",
  "calls",
  "shifts",
  "notifications",
  "expenses",
  "tables",
  "kitchen_orders",
  "subscription_plans",
  "subscriptions",
  "activity_log",
  "returns",
  "return_items",
  "sync_queue",
  "cash_drawer_operations",
  "warehouses",
  "warehouse_transfers",
  "product_batches",
  "inventory_movements",
  "stock_counts",
  "stock_count_items",
  "supplier_contracts",
  "employee_commissions",
  "tenant_subscriptions",
  "license_keys",
  "tenant_notifications",
  "platform_settings",
  "platform_commissions",
  "online_orders",
  "landing_page_config",
  "vehicles",
  "printer_configs",
  "daily_closings",
  "monthly_closings",
  "daily_sequences",
];

const CLEAR_ORDER = [...INSERT_ORDER].reverse();
const BATCH_SIZE = 300;

function toMySqlValue(value, fieldInfo) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (fieldInfo?.Type?.toLowerCase().includes("json")) {
    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return value;
      } catch {
        return JSON.stringify(value);
      }
    }
  }

  return value;
}

async function getMySqlTableInfo(conn, tableName) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return rows;
}

async function getPgRowCount(client, tableName) {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
  return result.rows[0]?.count || 0;
}

async function fetchPgRows(client, tableName, hasId) {
  const orderBy = hasId ? ' ORDER BY "id"' : "";
  const result = await client.query(`SELECT * FROM "${tableName}"${orderBy}`);
  return result.rows;
}

async function tableExistsInPg(client, tableName) {
  const result = await client.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function tableExistsInMySql(conn, tableName) {
  const [rows] = await conn.query("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
}

async function clearDestinationTable(conn, tableName) {
  await conn.query(`DELETE FROM \`${tableName}\``);
}

async function resetAutoIncrement(conn, tableName) {
  const [rows] = await conn.query(`SELECT COALESCE(MAX(\`id\`), 0) + 1 AS nextId FROM \`${tableName}\``);
  const nextId = Number(rows[0]?.nextId || 1);
  await conn.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${Math.max(nextId, 1)}`);
}

async function insertRows(conn, tableName, rows, tableInfo) {
  if (rows.length === 0) return 0;

  const validColumns = new Set(tableInfo.map((column) => column.Field));
  const sourceColumns = Object.keys(rows[0]).filter((column) => validColumns.has(column));
  if (sourceColumns.length === 0) return 0;

  const infoByColumn = new Map(tableInfo.map((column) => [column.Field, column]));
  let inserted = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const placeholders = batch
      .map(() => `(${sourceColumns.map(() => "?").join(", ")})`)
      .join(", ");
    const values = [];

    for (const row of batch) {
      for (const column of sourceColumns) {
        values.push(toMySqlValue(row[column], infoByColumn.get(column)));
      }
    }

    const sql = `INSERT INTO \`${tableName}\` (${sourceColumns.map((column) => `\`${column}\``).join(", ")}) VALUES ${placeholders}`;
    await conn.query(sql, values);
    inserted += batch.length;
  }

  return inserted;
}

async function main() {
  const pgClient = new Client({
    connectionString: SOURCE_PG_URL,
    ssl: { rejectUnauthorized: false },
  });

  const mysqlConn = await mysql.createConnection({
    host: TARGET_MYSQL_HOST,
    port: TARGET_MYSQL_PORT,
    user: TARGET_MYSQL_USER,
    password: TARGET_MYSQL_PASSWORD,
    database: TARGET_MYSQL_DATABASE,
    charset: "utf8mb4",
    multipleStatements: false,
  });

  try {
    console.log("Connecting to PostgreSQL source...");
    await pgClient.connect();
    console.log("Connecting to MySQL target...");

    await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 0");

    console.log("Clearing destination tables...");
    for (const tableName of CLEAR_ORDER) {
      if (!(await tableExistsInMySql(mysqlConn, tableName))) continue;
      await clearDestinationTable(mysqlConn, tableName);
      process.stdout.write(`  cleared ${tableName}\n`);
    }

    const summary = [];

    console.log("Migrating tables...");
    for (const tableName of INSERT_ORDER) {
      const pgExists = await tableExistsInPg(pgClient, tableName);
      const myExists = await tableExistsInMySql(mysqlConn, tableName);

      if (!pgExists || !myExists) {
        summary.push({ tableName, sourceCount: 0, insertedCount: 0, skipped: true });
        process.stdout.write(`  skipped ${tableName}\n`);
        continue;
      }

      const tableInfo = await getMySqlTableInfo(mysqlConn, tableName);
      const hasId = tableInfo.some((column) => column.Field === "id");
      const sourceCount = await getPgRowCount(pgClient, tableName);

      if (sourceCount === 0) {
        summary.push({ tableName, sourceCount: 0, insertedCount: 0, skipped: false });
        process.stdout.write(`  ${tableName}: 0 rows\n`);
        continue;
      }

      const rows = await fetchPgRows(pgClient, tableName, hasId);
      const insertedCount = await insertRows(mysqlConn, tableName, rows, tableInfo);

      if (hasId) {
        await resetAutoIncrement(mysqlConn, tableName);
      }

      summary.push({ tableName, sourceCount, insertedCount, skipped: false });
      process.stdout.write(`  ${tableName}: ${insertedCount}/${sourceCount}\n`);
    }

    await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\nVerification:");
    for (const tableName of ["tenants", "branches", "categories", "products", "inventory", "customers", "sales", "sale_items"]) {
      if (!(await tableExistsInMySql(mysqlConn, tableName))) continue;
      const [rows] = await mysqlConn.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
      console.log(`  ${tableName}: ${rows[0].count}`);
    }

    console.log("\nDone.");
  } finally {
    try {
      await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch {}
    await mysqlConn.end();
    await pgClient.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
