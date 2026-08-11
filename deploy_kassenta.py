"""Deploy Kassenta to kassenta.com (Hostinger).

    KASSENTA_SSH_PASSWORD=...  python deploy_kassenta.py [server|web|all]

Layout on the host
    ~/kassenta-app                                  app root (cwd of the node process)
    ~/domains/kassenta.com/kassenta-nodejs          Passenger app (server.js + tmp/restart.txt)
    ~/domains/kassenta.com/public_html              document root (static, served by Apache)

Both kassenta.com and backend.kassenta.com point at the SAME PassengerAppRoot,
so one node process serves both hostnames — migrations and cron never run twice.

Everything is shipped as a single tar.gz per bundle and expanded on the host;
per-file SFTP over this link is an order of magnitude slower.
"""
import io
import os
import socket
import sys
import tarfile
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("KASSENTA_SSH_HOST", "147.93.54.132")
PORT = int(os.environ.get("KASSENTA_SSH_PORT", "65002"))
USER = os.environ.get("KASSENTA_SSH_USER", "u492425110")
PASSWORD = os.environ.get("KASSENTA_SSH_PASSWORD")

APP_ROOT = "/home/u492425110/kassenta-app"
PASSENGER = "/home/u492425110/domains/kassenta.com/kassenta-nodejs"
DOCROOT = "/home/u492425110/domains/kassenta.com/public_html"

ROOT = Path(__file__).resolve().parent

if not PASSWORD:
    sys.exit("KASSENTA_SSH_PASSWORD is not set")


def connect():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect((HOST, PORT))
    t = paramiko.Transport(sock)
    t.start_client(timeout=25)
    t.auth_password(USER, PASSWORD)
    return t


def run(t, cmd, timeout=300):
    chan = t.open_session()
    chan.exec_command(cmd)
    out, err = b"", b""
    for _ in range(timeout * 10):
        if chan.recv_ready():
            out += chan.recv(65536)
        if chan.recv_stderr_ready():
            err += chan.recv_stderr(65536)
        if chan.exit_status_ready():
            break
        time.sleep(0.1)
    while chan.recv_ready():
        out += chan.recv(65536)
    while chan.recv_stderr_ready():
        err += chan.recv_stderr(65536)
    return out.decode("utf-8", "replace"), err.decode("utf-8", "replace"), chan.recv_exit_status()


def push_tree(t, pairs, remote_tmp, extract_to):
    """tar up (local_path, name_in_archive) pairs, upload once, expand remotely."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for local, arcname in pairs:
            if Path(local).exists():
                tar.add(local, arcname=arcname)
            else:
                print(f"    ! missing, skipped: {local}")
    data = buf.getvalue()
    print(f"    archive {len(data) / 1e6:.1f} MB")

    sftp = paramiko.SFTPClient.from_transport(t)
    with sftp.open(remote_tmp, "wb") as fh:
        fh.set_pipelined(True)
        fh.write(data)
    sftp.close()

    out, err, code = run(t, f"mkdir -p {extract_to} && tar -xzf {remote_tmp} -C {extract_to} && rm -f {remote_tmp}")
    if code != 0:
        raise RuntimeError(f"extract failed: {err or out}")


def deploy_server(t):
    print("[1/3] server bundle -> app root")
    push_tree(
        t,
        [
            (ROOT / "server_dist", "server_dist"),
            (ROOT / "server" / "templates", "server/templates"),
            (ROOT / "public" / "brand", "public/brand"),
            (ROOT / "app.json", "app.json"),
            (ROOT / "package.json", "package.json"),
        ],
        "/home/u492425110/_kassenta_server.tar.gz",
        APP_ROOT,
    )


# Marketing pages pre-rendered by scripts/post-export.js as <slug>/index.html,
# plus the shared content-hashed stylesheet and script under assets/.
SITE_DIRS = ["features", "solutions", "pricing", "compliance", "about", "contact",
             "terms", "imprint", "assets"]


def deploy_web(t):
    print("[2/3] web bundle -> app root + document root")
    dist = ROOT / "dist"
    pairs = [
        (dist / "app", "app"),
        (dist / "super_admin", "super_admin"),
        (dist / "index.html", "index.html"),
        (ROOT / "public" / "brand", "brand"),
        (ROOT / "public" / "brand" / "site", "brand/site"),
    ]
    pairs += [(dist / d, d) for d in SITE_DIRS]

    # Old asset hashes would otherwise pile up forever; the pages only ever
    # reference the current pair, so anything left behind is dead weight.
    run(t, f"rm -rf {DOCROOT}/assets")

    # Apache serves the document root directly and wins over the node process,
    # so the same bundle has to land in both places or the old one keeps serving.
    # NOTE: never ship an .htaccess here — the document root's own .htaccess
    # carries the Passenger configuration for the whole site.
    push_tree(t, pairs, "/home/u492425110/_kassenta_web.tar.gz", DOCROOT)
    push_tree(t, [(dist / "app", "dist/app"), (dist / "super_admin", "dist/super_admin")],
              "/home/u492425110/_kassenta_web2.tar.gz", APP_ROOT)

    out, _, _ = run(t, f"test -f {DOCROOT}/.htaccess && grep -c PassengerAppRoot {DOCROOT}/.htaccess")
    if out.strip() != "1":
        raise RuntimeError("document-root .htaccess lost its Passenger config — aborting before restart")


def restart(t):
    print("[3/3] restart passenger")
    run(t, f"mkdir -p {PASSENGER}/tmp && touch {PASSENGER}/tmp/restart.txt")
    time.sleep(10)
    out, _, _ = run(t, "curl -sS -o /dev/null -w '%{http_code}' -m 30 https://kassenta.com/api/health")
    print(f"    health: {out.strip()}")


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    t = connect()
    try:
        if what in ("server", "all"):
            deploy_server(t)
        if what in ("web", "all"):
            deploy_web(t)
        restart(t)
        print("done")
    finally:
        t.close()


if __name__ == "__main__":
    main()
