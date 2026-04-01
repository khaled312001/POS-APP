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

run2("ps aux | grep -v grep | grep -E '(node|lsnode)' | head -10", "Node processes")
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log | tail -5", "startup.log tail")
run2("cat /home/u492425110/domains/barmagly.tech/pos-nodejs/stderr.log | tail -10", "stderr.log tail")
run2("ls /home/u492425110/domains/barmagly.tech/pos-nodejs/", "pos-nodejs dir")

# Try to manually start it
print("\n=== Attempting manual start ===")
stdin, stdout, stderr = client.exec_command(
    "cd /home/u492425110/pos-app && nohup node /home/u492425110/domains/barmagly.tech/pos-nodejs/server.js > /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log 2>/home/u492425110/domains/barmagly.tech/pos-nodejs/stderr.log &"
)
out = stdout.read().decode()
err = stderr.read().decode()
print("stdout:", out)
print("stderr:", err)

time.sleep(5)
run2("ps aux | grep -v grep | grep -E '(node|lsnode)' | head -10", "Node processes after start")
run2("tail -10 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log", "startup.log after start")

client.close()
print("\nDone.")
