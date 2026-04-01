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

# Check LiteSpeed Node.js app config
run2("find /home/u492425110 -name '*.conf' -o -name '*.xml' 2>/dev/null | grep -v node_modules | head -20", "Config files")
run2("ls /home/u492425110/", "Home dir")
run2("ls /home/u492425110/domains/", "Domains dir")
run2("ls /home/u492425110/domains/barmagly.tech/", "barmagly.tech dir")

# Check for Cloudlinux/cPanel node app config
run2("cat /home/u492425110/nodevenv/*/*/bin/activate 2>/dev/null | head -10 || echo 'no nodevenv'", "nodevenv")
run2("find /home/u492425110 -name 'passenger_wsgi.py' -o -name '.htaccess' 2>/dev/null | head -5", ".htaccess files")
run2("cat /home/u492425110/domains/barmagly.tech/.htaccess 2>/dev/null | head -30 || echo 'no htaccess'", ".htaccess")
run2("cat /home/u492425110/domains/barmagly.tech/public_html/.htaccess 2>/dev/null | head -30 || echo 'no htaccess in public_html'", "public_html .htaccess")

# Check if there's a restart file mechanism
run2("ls /home/u492425110/domains/barmagly.tech/pos-nodejs/tmp/ 2>/dev/null", "tmp dir in pos-nodejs")
run2("touch /home/u492425110/domains/barmagly.tech/pos-nodejs/tmp/restart.txt 2>/dev/null && echo 'touched restart.txt'", "Touch restart.txt")

time.sleep(5)
run2("ps aux | grep -E '(lsnode|node)' | grep -v grep | head -5", "Node processes after touch")
run2("tail -5 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log", "startup.log after touch")

client.close()
print("\nDone.")
