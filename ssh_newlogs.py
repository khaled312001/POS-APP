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

print("=== startup.log last 20 ===")
print(run('tail -20 /home/u492425110/domains/barmagly.tech/pos-nodejs/startup.log'))

print("\n=== stderr.log last 30 ===")
print(run('tail -30 /home/u492425110/domains/barmagly.tech/pos-nodejs/stderr.log'))

print("\n=== Running node processes ===")
print(run('ps aux | grep node | grep -v grep'))

t.close()
