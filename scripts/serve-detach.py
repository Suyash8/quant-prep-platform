#!/usr/bin/env python3
"""Double-fork daemonizer: start the standalone Next.js server so it survives
the tool-call process-group cleanup (same trick pg_ctl uses).
Usage: python3 scripts/serve-detach.py [port]
"""
import os, sys, shutil, subprocess, time, urllib.request

PORT = sys.argv[1] if len(sys.argv) > 1 else "3002"
ROOT = "/home/z/my-project"
STANDALONE = os.path.join(ROOT, ".next/standalone")
LOG = "/tmp/server.log"
ENV = dict(
    os.environ,
    PORT=PORT,
    # FORCE postgres URL — the persistent shell carries a stale file: value
    DATABASE_URL="postgresql://qf@127.0.0.1:5433/quantfoundry?schema=public",
    SESSION_SECRET="audit-loop-secret-0123456789abcdef",
    NODE_ENV="production",
    LD_PRELOAD=f"{ROOT}/scripts/qf-fence.so",
)

# already up?
try:
    urllib.request.urlopen(f"http://localhost:{PORT}/login", timeout=2)
    print(f"server: already up on :{PORT}")
    sys.exit(0)
except Exception:
    pass

pid = os.fork()
if pid > 0:
    # parent: wait for readiness then exit
    for _ in range(50):
        time.sleep(0.3)
        try:
            urllib.request.urlopen(f"http://localhost:{PORT}/login", timeout=2)
            print(f"server: up on :{PORT} (daemon pid in {LOG})")
            sys.exit(0)
        except Exception:
            pass
    print("server: FAILED to become ready — see /tmp/server.log")
    sys.exit(1)

# child: detach completely
os.setsid()
if os.fork() > 0:
    os._exit(0)
os.chdir(STANDALONE)
fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
os.dup2(fd, 1)
os.dup2(fd, 2)
NODE = shutil.which("node") or "/usr/bin/node"
os.execve(NODE, ["node", "server.js"], ENV)
