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

# Check the .env for any hidden chars
print("=== .env MYSQL lines (hex check) ===")
print(run("grep -n MYSQL /home/u492425110/pos-app/.env | cat -A"))

# Test MySQL connectivity from the server itself
print("\n=== MySQL connection test from server ===")
print(run("mysql -h 127.0.0.1 -u u492425110_pos -pPass1232026*12312+123 u492425110_pos -e 'SELECT COUNT(*) FROM products' 2>&1"))

# Check the server.js on Passenger to add MYSQL debug logging
print("\n=== Check if MYSQL vars in server_dist ===")
print(run("grep -c 'MYSQL_HOST' /home/u492425110/pos-app/server_dist/index.js"))

# Modify server.js to log MYSQL vars
SRV = '/home/u492425110/domains/barmagly.tech/pos-nodejs/server.js'
print("\n=== Adding MYSQL debug to server.js ===")
# Add a log line after "Loaded .env OK" to show MYSQL vars
patch = '''sed -i "s/log('Loaded .env OK');/log('Loaded .env OK'); log('MYSQL_HOST=' + process.env.MYSQL_HOST); log('MYSQL_USER=' + process.env.MYSQL_USER); log('MYSQL_DB=' + process.env.MYSQL_DATABASE);/" ''' + SRV
print(run(patch))

# Restart
print(run(f'touch /home/u492425110/domains/barmagly.tech/pos-nodejs/tmp/restart.txt && echo restarted'))
print(run('pkill -f "pos-nodejs"; sleep 2; echo killed'))

t.close()
print("Done - check startup.log in a moment")
