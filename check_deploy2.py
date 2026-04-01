import paramiko
import time

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
    stdin, stdout, stderr = client.exec_command(f"bash -l -c '{cmd}'")
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:2000])
    if err and not err.startswith("bash: "):
        print("ERR:", err[:500])

def run2(cmd, label=None):
    if label:
        print(f"\n=== {label} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:2000])
    if err:
        print("ERR:", err[:500])

run2("find /home/u492425110 -name 'pm2' 2>/dev/null | head -5", "Find pm2")
run2("find /usr/local/bin /usr/bin ~/.npm-global/bin ~/.local/bin -name 'pm2' 2>/dev/null | head -5", "Find pm2 system")
run2("ls /home/u492425110/.nvm/versions/node/ 2>/dev/null | head", "NVM versions")
run2("ls /home/u492425110/domains/barmagly.tech/pos-nodejs/ 2>/dev/null", "App directory contents")
run2("ps aux | grep -E '(node|pm2)' | grep -v grep", "Running node processes")

# Check if there's a startup script or ecosystem file
run2("find /home/u492425110/pos-app -name '*.json' | head -10", "Config files in pos-app")
run2("ls /home/u492425110/pos-app/", "pos-app contents")
run2("ls /home/u492425110/pos-app/server_dist/", "server_dist contents")

# Check the actual running app location
run2("cat /proc/1730544/cmdline 2>/dev/null | tr '\\0' ' '", "Process 1730544 cmdline")
run2("ls -la /proc/$(ps aux | grep lsnode | grep -v grep | awk '{print $2}' | head -1)/fd 2>/dev/null | grep index | head", "lsnode open files")

client.close()
print("\nDone.")
