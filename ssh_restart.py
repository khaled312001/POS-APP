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
print("Connected!")

def run(cmd, timeout=30):
    chan = t.open_session()
    chan.exec_command(cmd)
    out = b''
    err = b''
    for _ in range(timeout * 10):
        if chan.recv_ready(): out += chan.recv(4096)
        if chan.recv_stderr_ready(): err += chan.recv_stderr(4096)
        if chan.exit_status_ready(): break
        time.sleep(0.1)
    if chan.recv_ready(): out += chan.recv(65536)
    if chan.recv_stderr_ready(): err += chan.recv_stderr(65536)
    return out.decode('utf-8', errors='replace'), err.decode('utf-8', errors='replace')

# Check what's running
print("\n=== Running node processes ===")
out, err = run('ps aux | grep node | grep -v grep')
print(out or "(none)")

# Check the server.js file that Passenger uses
print("\n=== Check server.js entry point ===")
out, err = run('ls -la /home/u492425110/pos-app/ | head -20')
print(out)

# Check Passenger app config
print("\n=== Check Passenger config ===")
out, err = run('cat /home/u492425110/.htaccess 2>/dev/null || cat /home/u492425110/domains/barmagly.tech/.htaccess 2>/dev/null || echo "no htaccess"')
print(out[:500])

# Check the actual app directory structure
print("\n=== Node.js app config ===")
out, err = run('ls /home/u492425110/domains/ 2>/dev/null')
print("Domains:", out)

out, err = run('cat /home/u492425110/domains/barmagly.tech/public_html/.htaccess 2>/dev/null || echo "no htaccess in public_html"')
print("public_html htaccess:", out[:300])

t.close()
