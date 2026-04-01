import paramiko, time, socket

hostname = '82.198.227.175'
port = 65002
username = 'u492425110'
password = 'support@Passord123'

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(20)
sock.connect((hostname, port))
t = paramiko.Transport(sock)
t.start_client(timeout=15)
t.auth_password(username, password)

def run(cmd, timeout=30):
    chan = t.open_session()
    chan.exec_command(cmd)
    out = b''
    for _ in range(timeout * 10):
        if chan.recv_ready(): out += chan.recv(4096)
        if chan.recv_stderr_ready(): chan.recv_stderr(4096)
        if chan.exit_status_ready(): break
        time.sleep(0.1)
    if chan.recv_ready(): out += chan.recv(65536)
    return out.decode('utf-8', errors='replace')

ENV_FILE = '/home/u492425110/pos-app/.env'

# Add MySQL vars to .env
mysql_vars = """
# MySQL (Hostinger) — primary database
MYSQL_HOST=127.0.0.1
MYSQL_USER=u492425110_pos
MYSQL_PASSWORD=Pass1232026*12312+123
MYSQL_DATABASE=u492425110_pos
NODE_ENV=production
"""

# Check if MySQL vars already there
current = run(f'cat {ENV_FILE}')
if 'MYSQL_HOST' in current:
    print("MySQL vars already in .env")
else:
    print("Adding MySQL vars to .env...")
    # Append via echo
    cmd = f'''cat >> {ENV_FILE} << 'ENVEOF'
{mysql_vars}
ENVEOF'''
    out = run(cmd)
    print(out or "Done")

# Verify
print("\n=== Updated .env ===")
print(run(f'cat {ENV_FILE}'))

# Restart server
print("\n=== Restarting server ===")
print(run('touch /home/u492425110/domains/barmagly.tech/pos-nodejs/tmp/restart.txt && echo restarted'))
print(run('pkill -f "pos-nodejs" 2>&1; sleep 1; echo killed'))

t.close()
print("\nDone!")
