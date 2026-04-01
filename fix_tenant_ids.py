import pymysql

conn = pymysql.connect(
    host='srv2070.hstgr.io', port=3306,
    user='u492425110_pos', password='Pass1232026*12312+123',
    database='u492425110_pos', charset='utf8mb4', autocommit=False, connect_timeout=30
)
cur = conn.cursor()

cur.execute('SELECT id, business_name FROM tenants LIMIT 1')
row = cur.fetchone()
tid, tname = row
print(f'Tenant: {tid} = {tname}')

tables = [
    'branches', 'employees', 'categories', 'products', 'customers',
    'calls', 'suppliers', 'expenses', 'vehicles', 'printer_configs',
    'daily_closings', 'monthly_closings', 'online_orders',
    'landing_page_config', 'platform_commissions', 'tenant_notifications',
]

for table in tables:
    try:
        sql = f'UPDATE `{table}` SET tenant_id = %s WHERE tenant_id IS NULL'
        cur.execute(sql, (tid,))
        conn.commit()
        print(f'  {table}: fixed {cur.rowcount} rows')
    except Exception as e:
        conn.rollback()
        print(f'  {table}: ERROR {e}')

cur.execute('SELECT COUNT(*) FROM products WHERE tenant_id IS NOT NULL')
print(f'\nProducts with tenant_id: {cur.fetchone()[0]}')
cur.execute('SELECT COUNT(*) FROM products WHERE tenant_id IS NULL')
print(f'Products with NULL tenant_id: {cur.fetchone()[0]}')
cur.execute('SELECT COUNT(*) FROM categories WHERE tenant_id IS NOT NULL')
print(f'Categories with tenant_id: {cur.fetchone()[0]}')
cur.execute('SELECT COUNT(*) FROM customers WHERE tenant_id IS NOT NULL')
print(f'Customers with tenant_id: {cur.fetchone()[0]}')

conn.close()
print('\nDone!')
