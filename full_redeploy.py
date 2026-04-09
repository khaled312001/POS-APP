#!/usr/bin/env python3
"""
Full redeploy - put POS app OUTSIDE of nodejs/ to avoid auto-deploy wipes.
Location: ~/pos-app/ (independent directory)
"""
import paramiko
import os
import time

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
HOME = f"/home/{USER}"
POS_APP  = f"{HOME}/pos-app"          # NEW safe location
POS_NODE = f"{HOME}/domains/barmagly.tech/pos-nodejs"
POS_STATIC = f"{HOME}/domains/barmagly.tech/public_html/pos"
POS_API = f"{POS_STATIC}/api"
LOCAL_DIST = r"f:\POS-APP\dist"
LOCAL_UPLOADS = r"f:\POS-APP\uploads"
LOCAL_SOUNDS = r"f:\POS-APP\public\sounds"
LOCAL_STORE = r"f:\POS-APP\store"

STORE_REWRITE_BLOCK = """# Barmagly store route support
RewriteEngine On
RewriteRule ^store/([^/]+)/?$ /api/store/$1 [L,QSA]
"""

NEW_ENV = """DATABASE_URL=postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
PGDATABASE=neondb
PGHOST=ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_HFhrVY7sSDp3
PGHOST_UNPOOLED=ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech
POSTGRES_URL=postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb
NODE_ENV=production
CALLER_ID_BRIDGE_SECRET=fritzbridge-secret-change-me
"""

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS)
    return c

def run(ssh, cmd, desc="", timeout=60):
    if desc: print(f"\n>> {desc}")
    transport = ssh.get_transport()
    chan = transport.open_session()
    chan.settimeout(timeout)
    chan.exec_command(cmd)
    out = b""
    err = b""
    while not chan.exit_status_ready():
        if chan.recv_ready():
            out += chan.recv(4096)
        if chan.recv_stderr_ready():
            err += chan.recv_stderr(4096)
        time.sleep(0.1)
    out += chan.recv(65536)
    err += chan.recv_stderr(65536)
    out = out.decode('utf-8', errors='replace').strip()
    err = err.decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err and len(err) < 2000:
        relevant = [l for l in err.split('\n') if 'error' in l.lower() or 'ERR' in l or 'fail' in l.lower()]
        if relevant:
            print(f"[err] " + '\n'.join(relevant[:5]))
    return out

def upload_dir(sftp, local_dir, remote_dir):
    try: sftp.mkdir(remote_dir)
    except: pass
    count = 0
    for item in os.listdir(local_dir):
        lp = os.path.join(local_dir, item)
        rp = remote_dir + "/" + item
        if os.path.isdir(lp):
            count += upload_dir(sftp, lp, rp)
        else:
            sftp.put(lp, rp)
            count += 1
            if count % 20 == 0: print(f"    {count} files...")
    return count

def ensure_root_store_rewrite(sftp):
    root_htaccess_path = f"{HOME}/domains/barmagly.tech/public_html/.htaccess"
    try:
        with sftp.open(root_htaccess_path, "r") as f:
            current = f.read().decode("utf-8", "ignore")
    except Exception:
        current = ""

    if "RewriteRule ^store/([^/]+)/?$ /api/store/$1 [L,QSA]" in current:
        print("  Root /store rewrite already present")
        return

    updated = current.rstrip() + "\n\n" + STORE_REWRITE_BLOCK
    with sftp.open(root_htaccess_path, "w") as f:
        f.write(updated)
    print("  Root /store rewrite added")

