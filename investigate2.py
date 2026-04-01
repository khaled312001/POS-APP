import paramiko

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

run2("cat /home/u492425110/domains/barmagly.tech/public_html/pos/.htaccess", "pos .htaccess")
run2("cat /home/u492425110/domains/barmagly.tech/public_html/pos/app/.htaccess", "pos/app .htaccess")
run2("ls /home/u492425110/domains/barmagly.tech/public_html/pos/", "pos dir")

client.close()
print("\nDone.")
