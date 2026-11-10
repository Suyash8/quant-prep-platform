#!/usr/bin/env python3
"""Generic double-fork detach runner: python3 detach-run.py <logfile> <cmd...>"""
import os, sys

LOG = sys.argv[1]
CMD = sys.argv[2:]

pid = os.fork()
if pid > 0:
    print(f"detached: {CMD} -> {LOG}")
    sys.exit(0)

os.setsid()
if os.fork() > 0:
    os._exit(0)

fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(fd, 1)
os.dup2(fd, 2)
fdin = os.open("/dev/null", os.O_RDONLY)
os.dup2(fdin, 0)
os.execvp(CMD[0], CMD)
