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

def run(cmd, timeout=60):
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
GIT_DIR = '/home/u492425110/pos-app'

# Check nodejs dir structure
print("\n=== nodejs dir ===")
out, _ = run(f'ls {APP_DIR}/')
print(out[:500])

# Check if it's a git repo
print("\n=== Is nodejs dir a git repo? ===")
out, _ = run(f'ls {APP_DIR}/.git 2>/dev/null && echo YES || echo NO')
print(out.strip())

# Check the server.js in nodejs dir
print("\n=== server.js head ===")
out, _ = run(f'head -5 {APP_DIR}/server.js 2>/dev/null || echo "no server.js"')
print(out)

# Copy updated server_dist/index.js from pos-app to nodejs
print("\n=== Copy updated server_dist ===")
out, err = run(f'cp {GIT_DIR}/server_dist/index.js {APP_DIR}/server_dist/index.js && echo "COPIED OK"')
print(out or err)

# Also copy db.ts compiled (it's bundled into index.js so just the above is enough)

# Restart Passenger by touching restart.txt
print("\n=== Touch restart.txt ===")
out, err = run(f'mkdir -p {APP_DIR}/tmp && touch {APP_DIR}/tmp/restart.txt && echo "restart.txt touched"')
print(out or err)

# Also kill the running node process
print("\n=== Kill old process ===")
out, err = run('pkill -f "pos-nodejs" 2>&1; echo done')
print(out or err)

t.close()
print("\nDone! Server will restart on next request.")
