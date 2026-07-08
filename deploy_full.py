#!/usr/bin/env python3
"""
Comprehensive deploy: server_dist + server/templates + dist/app (web POS).
Uploads to /home/u492425110/pos-app and restarts Passenger.
"""
import paramiko, os, sys, posixpath

HOST = "147.93.54.132"; PORT = 65002
USER = "u492425110"; PASS = "support@Passord123support@Passord123"
APP = "/home/u492425110/pos-app"
NODEJS = "/home/u492425110/domains/barmagly.tech/pos-nodejs"
# Apache serves /app statically from here (takes precedence over Node), so the
# web bundle MUST be synced here too or the old bundle keeps being served.
PUBLIC_APP = "/home/u492425110/domains/barmagly.tech/public_html/pos/app"

def make_ssh():
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=40)
    return c

def run(ssh, cmd):
    _, o, e = ssh.exec_command(cmd)
    out = o.read().decode().strip(); err = e.read().decode().strip()
    return out, err

def ensure_dir(sftp, ssh, remote):
    run(ssh, f"mkdir -p {remote}")

def upload_tree(sftp, ssh, local_dir, remote_dir):
    ensure_dir(sftp, ssh, remote_dir)
    count = 0
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace("\\", "/")
        rdir = remote_dir if rel == "." else posixpath.join(remote_dir, rel)
        if rel != ".":
            run(ssh, f"mkdir -p {rdir}")
        for f in files:
            lp = os.path.join(root, f)
            rp = posixpath.join(rdir, f)
            sftp.put(lp, rp)
            count += 1
    return count

def main():
    print("=== Connecting ===")
    ssh = make_ssh(); sftp = ssh.open_sftp()

    print("\n=== 1. server_dist/index.js ===")
    run(ssh, f"mkdir -p {APP}/server_dist")
    sftp.put(r"f:\POS-APP\server_dist\index.js", f"{APP}/server_dist/index.js")
    print("  uploaded server_dist/index.js")

    print("\n=== 2. server/templates/ ===")
    n = upload_tree(sftp, ssh, r"f:\POS-APP\server\templates", f"{APP}/server/templates")
    print(f"  uploaded {n} template files")

    print("\n=== 3. dist/app/ (web POS bundle) ===")
    # Clear old hashed JS to avoid stale bundles, then upload fresh
    run(ssh, f"rm -rf {APP}/dist/app/_expo")
    n = upload_tree(sftp, ssh, r"f:\POS-APP\dist\app", f"{APP}/dist/app")
    print(f"  uploaded {n} web files")

    print("\n=== 3b. Sync web bundle to public_html/pos/app (Apache static) ===")
    run(ssh, f"rm -rf {PUBLIC_APP}/_expo")
    n = upload_tree(sftp, ssh, r"f:\POS-APP\dist\app", PUBLIC_APP)
    print(f"  synced {n} web files to public_html")

    print("\n=== 4. Restart Passenger ===")
    run(ssh, f"mkdir -p {NODEJS}/tmp && touch {NODEJS}/tmp/restart.txt")
    print("  restart triggered")

    print("\n=== 5. Verify ===")
    out, _ = run(ssh, f"ls -la {APP}/server_dist/index.js")
    print("  " + out)
    out, _ = run(ssh, f"ls {APP}/dist/app/_expo/static/js/web/ | head -2")
    print("  new JS bundle: " + out)
    sftp.close(); ssh.close()
    print("\n=== DONE ===")

if __name__ == "__main__":
    main()
