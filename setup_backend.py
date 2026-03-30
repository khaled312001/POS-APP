#!/usr/bin/env python3
"""Set up and configure the Node.js backend on Hostinger"""
import paramiko

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
REMOTE_BASE = f"/home/{USER}/domains/barmagly.tech"
REMOTE_APP = f"{REMOTE_BASE}/nodejs/app"

def make_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS)
    return client

def run(ssh, cmd, desc=""):
    if desc:
        print(f"\n>> {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err and "warn" not in err.lower():
        print(f"[stderr] {err}")
    return out

def main():
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    run(ssh, f"cat {REMOTE_BASE}/nodejs/server.js", "existing server.js")
    run(ssh, f"ls -la {REMOTE_BASE}/nodejs/", "nodejs dir contents")
    run(ssh, f"head -50 {REMOTE_APP}/server_dist/index.js | grep -i 'port\\|listen\\|express\\|app'", "backend port config")

    # Check if there's a .htaccess that proxies to Node
    run(ssh, f"cat {REMOTE_BASE}/public_html/.htaccess", "main htaccess")
    run(ssh, f"cat {REMOTE_BASE}/public_html/pos/.htaccess", "pos htaccess")

    # Check if pos is a subdomain or subfolder
    run(ssh, f"ls {REMOTE_BASE}/public_html/", "public_html contents")

    # Check what port Hostinger assigns - look for PORT env
    run(ssh, f"cat {REMOTE_BASE}/nodejs/package.json", "nodejs package.json")

    # Check passenger / node app config
    run(ssh, f"find {REMOTE_BASE}/nodejs -name '*.json' -not -path '*/node_modules/*' 2>/dev/null", "json configs")

    # Look at how Hostinger starts the node app (Passenger needs specific setup)
    run(ssh, f"env | grep PORT 2>/dev/null || echo 'PORT not in env'", "PORT env var")

    # Check if there's a domain config for pos subdomain
    run(ssh, f"ls {REMOTE_BASE}/", "barmagly.tech root")

    # Check stderr.log for errors
    run(ssh, f"tail -30 {REMOTE_BASE}/nodejs/stderr.log 2>/dev/null || echo 'no stderr.log'", "stderr.log")

    # Now write the proper server.js for Hostinger Passenger
    # Hostinger Node.js uses Phusion Passenger - the app must listen on PORT env var
    print("\n\n=== Writing proper server.js for Hostinger Passenger ===")

    server_js = f"""const path = require('path');
process.chdir('{REMOTE_APP}');

// Load .env manually
const fs = require('fs');
const envFile = path.join('{REMOTE_APP}', '.env');
if (fs.existsSync(envFile)) {{
  const lines = fs.readFileSync(envFile, 'utf8').split('\\n');
  for (const line of lines) {{
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {{
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }}
  }}
}}

// Hostinger Passenger sets PORT - override with it
// The compiled server in server_dist/index.js will pick up PORT from env
console.log('Starting POS backend, PORT:', process.env.PORT);
console.log('NODE_PATH:', '{REMOTE_APP}');
console.log('Working dir:', process.cwd());

require('{REMOTE_APP}/server_dist/index.js');
"""

    with sftp.open(f"{REMOTE_BASE}/nodejs/server.js", "w") as f:
        f.write(server_js)
    print("  Wrote server.js")

    # Restart the Node.js app (touch tmp/restart.txt is the Passenger way)
    run(ssh, f"mkdir -p {REMOTE_BASE}/nodejs/tmp && touch {REMOTE_BASE}/nodejs/tmp/restart.txt", "restart Passenger app")
    run(ssh, f"ls -la {REMOTE_BASE}/nodejs/tmp/", "tmp dir")

    print("\n=== Checking if pos is a subdomain directory ===")
    # Check if pos.barmagly.tech has its own document root
    run(ssh, f"ls ~/domains/ | grep pos", "pos subdomain?")

    print("\n=== Done! Backend configured. ===")
    print("Now check: https://pos.barmagly.tech")
    print("API should be at: https://pos.barmagly.tech/api or https://barmagly.tech/api")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
