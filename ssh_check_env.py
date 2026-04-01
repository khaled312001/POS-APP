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

print("=== .env file ===")
print(run('cat /home/u492425110/pos-app/.env'))

print("\n=== Last 40 lines of stderr.log ===")
print(run('tail -40 /home/u492425110/domains/barmagly.tech/pos-nodejs/stderr.log'))

print("\n=== Last 15 lines of startup.log ===")
print(run('tail -15 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log'))

print("\n=== error.log if exists ===")
print(run('tail -20 /home/u492425110/domains/barmagly.tech/pos-nodejs/error.log 2>/dev/null || echo "no error.log"'))

t.close()
