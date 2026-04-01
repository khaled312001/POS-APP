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

# Touch the Passenger restart file for pos-nodejs
run2("touch /home/u492425110/domains/barmagly.tech/pos-nodejs/tmp/restart.txt && echo 'Touched restart.txt'", "Touch pos-nodejs restart.txt")

print("Waiting 10 seconds for Passenger to restart the app...")
time.sleep(10)

run2("ps aux | grep -v grep | grep -E '(lsnode|node)' | head -10", "Node processes after restart")
run2("tail -10 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log", "startup.log")

client.close()
print("\nDone.")