def main():
    print("=== Connecting ===")
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    print("\n=== Ensure root /store rewrite ===")
    ensure_root_store_rewrite(sftp)

    # ── Step 1: Clone repo to ~/pos-app/ ─────────────────────────────────
    print("\n=== Step 1: Check/clone repo to ~/pos-app/ ===")
    run(ssh, f"ls {POS_APP}/server_dist/ 2>/dev/null && echo 'EXISTS' || echo 'MISSING'", "check existing")

    existing = run(ssh, f"test -d {POS_APP}/server_dist && echo yes || echo no")
    if "no" in existing or not existing:
        print("  Cloning repo...")
        run(ssh, f"rm -rf {POS_APP} && git clone https://github.com/khaled312001/POS-APP.git {POS_APP}",
            "git clone to ~/pos-app", timeout=120)
    else:
        print("  Repo already exists, pulling latest...")
        run(ssh, f"cd {POS_APP} && git pull", "git pull")

    run(ssh, f"ls {POS_APP}/server_dist/", "server_dist check")

    # ── Step 2: Install ONLY server-side deps (skip Expo/build) ──────────
    print("\n=== Step 2: npm install (server deps only) ===")
    # Check if node_modules has express already
    has_express = run(ssh, f"test -d {POS_APP}/node_modules/express && echo yes || echo no")
    if "no" in has_express:
        print("  Installing... (this takes ~2 min)")
        run(ssh,
            f"export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH && "
            f"cd {POS_APP} && "
            f"npm install --legacy-peer-deps --ignore-scripts 2>&1 | tail -5",
            "npm install --ignore-scripts", timeout=300)
        # Run patch-package manually (safe, no build)
        run(ssh,
            f"export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH && "
            f"cd {POS_APP} && node node_modules/.bin/patch-package 2>&1 || true",
            "patch-package")
    else:
        print("  node_modules already installed")

    run(ssh, f"ls {POS_APP}/node_modules/express 2>/dev/null && echo 'express OK' || echo 'NO express'", "express check")
    run(ssh, f"ls {POS_APP}/node_modules/bcrypt 2>/dev/null && echo 'bcrypt OK' || echo 'NO bcrypt'", "bcrypt check")

    # ── Step 3: Write .env ─────────────────────────────────────────────
    print("\n=== Step 3: Write .env ===")
    with sftp.open(f"{POS_APP}/.env", "w") as f:
        f.write(NEW_ENV)
    print("  .env written with new Neon DB")

    # ── Step 4: Upload dist/ to pos-app/dist/ ────────────────────────────
    print("\n=== Step 4: Upload dist/ to pos-app/dist/ ===")
    run(ssh, f"rm -rf {POS_APP}/dist && mkdir -p {POS_APP}/dist", "clear old dist")
    total = upload_dir(sftp, LOCAL_DIST, f"{POS_APP}/dist")
    print(f"  Uploaded {total} files")

    # Also copy to public_html/pos for static fallback
    run(ssh, f"rm -rf {POS_STATIC}/* {POS_STATIC}/.[!.]*", "clear public_html/pos")
    run(ssh, f"cp -r {POS_APP}/dist/* {POS_STATIC}/", "copy to public_html/pos")

    if os.path.isdir(LOCAL_UPLOADS):
        print("\n=== Step 4b: Upload uploads/ → public_html/pos/uploads/ ===")
        total = upload_dir(sftp, LOCAL_UPLOADS, f"{POS_STATIC}/uploads")
        print(f"  Uploaded {total} upload files")

    if os.path.isdir(LOCAL_SOUNDS):
        print("\n=== Step 4c: Upload public/sounds/ → public_html/pos/sounds/ ===")
        total = upload_dir(sftp, LOCAL_SOUNDS, f"{POS_STATIC}/sounds")
        print(f"  Uploaded {total} sound files")

    if os.path.isdir(LOCAL_STORE):
        print("\n=== Step 4d: Upload store/ → public_html/pos/store/ ===")
        total = upload_dir(sftp, LOCAL_STORE, f"{POS_STATIC}/store")
        print(f"  Uploaded {total} store files")

    # ── Step 5: Test server manually ──────────────────────────────────────
    print("\n=== Step 5: Test server_dist manually ===")
    test_out = run(ssh,
        f"export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH && "
        f"cd {POS_APP} && "
        f"cat .env | grep -v '^#' | grep '=' | while read line; do export \"$line\"; done; "
        f"PORT=9999 timeout 4 node server_dist/index.js 2>&1 || true",
        "manual test (4s timeout)", timeout=10)

    # ── Step 6: Write pos-nodejs/server.js pointing to new location ───────
    print("\n=== Step 6: Write server.js ===")
    run(ssh, f"mkdir -p {POS_NODE}/tmp", "ensure pos-nodejs/tmp exists")

    server_js = f"""'use strict';
const path = require('path');
const fs   = require('fs');
const LOG  = '{POS_NODE}/startup.log';

function log(msg) {{
  fs.appendFileSync(LOG, new Date().toISOString() + ' ' + msg + '\\n');
  console.log(msg);
}}

process.on('uncaughtException', (err) => {{
  fs.appendFileSync('{POS_NODE}/error.log', new Date().toISOString() + '\\n' + err.stack + '\\n');
  process.exit(1);
}});

// ── Load .env ──────────────────────────────────────────────────────────
const envFile = '{POS_APP}/.env';
if (fs.existsSync(envFile)) {{
  const lines = fs.readFileSync(envFile, 'utf8').split('\\n');
  for (const line of lines) {{
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const idx = t.indexOf('=');
    const key = t.substring(0, idx).trim();
    const val = t.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }}
  log('Loaded .env OK');
}} else {{
  log('WARNING: .env not found at ' + envFile);
}}

log('PORT=' + process.env.PORT);
log('DB set=' + !!process.env.DATABASE_URL);

// ── Set working dir so require() finds node_modules ───────────────────
process.chdir('{POS_APP}');
log('cwd=' + process.cwd());

// ── Start server ──────────────────────────────────────────────────────
log('Loading server_dist/index.js...');
require('{POS_APP}/server_dist/index.js');
log('server_dist loaded');
"""
    with sftp.open(f"{POS_NODE}/server.js", "w") as f:
        f.write(server_js)
    print("  server.js written")

    # ── Step 7: Update .htaccess ───────────────────────────────────────────
    print("\n=== Step 7: Write .htaccess ===")
    htaccess = f"""# Passenger config for POS Node.js backend
PassengerAppRoot {POS_NODE}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs20/root/usr/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir {POS_NODE}/tmp

RewriteEngine On
RewriteRule .* - [L]
"""
    with sftp.open(f"{POS_STATIC}/.htaccess", "w") as f:
        f.write(htaccess)
    print("  .htaccess written")

    api_htaccess = f"""PassengerAppRoot {POS_NODE}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /api
PassengerRestartDir {POS_NODE}/tmp
SetEnv NODE_ENV=production
"""
    run(ssh, f"mkdir -p {POS_API}", "create /api mount dir")
    with sftp.open(f"{POS_API}/.htaccess", "w") as f:
        f.write(api_htaccess)
    print("  /api Passenger mount written")

    # ── Step 8: Clear logs and restart ────────────────────────────────────
    run(ssh, f"rm -f {POS_NODE}/startup.log {POS_NODE}/error.log", "clear logs")
    run(ssh, f"touch {POS_NODE}/tmp/restart.txt", "restart Passenger")

    print("\n=== Waiting 8s for Passenger to start ===")
    time.sleep(8)

    run(ssh, f"cat {POS_NODE}/startup.log 2>/dev/null || echo 'no startup.log'", "startup.log")
    run(ssh, f"cat {POS_NODE}/error.log 2>/dev/null || echo 'no errors'", "error.log")

    print("\n=== DONE ===")
    print("Check: https://pos.barmagly.tech/")
    print("API:   https://pos.barmagly.tech/api/health")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
