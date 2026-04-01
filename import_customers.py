#!/usr/bin/env python3
import psycopg2, paramiko, time, io, json

PG_URL = "postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
HOST = "82.198.227.175"; PORT = 65002
USER = "u492425110"; PASS = "support@Passord123"
DB_NAME = "u492425110_pos"; DB_USER = "u492425110_pos"; DB_PASS = "Pass1232026*12312+123"
POS_APP = f"/home/{USER}/pos-app"

NULL_MARKER = r"\N"

def escape_tsv(v):
    if v is None:
        return NULL_MARKER
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (dict, list)):
        s = json.dumps(v, ensure_ascii=False)
    else:
        s = str(v)
    # Escape for TSV: backslash first, then special chars
    s = s.replace('\\', '\\\\')
    s = s.replace('\t', '\\t')
    s = s.replace('\n', '\\n')
    s = s.replace('\r', '\\r')
    return s

print("=== Reading customers from PostgreSQL ===")
pg = psycopg2.connect(PG_URL)
cur = pg.cursor()
cur.execute('SELECT * FROM "customers"')
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
print(f"   {len(rows)} rows, {len(cols)} columns")

print("=== Generating TSV ===")
buf = io.StringIO()
for row in rows:
    buf.write('\t'.join(escape_tsv(v) for v in row) + '\n')
tsv_data = buf.getvalue()
print(f"   TSV size: {len(tsv_data)/1024/1024:.1f}MB")
pg.close()

print("=== Connecting to SSH ===")
for attempt in range(5):
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
        break
    except Exception as e:
        print(f"   SSH {attempt+1}: {e}"); time.sleep(5)

sftp = c.open_sftp()

print("=== Uploading TSV ===")
remote_tsv = f"{POS_APP}/customers.tsv"
with sftp.open(remote_tsv, "wb") as rf:
    rf.write(tsv_data.encode('utf-8'))
print(f"   Uploaded {len(tsv_data)/1024/1024:.1f}MB")

col_list = ", ".join(f"`{col}`" for col in cols)
bool_cols = ['is_active', 'r16', 'r17', 'r18', 'r19', 'r20']
set_clause = ', '.join(
    f'`{c}` = IF(`{c}` IN ("True","1","true"), 1, IF(`{c}` IN ("False","0","false"), 0, NULL))'
    for c in bool_cols
)

load_sql = f"""SET FOREIGN_KEY_CHECKS=0;
SET CHARACTER_SET_CLIENT=utf8mb4;
LOAD DATA LOCAL INFILE '{remote_tsv}'
  INTO TABLE `customers`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY '\\t'
  ESCAPED BY '\\\\'
  LINES TERMINATED BY '\\n'
  ({col_list})
  SET {set_clause};
SET FOREIGN_KEY_CHECKS=1;
SELECT CONCAT('Imported: ', COUNT(*), ' customers') AS result FROM customers;
"""
remote_sql = f"{POS_APP}/load_cust.sql"
with sftp.open(remote_sql, "w") as f:
    f.write(load_sql)

shell = f"""#!/bin/bash
echo "[$(date)] Starting import..."
mysql -u{DB_USER} "-p{DB_PASS}" --local-infile=1 {DB_NAME} < {remote_sql} 2>&1
echo "[$(date)] Done! Count:"
mysql -u{DB_USER} "-p{DB_PASS}" {DB_NAME} -sN -e 'SELECT COUNT(*) FROM customers' 2>&1
rm -f {remote_tsv} {remote_sql}
"""
remote_sh = f"{POS_APP}/do_cust_import.sh"
with sftp.open(remote_sh, "w") as f:
    f.write(shell)

_, o, _ = c.exec_command(f"chmod +x {remote_sh}")
o.read()

_, o, _ = c.exec_command(f"bash {remote_sh} > {POS_APP}/import.log 2>&1 &")
o.read()

sftp.close()
print("=== Import running on server, waiting 90s ===")
time.sleep(90)

# Reconnect to check
for attempt in range(3):
    try:
        c2 = paramiko.SSHClient()
        c2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c2.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
        break
    except: time.sleep(5)

_, o, _ = c2.exec_command(f"cat {POS_APP}/import.log 2>/dev/null | tail -20")
log = o.read().decode().strip()
print("Log:", log)

_, o, _ = c2.exec_command(f"mysql -u{DB_USER} '-p{DB_PASS}' {DB_NAME} -sN -e 'SELECT COUNT(*) FROM customers' 2>&1")
count = o.read().decode().strip()
print("Customer count:", count)

if count == '0' or 'error' in log.lower():
    print("\nChecking if import is still running...")
    _, o, _ = c2.exec_command("ps aux | grep mysql | grep -v grep")
    print(o.read().decode().strip())

c2.close()
print("Done!")
