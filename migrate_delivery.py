#!/usr/bin/env python3
"""Run delivery platform migration on Hostinger MySQL."""
import paramiko, io

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"

MYSQL_HOST = "srv2070.hstgr.io"
MYSQL_USER = "u492425110_pos"
MYSQL_PASS = "Pass1232026*12312+123"
MYSQL_DB   = "u492425110_pos"

MIGRATION_SQL = """\
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE landing_page_config
  ADD COLUMN IF NOT EXISTS banner_images JSON,
  ADD COLUMN IF NOT EXISTS featured_category_ids JSON,
  ADD COLUMN IF NOT EXISTS promo_text TEXT,
  ADD COLUMN IF NOT EXISTS delivery_zones_json JSON,
  ADD COLUMN IF NOT EXISTS min_delivery_time INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_delivery_time INT DEFAULT 45,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_unit DECIMAL(5,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS loyalty_redemption_rate DECIMAL(5,2) DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS enable_loyalty TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS enable_scheduled_orders TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS enable_promos TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS enable_wallet TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS logomark TEXT,
  ADD COLUMN IF NOT EXISTS header_bg_image TEXT,
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS default_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS default_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS phone_placeholder TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS has_account TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders_delivery INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders_pickup INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';

ALTER TABLE online_orders
  ADD COLUMN IF NOT EXISTS driver_id INT,
  ADD COLUMN IF NOT EXISTS scheduled_at DATETIME,
  ADD COLUMN IF NOT EXISTS promo_code_id INT,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS driver_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS rider_picked_up_at DATETIME,
  ADD COLUMN IF NOT EXISTS rider_delivered_at DATETIME,
  ADD COLUMN IF NOT EXISTS rating INT,
  ADD COLUMN IF NOT EXISTS rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS floor TEXT,
  ADD COLUMN IF NOT EXISTS building_name TEXT,
  ADD COLUMN IF NOT EXISTS address_notes TEXT,
  ADD COLUMN IF NOT EXISTS saved_address_id INT,
  ADD COLUMN IF NOT EXISTS wallet_amount_used DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned INT DEFAULT 0;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS employee_id INT,
  ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS current_lng DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS location_updated_at DATETIME,
  ADD COLUMN IF NOT EXISTS driver_status TEXT DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS driver_rating DECIMAL(3,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS total_deliveries INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_order_id INT,
  ADD COLUMN IF NOT EXISTS device_token TEXT,
  ADD COLUMN IF NOT EXISTS driver_access_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  tenant_id INT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  street TEXT NOT NULL,
  building_name TEXT,
  floor TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  notes TEXT,
  is_default TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  code VARCHAR(32) NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_cap DECIMAL(10,2),
  usage_limit INT,
  usage_count INT DEFAULT 0,
  per_customer_limit INT DEFAULT 1,
  valid_from DATETIME,
  valid_until DATETIME,
  is_active TINYINT(1) DEFAULT 1,
  applicable_order_types JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_code_usages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  promo_code_id INT NOT NULL,
  customer_id INT,
  order_id INT,
  discount_applied DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  order_id INT,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  speed DECIMAL(5,2),
  heading INT,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  tenant_id INT NOT NULL,
  order_id INT,
  type TEXT NOT NULL,
  points INT NOT NULL,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  tenant_id INT NOT NULL,
  order_id INT,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_ratings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  customer_id INT,
  driver_id INT,
  food_rating INT,
  delivery_rating INT,
  overall_rating INT NOT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  tenant_id INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  device_info TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  tenant_id INT NOT NULL,
  otp VARCHAR(8) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT DEFAULT 0,
  verified TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  branch_id INT,
  name TEXT NOT NULL,
  name_ar TEXT,
  polygon JSON,
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  radius_km DECIMAL(5,2),
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  estimated_minutes INT DEFAULT 30,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS=1;
SELECT 'Migration complete!' AS status;
"""

def run(ssh, cmd, desc=""):
    if desc:
        print(f"\n>> {desc}")
    _, out, err = ssh.exec_command(cmd)
    o = out.read().decode().strip()
    e = err.read().decode().strip()
    if o:
        print(o)
    if e and "warn" not in e.lower():
        print(f"[err] {e[:500]}")
    return o

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

# Upload migration SQL
with sftp.open("/tmp/delivery_migration.sql", "w") as f:
    f.write(MIGRATION_SQL)
print("Migration SQL uploaded to /tmp/delivery_migration.sql")

# Write mysql config to avoid password in command line
mysql_cfg = f"[client]\nhost={MYSQL_HOST}\nuser={MYSQL_USER}\npassword={MYSQL_PASS}\ndatabase={MYSQL_DB}\n"
with sftp.open("/tmp/my_delivery.cnf", "w") as f:
    f.write(mysql_cfg)

sftp.close()

# Run migration using config file
run(ssh, "mysql --defaults-file=/tmp/my_delivery.cnf < /tmp/delivery_migration.sql 2>&1", "Running migration")

# Verify
run(ssh, "mysql --defaults-file=/tmp/my_delivery.cnf -e 'SHOW TABLES;' 2>&1", "All tables after migration")

# Check a few key new tables
run(ssh,
    "mysql --defaults-file=/tmp/my_delivery.cnf "
    "-e 'SHOW COLUMNS FROM landing_page_config LIKE \"banner%\";' 2>&1",
    "banner_images column check")

run(ssh,
    "mysql --defaults-file=/tmp/my_delivery.cnf "
    "-e 'SHOW COLUMNS FROM online_orders LIKE \"tracking%\";' 2>&1",
    "tracking_token column check")

# Clean up temp files
run(ssh, "rm -f /tmp/delivery_migration.sql /tmp/my_delivery.cnf", "cleanup temp files")

ssh.close()
print("\nDone!")
