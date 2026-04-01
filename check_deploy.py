import paramiko

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, label=None):
    if label:
        print(f"\n=== {label} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print("ERR:", err[:500])

# Check where pm2 is looking for app
run("pm2 list", "PM2 list")
run("pm2 show 0 2>/dev/null || pm2 show pos-app 2>/dev/null || pm2 show all 2>/dev/null | head -40", "PM2 show details")

# Check which directory pm2 app is using
run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json; apps=json.load(sys.stdin); [print(a.get('name'), a.get('pm2_env',{}).get('pm_cwd'), a.get('pm2_env',{}).get('pm_exec_path')) for a in apps]\" 2>/dev/null", "PM2 app paths")

# Restart using the right path
run("pm2 restart all", "PM2 restart")

import time
time.sleep(3)

run("pm2 list", "PM2 list after restart")

# Check logs for errors
run("pm2 logs --nostream --lines 20 2>/dev/null | tail -30", "Recent logs")

client.close()
print("\nDone.")
