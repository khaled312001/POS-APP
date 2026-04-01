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
    err = b''
    for _ in range(timeout * 10):
        if chan.recv_ready(): out += chan.recv(4096)
        if chan.recv_stderr_ready(): err += chan.recv_stderr(4096)
        if chan.exit_status_ready(): break
        time.sleep(0.1)
    if chan.recv_ready(): out += chan.recv(65536)
    if chan.recv_stderr_ready(): err += chan.recv_stderr(65536)
    return out.decode('utf-8', errors='replace')

POS_DIR = '/home/u492425110/domains/barmagly.tech/pos-nodejs'
GIT_DIR = '/home/u492425110/pos-app'

print("=== pos-nodejs structure ===")
print(run(f'ls {POS_DIR}/'))

print("\n=== server_dist in pos-nodejs ===")
print(run(f'ls {POS_DIR}/server_dist/ 2>/dev/null || echo "no server_dist"'))

print("\n=== server.js head ===")
print(run(f'head -20 {POS_DIR}/server.js'))

print("\n=== Copy new server_dist/index.js ===")
print(run(f'cp {GIT_DIR}/server_dist/index.js {POS_DIR}/server_dist/index.js && echo "COPIED OK"'))

print("\n=== Touch restart.txt ===")
print(run(f'mkdir -p {POS_DIR}/tmp && touch {POS_DIR}/tmp/restart.txt && echo "restarted"'))

print("\n=== Kill pos-nodejs process ===")
print(run('pkill -f "pos-nodejs" 2>&1; sleep 1; echo done'))

t.close()
print("\nAll done!")
