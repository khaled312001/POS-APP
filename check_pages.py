#!/usr/bin/env python3
import paramiko, ssl, urllib.request

HOST = "82.198.227.175"; PORT = 65002
USER = "u492425110"; PASS = "support@Passord123"
POS_APP = f"/home/{USER}/pos-app"

def make_ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS)
    return c

def run(ssh, cmd, desc=""):
    if desc: print(f"\n>> {desc}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    if out: print(out)
    return out

def fetch(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    try:
        r = urllib.request.urlopen(url, context=ctx, timeout=10)
        return r.read(500).decode('utf-8', errors='replace')
    except Exception as e:
        return str(e)

ssh = make_ssh()
sftp = ssh.open_sftp()

# Check what template the server is using
run(ssh, f"head -5 {POS_APP}/server/templates/landing-page.html", "landing-page.html head")
run(ssh, f"wc -l {POS_APP}/server/templates/landing-page.html", "landing-page.html lines")
run(ssh, f"head -5 {POS_APP}/server/templates/super-admin-dashboard.html", "super-admin-dashboard.html head")
run(ssh, f"head -5 {POS_APP}/server/templates/super-admin-login.html", "super-admin-login.html head")

# Check what / actually returns (first 800 chars)
print("\n=== GET / (first 800 chars) ===")
print(fetch('https://pos.barmagly.tech/')[:800])

print("\n=== GET /super-admin/dashboard (first 800 chars) ===")
print(fetch('https://pos.barmagly.tech/super-admin/dashboard')[:800])

# Check startup log for errors
run(ssh, f"cat {POS_APP.replace('pos-app','domains/barmagly.tech/pos-nodejs')}/startup.log 2>/dev/null | tail -10", "startup.log")
run(ssh, f"cat {POS_APP.replace('pos-app','domains/barmagly.tech/pos-nodejs')}/error.log 2>/dev/null || echo 'no errors'", "error.log")

# Check if template files exist on server
run(ssh, f"ls {POS_APP}/server/templates/", "server templates on server")

sftp.close(); ssh.close()
