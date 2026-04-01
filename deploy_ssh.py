import paramiko
import os
import sys

HOST = "82.198.227.175"
PORT = 65002
USER = "u492425110"
PASS = "support@Passord123"
LOCAL_FILE = r"F:\POS-APP\server_dist\index.js"
REMOTE_FILE = "/home/u492425110/pos-app/server_dist/index.js"

print(f"Connecting to {HOST}:{PORT}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
print("Connected.")

# Upload file via SFTP
print(f"Uploading {LOCAL_FILE} -> {REMOTE_FILE} ...")
sftp = client.open_sftp()
sftp.put(LOCAL_FILE, REMOTE_FILE)
sftp.close()
print("File uploaded successfully.")

# Restart server
print("\nRestarting server...")
restart_cmd = "cd /home/u492425110/pos-app && pm2 restart all 2>/dev/null || (pkill -f 'node.*server_dist' 2>/dev/null; sleep 1; nohup node server_dist/index.js > /tmp/node_server.log 2>&1 &)"
stdin, stdout, stderr = client.exec_command(restart_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print("stdout:", out)
print("stderr:", err)

# Check status
print("\nChecking process status...")
status_cmd = "pm2 list 2>/dev/null || ps aux | grep node | grep -v grep | head -5"
stdin, stdout, stderr = client.exec_command(status_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print("stderr:", err)

client.close()
print("\nDone.")
