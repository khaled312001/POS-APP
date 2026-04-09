#!/usr/bin/env python3
"""
deploy_delivery.py
Deploys the Barmagly Delivery Platform to Hostinger:
  1. Uploads server_dist/index.js (rebuilt with delivery routes)
  2. Uploads delivery-app/ (SPA + Driver PWA + Track page)
  3. Writes production .env on server
  4. Updates .htaccess to proxy delivery routes to Express on port 5001
  5. Starts / restarts Express server on port 5001
"""
import paramiko
import os
import sys
import time

# ── Connection ────────────────────────────────────────────────────────────────
HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"

# ── Remote paths ──────────────────────────────────────────────────────────────
REMOTE_BASE   = f"/home/{USER}/pos-app"
REMOTE_PUBLIC = f"/home/{USER}/domains/barmagly.tech/public_html"
REMOTE_NODE   = f"/opt/alt/alt-nodejs22/root/usr/bin/node"

# ── Local paths ───────────────────────────────────────────────────────────────
LOCAL_BASE    = r"F:\POS-APP"
LOCAL_DIST    = os.path.join(LOCAL_BASE, "server_dist", "index.js")
LOCAL_DELIVERY= os.path.join(LOCAL_BASE, "delivery-app")

# ── Production .env for Hostinger ─────────────────────────────────────────────
PROD_ENV = """DATABASE_URL=postgresql://neondb_owner:npg_8R6gJNZOYucp@ep-frosty-flower-anxqai6v-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
PGDATABASE=neondb
PGHOST=ep-frosty-flower-anxqai6v-pooler.c-6.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_8R6gJNZOYucp
PGHOST_UNPOOLED=ep-frosty-flower-anxqai6v.c-6.us-east-1.aws.neon.tech
POSTGRES_URL=postgresql://neondb_owner:npg_8R6gJNZOYucp@ep-frosty-flower-anxqai6v-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_8R6gJNZOYucp@ep-frosty-flower-anxqai6v.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_8R6gJNZOYucp@ep-frosty-flower-anxqai6v-pooler.c-6.us-east-1.aws.neon.tech/neondb

PORT=5001
NODE_ENV=production

CALLER_ID_BRIDGE_SECRET=fritzbridge-secret-change-me

MYSQL_HOST=srv2070.hstgr.io
MYSQL_PORT=3306
MYSQL_USER=u492425110_pos
MYSQL_PASSWORD=Pass1232026*12312+123
MYSQL_DATABASE=u492425110_pos
DEFAULT_CURRENCY=EGP
"""

# ── .htaccess for barmagly.tech/public_html ───────────────────────────────────
# Proxies API + delivery routes to Express on port 5001
# Everything else served by Passenger (Next.js)
HTACCESS = """# barmagly.tech — main domain .htaccess
# Express on port 5001 handles API + delivery routes
# Passenger handles the Next.js app for everything else

RewriteEngine On

# ── Express proxy rules ────────────────────────────────────────────────────
# API
RewriteCond %{REQUEST_URI} ^/api/ [OR]
RewriteCond %{REQUEST_URI} ^/api$
RewriteRule ^(.*)$ http://127.0.0.1:5001/$1 [P,L]

# Online store / delivery customer SPA
RewriteCond %{REQUEST_URI} ^/order/
RewriteRule ^(.*)$ http://127.0.0.1:5001/$1 [P,L]

# Public order tracking page
RewriteCond %{REQUEST_URI} ^/track/
RewriteRule ^(.*)$ http://127.0.0.1:5001/$1 [P,L]

# Driver PWA
RewriteCond %{REQUEST_URI} ^/driver/
RewriteRule ^(.*)$ http://127.0.0.1:5001/$1 [P,L]

# Restaurant listing
RewriteCond %{REQUEST_URI} ^/restaurants
RewriteRule ^(.*)$ http://127.0.0.1:5001/$1 [P,L]

# Static delivery-app assets served directly
RewriteCond %{REQUEST_URI} ^/delivery-assets/
RewriteRule ^delivery-assets/(.*)$ /delivery-app/$1 [L]

# ── Passenger (Next.js) for everything else ────────────────────────────────
# (Passenger config is in the nodejs/ directory — handled by cPanel)
"""

# ─────────────────────────────────────────────────────────────────────────────

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    return c

