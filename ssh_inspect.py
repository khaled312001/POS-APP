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

APP_DIR = '/home/u492425110/domains/barmagly.tech/nodejs'

# Full server.js content
print("\n=== server.js FULL ===")
out, _ = run(f'cat {APP_DIR}/server.js')
print(out)

# Check what's in the app subdir
print("\n=== app/ contents ===")
out, _ = run(f'ls {APP_DIR}/app/')
print(out[:300])

t.close()
