#!/usr/bin/env python3
"""
Full POS deployment on Hostinger for pos.barmagly.tech
- Creates pos-nodejs/ dir with server.js entry point
- Moves dist/ files to app/dist/ (where Express expects them)
- Configures Passenger in public_html/pos/.htaccess
"""
import paramiko
import os
import sys

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
BASE  = f"/home/{USER}/domains/barmagly.tech"
APP   = f"{BASE}/nodejs/app"
POS_NODE = f"{BASE}/pos-nodejs"
POS_STATIC = f"{BASE}/public_html/pos"
POS_API = f"{POS_STATIC}/api"
LOCAL_DIST = r"f:\POS-APP\dist"
LOCAL_UPLOADS = r"f:\POS-APP\uploads"
LOCAL_SOUNDS = r"f:\POS-APP\public\sounds"

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS)
    return c

def run(ssh, cmd, desc=""):
    if desc:
        print(f"\n>> {desc}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err and "warn" not in err.lower() and "npm" not in err.lower():
        print(f"[err] {err}")
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
            if count % 20 == 0:
                print(f"    {count} files uploaded...")
    return count

def main():
    print("=== Connecting ===")
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    # ── Step 1: Move dist files to app/dist/ ──────────────────────────────
    print("\n=== Step 1: Upload dist/ → app/dist/ ===")
    run(ssh, f"rm -rf {APP}/dist && mkdir -p {APP}/dist", "clearing old dist")
    total = upload_dir(sftp, LOCAL_DIST, f"{APP}/dist")
    print(f"  Uploaded {total} files to {APP}/dist/")

    # Also keep a copy in public_html/pos for direct static fallback
    run(ssh, f"rm -rf {POS_STATIC}/* {POS_STATIC}/.[!.]*", "clearing public_html/pos")
    run(ssh, f"cp -r {APP}/dist/* {POS_STATIC}/", "copy dist to public_html/pos")

    if os.path.isdir(LOCAL_UPLOADS):
        print("\n=== Step 1b: Upload uploads/ → public_html/pos/uploads/ ===")
        total = upload_dir(sftp, LOCAL_UPLOADS, f"{POS_STATIC}/uploads")
        print(f"  Uploaded {total} upload files")

    if os.path.isdir(LOCAL_SOUNDS):
        print("\n=== Step 1c: Upload public/sounds/ → public_html/pos/sounds/ ===")
        total = upload_dir(sftp, LOCAL_SOUNDS, f"{POS_STATIC}/sounds")
        print(f"  Uploaded {total} sound files")

    # ── Step 2: Create pos-nodejs/ directory ─────────────────────────────
    print("\n=== Step 2: Create pos-nodejs/ ===")
    run(ssh, f"mkdir -p {POS_NODE}/tmp", "create pos-nodejs dir")

    # ── Step 3: Write server.js ───────────────────────────────────────────
    print("\n=== Step 3: Write server.js ===")
    server_js = f"""'use strict';
const path = require('path');
const fs   = require('fs');

// ── Load .env ────────────────────────────────────────────────────────────
const envFile = '{APP}/.env';
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
}}

// ── Set working directory so require() resolves node_modules ─────────────
process.chdir('{APP}');

console.log('[POS] Starting server on PORT=' + process.env.PORT);
console.log('[POS] NODE_ENV=' + process.env.NODE_ENV);
console.log('[POS] DATABASE_URL set:', !!process.env.DATABASE_URL);

// ── Start the compiled Express server ────────────────────────────────────
require('{APP}/server_dist/index.js');
"""
    with sftp.open(f"{POS_NODE}/server.js", "w") as f:
        f.write(server_js)
    print(f"  Written {POS_NODE}/server.js")

    # ── Step 4: Update .htaccess for pos.barmagly.tech ───────────────────
    print("\n=== Step 4: Write .htaccess for pos.barmagly.tech ===")
    htaccess = f"""# Passenger config — POS Node.js backend
PassengerAppRoot {POS_NODE}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs20/root/usr/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir {POS_NODE}/tmp

# Forward everything to Node.js (Passenger handles it)
RewriteEngine On
RewriteRule .* - [L]
"""
    with sftp.open(f"{POS_STATIC}/.htaccess", "w") as f:
        f.write(htaccess)
    print(f"  Written {POS_STATIC}/.htaccess")

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
    print(f"  Written {POS_API}/.htaccess")

    # ── Step 5: Touch restart.txt to trigger Passenger reload ────────────
    print("\n=== Step 5: Restart Passenger ===")
    run(ssh, f"touch {POS_NODE}/tmp/restart.txt", "touch restart.txt")

    # ── Step 6: Verify everything ─────────────────────────────────────────
    print("\n=== Step 6: Verify ===")
    run(ssh, f"ls -la {POS_NODE}/", "pos-nodejs contents")
    run(ssh, f"ls {APP}/dist/ | head -10", "app/dist contents")
    run(ssh, f"cat {POS_STATIC}/.htaccess", "final .htaccess")
    run(ssh, f"head -5 {POS_NODE}/server.js", "server.js head")

    print("\n=== DONE ===")
    print("Visit: https://pos.barmagly.tech/")
    print("POS app: https://pos.barmagly.tech/app")
    print("API: https://pos.barmagly.tech/api/health")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
