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
    return out

run2("ls /home/u492425110/domains/barmagly.tech/nodejs/", "nodejs dir contents")
run2("ls /home/u492425110/domains/barmagly.tech/nodejs/tmp/ 2>/dev/null || echo 'no tmp dir'", "nodejs tmp dir")
run2("cat /home/u492425110/domains/barmagly.tech/nodejs/server.js | head -30", "nodejs server.js head")

client.close()
print("\nDone.")
