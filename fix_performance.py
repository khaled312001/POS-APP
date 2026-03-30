#!/usr/bin/env python3
"""
Fix performance: let Apache serve static assets directly.
Only / and /api/* and /super-admin/* and /store/* go through Passenger.
"""
import paramiko, os, time

HOST = "82.198.227.175"; PORT = 65002
USER = "u492425110"; PASS = "support@Passord123"
HOME = f"/home/{USER}"
POS_APP    = f"{HOME}/pos-app"
POS_NODE   = f"{HOME}/domains/barmagly.tech/pos-nodejs"
POS_STATIC = f"{HOME}/domains/barmagly.tech/public_html/pos"
LOCAL_DIST = r"f:\POS-APP\dist"

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS)
    return c

def run(ssh, cmd, d=''):
    if d: print(f'>> {d}')
    _, o, e = ssh.exec_command(cmd)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out: print(out)
    if err and 'warn' not in err.lower() and len(err) < 500:
        print('[err]', err[:300])
    return out

def upload_dir(sftp, local_dir, remote_dir, skip_files=None):
    skip_files = skip_files or []
    try: sftp.mkdir(remote_dir)
    except: pass
    count = 0
    for item in os.listdir(local_dir):
        if item in skip_files:
            continue
        lp = os.path.join(local_dir, item)
        rp = remote_dir + "/" + item
        if os.path.isdir(lp):
            count += upload_dir(sftp, lp, rp)
        else:
            sftp.put(lp, rp)
            count += 1
            if count % 20 == 0: print(f"    {count} files...")
    return count

def main():
    ssh = make_ssh()
    sftp = ssh.open_sftp()

    # ── Upload dist/ to public_html/pos/app/ (Apache serves these directly)
    # Skip index.html — let Passenger serve /app (Node.js returns the HTML)
    print("=== Upload dist/ → public_html/pos/app/ (no index.html) ===")
    run(ssh, f"mkdir -p {POS_STATIC}/app", "create app dir")
    total = upload_dir(sftp, LOCAL_DIST, f"{POS_STATIC}/app", skip_files=["index.html"])
    print(f"  Uploaded {total} static asset files")

    # ── Write .htaccess: Apache serves files that exist, Passenger gets the rest
    print("\n=== Write optimized .htaccess ===")
    htaccess = f"""# POS Node.js Backend - Passenger config
PassengerAppRoot {POS_NODE}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs20/root/usr/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir {POS_NODE}/tmp

Options -Indexes
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
</IfModule>

RewriteEngine On
# Serve existing static files directly via Apache (fast)
RewriteCond %{{REQUEST_FILENAME}} -f
RewriteRule .* - [L]

# Everything else goes through Passenger (Node.js)
"""
    with sftp.open(f"{POS_STATIC}/.htaccess", "w") as f:
        f.write(htaccess)
    print("  .htaccess written")

    # ── Restart Passenger ────────────────────────────────────────────────
    run(ssh, f"rm -f {POS_NODE}/startup.log {POS_NODE}/error.log", "clear logs")
    run(ssh, f"touch {POS_NODE}/tmp/restart.txt", "restart Passenger")

    print("\nWaiting 6s for Passenger...")
    time.sleep(6)

    run(ssh, f"cat {POS_NODE}/startup.log 2>/dev/null | head -5", "startup.log")
    run(ssh, f"cat {POS_NODE}/error.log 2>/dev/null || echo 'no errors'", "error.log")
    run(ssh, f"ls {POS_STATIC}/app/ | head -10", "app/ static files")

    print("\n=== Testing response times ===")
    import ssl, urllib.request
    ctx = ssl.create_default_context()
    ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

    for url in ['https://pos.barmagly.tech/', 'https://pos.barmagly.tech/app',
                'https://pos.barmagly.tech/super-admin/dashboard']:
        try:
            t = time.time()
            r = urllib.request.urlopen(url, context=ctx, timeout=15)
            body = r.read(200).decode('utf-8', errors='replace')
            elapsed = time.time() - t
            print(f"  {url} → {r.status} ({elapsed:.1f}s) | {body[:80].strip().replace(chr(10),' ')}")
        except Exception as e:
            print(f"  {url} → ERROR: {e}")

    sftp.close(); ssh.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
