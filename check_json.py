import pymysql, json

conn = pymysql.connect(
    host='srv2070.hstgr.io', port=3306,
    user='u492425110_pos', password='Pass1232026*12312+123',
    database='u492425110_pos', charset='utf8mb4', connect_timeout=20
)
cur = conn.cursor()

cur.execute("SELECT id, name, modifiers, variants FROM products WHERE tenant_id=24 LIMIT 5")
for row in cur.fetchall():
    pid, name, modifiers, variants = row
    print(f"Product {pid} - {name}")
    print(f"  modifiers type: {type(modifiers).__name__}, value: {repr(modifiers)[:100]}")
    print(f"  variants  type: {type(variants).__name__}, value: {repr(variants)[:100]}")
    print()

conn.close()
