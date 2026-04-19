#!/usr/bin/env python3
"""Deploy delivery-app updates + server_dist to Hostinger"""
import paramiko
import os
import sys

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
REMOTE_BASE = f"/home/{USER}/domains/barmagly.tech"
REMOTE_APP = f"/home/{USER}/pos-app"
REMOTE_PUBLIC = f"{REMOTE_BASE}/public_html/pos"
REMOTE_API = f"{REMOTE_PUBLIC}/api"
REMOTE_NODEJS = f"{REMOTE_BASE}/pos-nodejs"

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
    if err and "No such file" not in err:
        print(f"  [stderr] {err}", file=sys.stderr)
    return out

def upload_dir(sftp, local_dir, remote_dir, skip_ext=None):
    """Recursively upload a local directory to remote."""
    try:
        sftp.mkdir(remote_dir)
    except:
        pass

    count = 0
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item

        # Skip tmp files
        if item.endswith(".tmp") or item.startswith("~$") or ".tmp." in item:
            continue
        if skip_ext and any(item.endswith(ext) for ext in skip_ext):
            continue

        if os.path.isdir(local_path):
            count += upload_dir(sftp, local_path, remote_path, skip_ext)
        else:
            sftp.put(local_path, remote_path)
            count += 1
            print(f"    -> {remote_path}")
    return count

def main():
    print("=== Connecting to Hostinger ===")
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    # 1. Check current state
    print("\n=== Checking current server state ===")
    run(ssh, f"ls -la {REMOTE_APP}/", "app directory")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/ 2>/dev/null || echo 'delivery-app dir does not exist yet'", "delivery-app dir")

    # 2. Upload server_dist/index.js
    print("\n=== Uploading server_dist/index.js ===")
    run(ssh, f"mkdir -p {REMOTE_APP}/server_dist", "create server_dist dir")
    sftp.put(r"f:\POS-APP\server_dist\index.js", f"{REMOTE_APP}/server_dist/index.js")
    print("  Done! server_dist/index.js uploaded.")

    # 3. Upload delivery-app/
    print(f"\n=== Uploading delivery-app/ to {REMOTE_APP}/delivery-app/ ===")
    total = upload_dir(sftp, r"f:\POS-APP\delivery-app", f"{REMOTE_APP}/delivery-app")
    print(f"  Done! Uploaded {total} delivery-app files.")

    # 4. Ensure Passenger config is correct
    print("\n=== Verifying Passenger config ===")
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
    print("  /api Passenger htaccess written.")

    # Root .htaccess — redirect /super-admin, /super_admin, /dashboard to /api/ paths
    root_htaccess = """RewriteEngine On
RewriteRule ^super-admin(/.*)?$ /api/super-admin$1 [R=301,L]
RewriteRule ^super_admin(/.*)?$ /api/super-admin$1 [R=301,L]
RewriteRule ^dashboard$ /api/dashboard [R=301,L]
"""
    root_htaccess_path = f"{REMOTE_PUBLIC}/.htaccess"
    try:
        existing = ""
        try:
            with sftp.open(root_htaccess_path, "r") as f:
                existing = f.read().decode("utf-8", errors="replace")
        except:
            pass
        if "super-admin" not in existing:
            with sftp.open(root_htaccess_path, "w") as f:
                f.write(root_htaccess + existing)
            print("  Root .htaccess updated with super-admin redirect.")
        else:
            print("  Root .htaccess already has super-admin redirect.")
    except Exception as e:
        print(f"  Warning: could not update root .htaccess: {e}")

    # 5. Restart Passenger
    print("\n=== Restarting Passenger ===")
    run(ssh, f"mkdir -p {REMOTE_NODEJS}/tmp", "ensure tmp dir")
    run(ssh, f"touch {REMOTE_NODEJS}/tmp/restart.txt", "restart Passenger")
    print("  Passenger restart triggered.")

    # 6. Verify
    print("\n=== Verifying deployment ===")
    run(ssh, f"ls -la {REMOTE_APP}/server_dist/index.js", "server_dist check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/index.html", "delivery index check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/landing.html", "landing page check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/sw.js", "service worker check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/manifest.json", "manifest check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/css/", "CSS files check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/driver/driver.css", "driver CSS check")
    run(ssh, f"ls -la {REMOTE_APP}/delivery-app/track/track.css", "track CSS check")

    print("\n=== Deployment complete! ===")
    print("Site: https://barmagly.tech/api/order")
    print("Landing: https://barmagly.tech/api/order (no slug)")
    print("Driver: https://barmagly.tech/api/driver")
    print("Track: https://barmagly.tech/api/track/:id")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
