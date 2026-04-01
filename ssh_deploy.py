import paramiko, time, socket

hostname = '82.198.227.175'
port = 65002
username = 'u492425110'
password = 'support@Passord123'

print("Connecting via SSH...")
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
    status = chan.recv_exit_status()
    return out.decode('utf-8', errors='replace'), err.decode('utf-8', errors='replace'), status

# Pull latest code
print("\n--- git pull ---")
out, err, code = run('cd /home/u492425110/pos-app && git pull 2>&1')
print(out or err)

# Kill old node process so Passenger restarts with new code
print("\n--- Restarting app ---")
out, err, code = run('pkill -f "server_dist/index.js" 2>&1; echo "kill done"')
print(out or err)

time.sleep(3)

# Verify new process
print("\n--- Check process ---")
out, err, code = run('pgrep -a node | grep pos-app | head -3')
print(out or "No node process found (Passenger will restart on next request)")

# Touch passenger restart file if exists
print("\n--- Touch restart.txt ---")
out, err, code = run('ls /home/u492425110/pos-app/tmp/ 2>/dev/null || mkdir -p /home/u492425110/pos-app/tmp && touch /home/u492425110/pos-app/tmp/restart.txt && echo "restart.txt touched"')
print(out or err)

t.close()
print("\nDone!")
