#!/usr/bin/env python3
"""Deploy POS app to Hostinger server"""
import paramiko
import os
import stat
import sys

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
REMOTE_BASE = f"/home/{USER}/domains/barmagly.tech"
REMOTE_PUBLIC = f"{REMOTE_BASE}/public_html/pos"
REMOTE_APP = f"{REMOTE_BASE}/nodejs/app"
LOCAL_DIST = r"f:\POS-APP\dist"

def make_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS)
    return client

def run(ssh, cmd, desc=""):
    if desc:
        print(f"  >> {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f"  [stderr] {err}", file=sys.stderr)
    return out

def upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a local directory to remote."""
    try:
        sftp.mkdir(remote_dir)
    except:
        pass  # already exists

    count = 0
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item
        if os.path.isdir(local_path):
            count += upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            count += 1
            if count % 20 == 0:
                print(f"    uploaded {count} files...")
    return count

def main():
    print("=== Connecting to Hostinger server ===")
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    print("\n=== Checking .env file on server ===")
    run(ssh, f"cat {REMOTE_APP}/.env", "reading .env")

    print("\n=== Clearing old files from public_html/pos ===")
    run(ssh, f"rm -rf {REMOTE_PUBLIC}/* {REMOTE_PUBLIC}/.[!.]*", "clearing pos folder")

    print(f"\n=== Uploading dist/ to {REMOTE_PUBLIC} ===")
    total = upload_dir(sftp, LOCAL_DIST, REMOTE_PUBLIC)
    print(f"  Done! Uploaded {total} files.")

    print("\n=== Fixing .htaccess for SPA routing ===")
    htaccess = """Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
"""
    with sftp.open(f"{REMOTE_PUBLIC}/.htaccess", "w") as f:
        f.write(htaccess)
    print("  .htaccess written.")

    print("\n=== Setting up Node.js backend ===")
    # Check what's in server_dist
    run(ssh, f"ls -la {REMOTE_APP}/server_dist/", "server_dist contents")

    # Check if there's a passenger/startup file needed
    run(ssh, f"ls {REMOTE_BASE}/nodejs/", "nodejs dir")

    # Create the Node.js app entry point for Hostinger
    # Hostinger Node.js apps need a specific startup config
    startup_script = f"""#!/usr/bin/env node
process.chdir('{REMOTE_APP}');
process.env.NODE_PATH = '{REMOTE_APP}/node_modules';
require('module').Module._initPaths();

// Load environment from .env
const fs = require('fs');
const path = require('path');
const envPath = path.join('{REMOTE_APP}', '.env');
if (fs.existsSync(envPath)) {{
  const lines = fs.readFileSync(envPath, 'utf8').split('\\n');
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

require('{REMOTE_APP}/server_dist/index.js');
"""

    entry_path = f"{REMOTE_BASE}/nodejs/app.js"
    with sftp.open(entry_path, "w") as f:
        f.write(startup_script)
    run(ssh, f"chmod +x {entry_path}", "chmod app.js")
    print(f"  Created {entry_path}")

    # Check server_dist/index.js to understand what port it uses
    run(ssh, f"head -30 {REMOTE_APP}/server_dist/index.js", "server index.js head")

    print("\n=== Checking Hostinger Node.js config ===")
    run(ssh, f"ls {REMOTE_BASE}/nodejs/", "nodejs folder contents")
    run(ssh, f"cat {REMOTE_BASE}/nodejs/*.json 2>/dev/null || echo 'no json config'", "nodejs config files")

    print("\n=== Done! ===")
    print(f"Frontend: https://pos.barmagly.tech")
    print(f"Backend entry: {entry_path}")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
