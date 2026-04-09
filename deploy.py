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
REMOTE_API = f"{REMOTE_PUBLIC}/api"
REMOTE_APP = f"{REMOTE_BASE}/nodejs/app"
LOCAL_DIST = r"f:\POS-APP\dist"
LOCAL_UPLOADS = r"f:\POS-APP\uploads"
LOCAL_SOUNDS = r"f:\POS-APP\public\sounds"
LOCAL_STORE = r"f:\POS-APP\store"

STORE_REWRITE_BLOCK = """# Barmagly store route support
RewriteEngine On
RewriteRule ^store/([^/]+)/?$ /api/store/$1 [L,QSA]
"""

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

def ensure_root_store_rewrite(sftp):
    root_htaccess_path = f"{REMOTE_BASE}/public_html/.htaccess"
    try:
        with sftp.open(root_htaccess_path, "r") as f:
            current = f.read().decode("utf-8", "ignore")
    except Exception:
        current = ""

    if "RewriteRule ^store/([^/]+)/?$ /api/store/$1 [L,QSA]" in current:
        print("  Root /store rewrite already present.")
        return

    updated = current.rstrip() + "\n\n" + STORE_REWRITE_BLOCK
    with sftp.open(root_htaccess_path, "w") as f:
        f.write(updated)
    print("  Root /store rewrite added to public_html/.htaccess.")

def main():
    print("=== Connecting to Hostinger server ===")
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    print("\n=== Checking .env file on server ===")
    run(ssh, f"cat {REMOTE_APP}/.env", "reading .env")

    print("\n=== Ensuring root store rewrite ===")
    ensure_root_store_rewrite(sftp)

    print("\n=== Clearing old files from public_html/pos ===")
    run(ssh, f"rm -rf {REMOTE_PUBLIC}/* {REMOTE_PUBLIC}/.[!.]*", "clearing pos folder")

    print(f"\n=== Uploading dist/ to {REMOTE_PUBLIC} ===")
    total = upload_dir(sftp, LOCAL_DIST, REMOTE_PUBLIC)
    print(f"  Done! Uploaded {total} files.")

    if os.path.isdir(LOCAL_UPLOADS):
        print(f"\n=== Uploading uploads/ to {REMOTE_PUBLIC}/uploads ===")
        total = upload_dir(sftp, LOCAL_UPLOADS, f"{REMOTE_PUBLIC}/uploads")
        print(f"  Done! Uploaded {total} upload files.")

    if os.path.isdir(LOCAL_SOUNDS):
        print(f"\n=== Uploading public/sounds/ to {REMOTE_PUBLIC}/sounds ===")
        total = upload_dir(sftp, LOCAL_SOUNDS, f"{REMOTE_PUBLIC}/sounds")
        print(f"  Done! Uploaded {total} sound files.")

    if os.path.isdir(LOCAL_STORE):
        print(f"\n=== Uploading store/ to {REMOTE_PUBLIC}/store ===")
        total = upload_dir(sftp, LOCAL_STORE, f"{REMOTE_PUBLIC}/store")
        print(f"  Done! Uploaded {total} store files.")

    print("\n=== Fixing .htaccess for SPA routing ===")
    htaccess = """Options -MultiViews
RewriteEngine On
RewriteRule ^api($|/) - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
"""
    with sftp.open(f"{REMOTE_PUBLIC}/.htaccess", "w") as f:
        f.write(htaccess)
    print("  .htaccess written.")

    print("\n=== Mounting /api via Passenger ===")
    run(ssh, f"mkdir -p {REMOTE_API}", "creating api mount dir")
    api_htaccess = f"""PassengerAppRoot {REMOTE_BASE}/pos-nodejs
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /api
PassengerRestartDir {REMOTE_BASE}/pos-nodejs/tmp
SetEnv NODE_ENV=production
"""
    with sftp.open(f"{REMOTE_API}/.htaccess", "w") as f:
        f.write(api_htaccess)
    print("  /api Passenger mount written.")

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
