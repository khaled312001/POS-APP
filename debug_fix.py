#!/usr/bin/env python3
import paramiko

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
BASE = f"/home/{USER}/domains/barmagly.tech"
APP  = f"{BASE}/nodejs/app"
POS_NODE = f"{BASE}/pos-nodejs"
POS_STATIC = f"{BASE}/public_html/pos"

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
PORT=3000
NODE_ENV=production
CALLER_ID_BRIDGE_SECRET=fritzbridge-secret-change-me
"""

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS)
    return c

def run(ssh, cmd, desc=""):
    if desc: print(f"\n>> {desc}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"[err] {err}")
    return out

def main():
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    # ── Check Passenger error logs ─────────────────────────────────────────
    print("=== Passenger / Apache error logs ===")
    run(ssh, "cat /var/log/apache2/error.log 2>/dev/null | tail -30 || echo 'no apache log'")
    run(ssh, f"ls {POS_NODE}/tmp/", "pos-nodejs tmp")
    run(ssh, f"find {POS_NODE} -name '*.log' 2>/dev/null", "log files in pos-nodejs")
    run(ssh, f"find /home/{USER} -name 'passenger*.log' 2>/dev/null | head -5", "passenger logs")
    run(ssh, f"cat {BASE}/nodejs/stderr.log 2>/dev/null | tail -20", "nodejs stderr.log")

    # Try running server.js manually to see the error
    print("\n=== Test server.js manually ===")
    run(ssh, f"export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH && cd {APP} && timeout 5 node {POS_NODE}/server.js 2>&1 || true", "manual test")

    # ── Update .env with new DB ────────────────────────────────────────────
    print("\n=== Update .env with new database ===")
    with sftp.open(f"{APP}/.env", "w") as f:
        f.write(NEW_ENV)
    print("  .env updated with new Neon DB")

    # ── Check what's inside server_dist/index.js (how it starts) ──────────
    print("\n=== Check how server_dist listens ===")
    run(ssh, f"grep -o 'listen([^)]*' {APP}/server_dist/index.js | head -5", "listen calls")
    run(ssh, f"grep -c 'require(' {APP}/server_dist/index.js", "require count (bundled?)")
    run(ssh, f"tail -20 {APP}/server_dist/index.js", "end of index.js")

    # Check node_modules exist
    run(ssh, f"ls {APP}/node_modules | wc -l", "node_modules count")
    run(ssh, f"ls {APP}/node_modules/express 2>/dev/null && echo 'express ok' || echo 'NO express'", "express check")
    run(ssh, f"ls {APP}/node_modules/bcrypt 2>/dev/null && echo 'bcrypt ok' || echo 'NO bcrypt'", "bcrypt check")

    # ── Rewrite server.js to be more robust ───────────────────────────────
    print("\n=== Rewrite server.js with better error handling ===")
    server_js = f"""'use strict';
const path = require('path');
const fs   = require('fs');

process.on('uncaughtException', (err) => {{
  fs.appendFileSync('{POS_NODE}/error.log', new Date().toISOString() + ' ' + err.stack + '\\n');
  process.exit(1);
}});

// ── Load .env ──────────────────────────────────────────────────────────
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

// Passenger sets PORT — make sure server_dist uses it
// PORT from .env is 3000, Passenger overrides with its own port
const passengerPort = process.env.PORT;
fs.appendFileSync('{POS_NODE}/startup.log', new Date().toISOString() + ' PORT=' + passengerPort + '\\n');

// Set working dir so require() finds node_modules
process.chdir('{APP}');

fs.appendFileSync('{POS_NODE}/startup.log', 'Loading server_dist/index.js\\n');
require('{APP}/server_dist/index.js');
fs.appendFileSync('{POS_NODE}/startup.log', 'server_dist loaded OK\\n');
"""
    with sftp.open(f"{POS_NODE}/server.js", "w") as f:
        f.write(server_js)
    print("  server.js rewritten with error logging")

    # ── Touch restart ──────────────────────────────────────────────────────
    run(ssh, f"touch {POS_NODE}/tmp/restart.txt", "restart Passenger")

    print("\n=== Wait 5s then check startup.log ===")
    import time
    time.sleep(6)
    run(ssh, f"cat {POS_NODE}/startup.log 2>/dev/null || echo 'no startup.log yet'", "startup.log")
    run(ssh, f"cat {POS_NODE}/error.log 2>/dev/null || echo 'no error.log'", "error.log")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
