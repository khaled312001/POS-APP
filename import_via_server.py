#!/usr/bin/env python3
"""
Runs ON the server via SSH exec.
Reads from Neon PG via psycopg2 and inserts into local MySQL via pymysql.
Avoids all file upload / escaping issues.
"""
import sys, json, pymysql, psycopg2, psycopg2.extras

PG_URL = "postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
DB_HOST = "127.0.0.1"
DB_NAME = "u492425110_pos"
DB_USER = "u492425110_pos"
DB_PASS = "Pass1232026*12312+123"

TABLES = [
    "super_admins","tenants","branches","employees","categories","products",
    "inventory","customers","suppliers","purchase_orders","purchase_order_items",
    "sales","sale_items","calls","shifts","notifications","expenses","tables",
    "kitchen_orders","subscription_plans","subscriptions","activity_log",
    "returns","return_items","sync_queue","cash_drawer_operations","warehouses",
    "warehouse_transfers","product_batches","inventory_movements","stock_counts",
    "stock_count_items","supplier_contracts","employee_commissions",
    "tenant_subscriptions","license_keys","tenant_notifications",
    "platform_settings","platform_commissions","online_orders",
    "landing_page_config","vehicles","printer_configs","daily_closings",
    "monthly_closings","daily_sequences",
]

print("Connecting to PostgreSQL...", flush=True)
pg = psycopg2.connect(PG_URL)
pg.autocommit = True

print("Connecting to MySQL...", flush=True)
my = pymysql.connect(
    host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME,
    charset='utf8mb4', autocommit=False,
    connect_timeout=30,
)
mycur = my.cursor()
mycur.execute("SET FOREIGN_KEY_CHECKS=0")
mycur.execute("SET NAMES utf8mb4")
my.commit()

total = 0
for table in TABLES:
    pgcur = pg.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        pgcur.execute(f'SELECT COUNT(*) FROM "{table}"')
        count = pgcur.fetchone()['count']
    except Exception as e:
        print(f"  {table}: skip ({e})", flush=True)
        continue

    if count == 0:
        print(f"  {table}: empty", flush=True)
        continue

    print(f"  {table}: {count} rows...", flush=True)

    pgcur.execute(f'SELECT * FROM "{table}"')
    rows = pgcur.fetchall()
    if not rows:
        continue

    cols = list(rows[0].keys())
    col_sql = ", ".join(f"`{c}`" for c in cols)
    placeholders = ", ".join(["%s"] * len(cols))
    insert_sql = f"INSERT IGNORE INTO `{table}` ({col_sql}) VALUES ({placeholders})"

    # Truncate first (clean slate)
    mycur.execute(f"TRUNCATE TABLE `{table}`")
    my.commit()

    batch = []
    for row in rows:
        vals = []
        for v in row.values():
            if isinstance(v, bool):
                vals.append(1 if v else 0)
            elif isinstance(v, (dict, list)):
                vals.append(json.dumps(v, ensure_ascii=False))
            else:
                vals.append(v)
        batch.append(vals)
        if len(batch) >= 500:
            mycur.executemany(insert_sql, batch)
            my.commit()
            batch = []

    if batch:
        mycur.executemany(insert_sql, batch)
        my.commit()

    # Verify
    mycur.execute(f"SELECT COUNT(*) FROM `{table}`")
    imported = mycur.fetchone()[0]
    print(f"    -> {imported} imported", flush=True)
    total += imported

mycur.execute("SET FOREIGN_KEY_CHECKS=1")
my.commit()
mycur.close(); my.close()
pg.close()
print(f"\nTotal rows imported: {total}", flush=True)
print("Done!", flush=True)
