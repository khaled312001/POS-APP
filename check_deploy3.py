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
        print(out[:3000])
    if err:
        print("ERR:", err[:500])

run2("ls /home/u492425110/domains/barmagly.tech/pos-nodejs/", "pos-nodejs dir")
run2("ls /home/u492425110/domains/barmagly.tech/pos-nodejs/server_dist/ 2>/dev/null || echo 'no server_dist'", "pos-nodejs server_dist")
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/server.js 2>/dev/null | head -20", "server.js content")
run2("ls -la /home/u492425110/domains/barmagly.tech/pos-nodejs/ | head -20", "pos-nodejs dir details")

# Check what lsnode is - likely a Litespeed-managed node
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log 2>/dev/null | tail -20", "startup.log")
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/stderr.log 2>/dev/null | tail -20", "stderr.log")

# Check if there's a symlink or if pos-nodejs IS the pos-app
run2("readlink -f /home/u492425110/domains/barmagly.tech/pos-nodejs 2>/dev/null", "pos-nodejs real path")

client.close()
print("\nDone.")
