import paramiko
import time

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run2(cmd, label=None):
    if label:
        print(f"\n=== {label} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:5000])
    if err:
        print("ERR:", err[:500])
    return out

# Read the full pos-nodejs/server.js to understand what port it runs on
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/server.js", "pos-nodejs server.js full")

# Check if keepalive or cron is set up
run2("crontab -l 2>/dev/null", "Crontab")

# Check the Next.js server.js to understand routing - does it proxy /api to the backend?
run2("cat /home/u492425110/domains/barmagly.tech/nodejs/server.js | grep -i 'api\\|proxy\\|5001\\|backend' | head -20", "nodejs server.js API routing")

# Check public_html htaccess for rewrite rules
run2("cat /home/u492425110/domains/barmagly.tech/public_html/.htaccess", "full .htaccess")

# How does /api get routed to the backend?
run2("find /home/u492425110/domains/barmagly.tech -name '*.htaccess' -o -name '.htaccess' 2>/dev/null | xargs ls -la 2>/dev/null", "All htaccess files")
run2("cat /home/u492425110/domains/barmagly.tech/public_html/public/.htaccess 2>/dev/null || echo 'not found'", "public/.htaccess")

client.close()
print("\nDone.")
