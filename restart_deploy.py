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

# Get the PID of the running lsnode process
out = run2("ps aux | grep lsnode | grep -v grep | awk '{print $2}'", "Get lsnode PID")
pid = out.strip()
print(f"PID to kill: {pid}")

if pid:
    # Kill the process - LiteSpeed/lsnode should auto-restart it
    run2(f"kill {pid}", "Kill process")
    print("Waiting 5 seconds for restart...")
    time.sleep(5)
    run2("ps aux | grep -E '(lsnode|node)' | grep -v grep | head -5", "New process status")
    time.sleep(3)
    run2("tail -20 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log", "Startup log after restart")
else:
    print("No lsnode PID found, trying alternative restart...")
    run2("kill $(ps aux | grep 'node.*server_dist' | grep -v grep | awk '{print $2}') 2>/dev/null || true", "Kill node server_dist")
    time.sleep(3)
    run2("ps aux | grep node | grep -v grep | head -5", "Process status")

client.close()
print("\nDone.")
