#!/usr/bin/env python3
"""
Export all data from Neon PostgreSQL and import into Hostinger MySQL.
Runs locally: reads PG (psycopg2) → generates SQL → uploads → executes via SSH.
"""
import psycopg2
import psycopg2.extras
import paramiko
import json
import io
import re
import time

# ── Neon PostgreSQL ─────────────────────────────────────────────────
PG_URL = "postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

# ── Hostinger SSH ───────────────────────────────────────────────────
SSH_HOST = "82.198.227.175"; SSH_PORT = 65002
SSH_USER = "u492425110";     SSH_PASS = "support@Passord123"

# ── MySQL credentials ───────────────────────────────────────────────
DB_NAME = "u492425110_pos"
DB_USER = "u492425110_pos"
DB_PASS = "Pass1232026*12312+123"

# Tables in dependency order (parents before children)
TABLES = [
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
]

def escape_mysql_str(val):
    """Escape a string value for MySQL INSERT."""
    if val is None:
        return "NULL"
    s = str(val)
    s = s.replace("\\", "\\\\")
    s = s.replace("'", "\\'")
    s = s.replace("\0", "\\0")
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "\\r")
    s = s.replace("\x1a", "\\Z")
    return f"'{s}'"

def format_val(val):
    """Convert a Python value to a MySQL literal."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        return str(val)
    if isinstance(val, (dict, list)):
        return escape_mysql_str(json.dumps(val, ensure_ascii=False))
    # datetime
    s = str(val)
    # Trim timezone offset for MySQL datetime
    s = re.sub(r'\+\d{2}:\d{2}$', '', s).strip()
    s = re.sub(r'\.\d+$', '', s)  # remove microseconds
    return escape_mysql_str(s)

def export_table(pg_cur, table_name):
    """Read all rows from a PG table, return column names and rows."""
    try:
        pg_cur.execute(f'SELECT * FROM "{table_name}"')
        rows = pg_cur.fetchall()
        if not rows:
            return None, []
        cols = [desc[0] for desc in pg_cur.description]
        return cols, rows
    except Exception as e:
        print(f"  [skip] {table_name}: {e}")
        return None, []

def build_inserts(table_name, cols, rows):
    """Generate MySQL INSERT statements."""
    if not rows:
        return ""
    lines = []
    col_list = ", ".join(f"`{c}`" for c in cols)
    chunk = []
    for row in rows:
        vals = ", ".join(format_val(v) for v in row)
        chunk.append(f"({vals})")
        if len(chunk) >= 500:
            lines.append(f"INSERT INTO `{table_name}` ({col_list}) VALUES\n" + ",\n".join(chunk) + ";")
            chunk = []
    if chunk:
        lines.append(f"INSERT INTO `{table_name}` ({col_list}) VALUES\n" + ",\n".join(chunk) + ";")
    return "\n".join(lines)

def main():
    print("=== Connecting to Neon PostgreSQL ===")
    pg_conn = psycopg2.connect(PG_URL)
    pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    print("=== Connecting to SSH ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(5):
        try:
            ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=30)
            break
        except Exception as e:
            print(f"  SSH attempt {attempt+1} failed: {e}, retrying in 5s...")
            time.sleep(5)
    sftp = ssh.open_sftp()

    def run_ssh(cmd, desc=""):
        if desc: print(f"  >> {desc}")
        _, o, e = ssh.exec_command(cmd)
        out = o.read().decode().strip()
        err = e.read().decode().strip()
        if out: print(f"     {out[:200]}")
        if err and len(err) < 300 and 'warn' not in err.lower():
            print(f"     [err] {err[:200]}")
        return out

    # Step 1: Upload and run MySQL schema
    print("\n=== Step 1: Create MySQL tables ===")
    sftp.put(r"f:\POS-APP\mysql_schema.sql", "/home/u492425110/pos-app/mysql_schema.sql")
    run_ssh(
        f"mysql -u{DB_USER} -p'{DB_PASS}' {DB_NAME} < /home/u492425110/pos-app/mysql_schema.sql 2>&1",
        "run schema SQL"
    )
    run_ssh(f"mysql -u{DB_USER} -p'{DB_PASS}' {DB_NAME} -e 'SHOW TABLES;'", "tables created")

    # Step 2: Export each table and import
    print("\n=== Step 2: Export from PostgreSQL → Import to MySQL ===")
    total_rows = 0

    for table in TABLES:
        pg_cur2 = pg_conn.cursor()
        try:
            pg_cur2.execute(f'SELECT COUNT(*) FROM "{table}"')
            count = pg_cur2.fetchone()[0]
        except:
            count = 0

        if count == 0:
            print(f"  {table}: empty, skip")
            continue

        print(f"  {table}: {count} rows...")

        pg_cur2.execute(f'SELECT * FROM "{table}"')
        rows = pg_cur2.fetchall()
        cols = [desc[0] for desc in pg_cur2.description]

        sql_content = f"SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n"
        sql_content += build_inserts(table, cols, rows)
        sql_content += "\nSET FOREIGN_KEY_CHECKS=1;\n"

        remote_path = f"/home/u492425110/pos-app/import_{table}.sql"
        with sftp.open(remote_path, "w") as f:
            f.write(sql_content)

        run_ssh(
            f"mysql -u{DB_USER} -p'{DB_PASS}' {DB_NAME} < {remote_path} 2>&1 && rm -f {remote_path}",
        )
        total_rows += count

    print(f"\n=== Total rows imported: {total_rows} ===")

    # Step 3: Verify
    print("\n=== Step 3: Row counts in MySQL ===")
    for table in ["tenants", "branches", "employees", "categories", "products", "customers", "sales", "super_admins"]:
        out = run_ssh(f"mysql -u{DB_USER} -p'{DB_PASS}' {DB_NAME} -sN -e 'SELECT COUNT(*) FROM `{table}` 2>/dev/null' 2>/dev/null || echo 0")
        print(f"  {table}: {out.strip()}")

    sftp.close()
    ssh.close()
    pg_cur.close()
    pg_conn.close()
    print("\n=== Migration complete! ===")

if __name__ == "__main__":
    main()