def run(ssh, cmd, desc="", ignore_err=False):
    if desc:
        print(f"\n>> {desc}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err and not ignore_err:
        low = err.lower()
        if not any(x in low for x in ["warn", "npm warn", "deprecated"]):
            print(f"[stderr] {err[:500]}")
    return out

def upload_file(sftp, local_path, remote_path):
    remote_dir = remote_path.rsplit("/", 1)[0]
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        run_mkdir(sftp, remote_dir)
    sftp.put(local_path, remote_path)

def run_mkdir(sftp, path):
    """Recursively create remote directory."""
    parts = path.split("/")
    current = ""
    for part in parts:
        if not part:
            current = "/"
            continue
        current = current.rstrip("/") + "/" + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass

def upload_dir(sftp, local_dir, remote_dir, verbose=True):
    run_mkdir(sftp, remote_dir)
    count = 0
    for item in os.listdir(local_dir):
        lp = os.path.join(local_dir, item)
        rp = remote_dir + "/" + item
        if os.path.isdir(lp):
            count += upload_dir(sftp, lp, rp, verbose=False)
        else:
            sftp.put(lp, rp)
            count += 1
            if verbose and count % 10 == 0:
                print(f"    {count} files uploaded...")
    return count

def main():
    print("=" * 60)
    print("  Barmagly Delivery Platform — Hostinger Deploy")
    print("=" * 60)

    print("\n[1/7] Connecting to SSH...")
    ssh = make_ssh()
    sftp = ssh.open_sftp()
    print(f"  Connected to {HOST}:{PORT}")

    # ── Step 1: Verify remote structure ──────────────────────────────────────
    print("\n[2/7] Verifying remote structure...")
    run(ssh, f"ls {REMOTE_BASE}/", "pos-app contents")
    run(ssh, f"node --version 2>&1 || {REMOTE_NODE} --version", "Node.js version")

    # ── Step 2: Upload server_dist/index.js ───────────────────────────────────
    print("\n[3/7] Uploading server_dist/index.js...")
    remote_dist = f"{REMOTE_BASE}/server_dist/index.js"
    run(ssh, f"mkdir -p {REMOTE_BASE}/server_dist", "ensure server_dist dir")
    sftp.put(LOCAL_DIST, remote_dist)
    size = os.path.getsize(LOCAL_DIST) // 1024
    print(f"  Uploaded server_dist/index.js ({size} KB)")

    # ── Step 3: Upload delivery-app/ ──────────────────────────────────────────
    print("\n[4/7] Uploading delivery-app/...")
    remote_delivery = f"{REMOTE_BASE}/delivery-app"
    # Remove old and re-upload
    run(ssh, f"rm -rf {remote_delivery}", "remove old delivery-app", ignore_err=True)
    run_mkdir(sftp, remote_delivery)
    total = upload_dir(sftp, LOCAL_DELIVERY, remote_delivery, verbose=True)
    print(f"  Uploaded {total} files to {remote_delivery}/")

    # ── Step 4: Write production .env ─────────────────────────────────────────
    print("\n[5/7] Writing production .env...")
    remote_env = f"{REMOTE_BASE}/.env"
    with sftp.open(remote_env, "w") as f:
        f.write(PROD_ENV)
    print(f"  Written {remote_env}")

    # ── Step 5: Update .htaccess ──────────────────────────────────────────────
    print("\n[6/7] Updating .htaccess...")
    remote_htaccess = f"{REMOTE_PUBLIC}/.htaccess"
    # Read existing .htaccess first to see what's there
    try:
        with sftp.open(remote_htaccess, "r") as f:
            existing = f.read().decode()
        print(f"  Existing .htaccess ({len(existing)} bytes) — will update")
        # Backup
        with sftp.open(remote_htaccess + ".bak", "w") as f:
            f.write(existing)
        print("  Backup saved as .htaccess.bak")
    except Exception as e:
        print(f"  No existing .htaccess or error reading: {e}")

    with sftp.open(remote_htaccess, "w") as f:
        f.write(HTACCESS)
    print(f"  Written {remote_htaccess}")

    # ── Step 6: Start / restart Express on port 5001 ──────────────────────────
    print("\n[7/7] Starting Express server on port 5001...")

    # Kill any existing process on port 5001
    run(ssh,
        "fuser -k 5001/tcp 2>/dev/null; sleep 1; echo 'old process cleared'",
        "kill old process on 5001", ignore_err=True)

    # Write a startup wrapper script
    start_script = f"""#!/bin/bash
export NODE_ENV=production
cd {REMOTE_BASE}
# Load .env
set -a
source {REMOTE_BASE}/.env
set +a
exec {REMOTE_NODE} {REMOTE_BASE}/server_dist/index.js
"""
    with sftp.open(f"{REMOTE_BASE}/start_express.sh", "w") as f:
        f.write(start_script)
    run(ssh, f"chmod +x {REMOTE_BASE}/start_express.sh", "make script executable")

    # Start in background with nohup
    run(ssh,
        f"nohup {REMOTE_BASE}/start_express.sh > {REMOTE_BASE}/express.log 2>&1 &",
        "start Express server (nohup)")

    # Give it 3 seconds to start
    print("  Waiting 3 seconds for server to start...")
    time.sleep(3)

    # Check if it started
    pid_out = run(ssh, "fuser 5001/tcp 2>/dev/null", "check PID on port 5001", ignore_err=True)
    if pid_out:
        print(f"  Express is running on port 5001 (PID area: {pid_out})")
    else:
        print("  [!] Port 5001 not bound yet — checking log:")
        log_tail = run(ssh, f"tail -20 {REMOTE_BASE}/express.log", "express.log tail")
        if not log_tail:
            print("  (log empty — process may still be initializing)")

    # ── Verify ─────────────────────────────────────────────────────────────────
    print("\n=== Verification ===")
    run(ssh, f"ls -la {REMOTE_BASE}/delivery-app/ | head -20", "delivery-app structure")
    run(ssh, f"ls -la {REMOTE_BASE}/server_dist/", "server_dist contents")
    run(ssh,
        "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5001/api/health 2>/dev/null || echo 'curl failed'",
        "health check via curl")
    run(ssh, f"tail -5 {REMOTE_BASE}/express.log", "last 5 lines of express.log")

    sftp.close()
    ssh.close()

    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE")
    print("=" * 60)
    print("  Delivery app:     https://barmagly.tech/order/{slug}")
    print("  Public tracking:  https://barmagly.tech/track/{token}")
    print("  Driver PWA:       https://barmagly.tech/driver/{token}")
    print("  API health:       https://barmagly.tech/api/health")
    print("  Express log:      tail -f ~/pos-app/express.log  (via SSH)")

if __name__ == "__main__":
    main()
