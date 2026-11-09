#!/usr/bin/env python3
"""Embed tailored interactive blocks into lessons that lack them."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, 'content', 'lessons')

# lesson file -> (component, params, insert-after-block-type)
PLANS = {
    'linux-terminal-filesystem.json': (
        'TerminalSteps',
        {'steps': [
            {'cmd': 'pwd', 'out': ['/home/quant'], 'note': 'Print working directory — where am I?'},
            {'cmd': 'ls -l /var/log/syslog', 'out': ['-rw-r----- 1 syslog adm 482K Nov  9 06:25 /var/log/syslog'], 'note': 'A file: type, permissions, owner, group, size, mtime, name.'},
            {'cmd': 'cd /var/log && ls | head -3', 'out': ['alternatives.log', 'apt', 'boot.log']},
            {'cmd': 'man hier', 'out': ['NAME', '       hier - description of the filesystem hierarchy', '...']},
        ]},
    ),
    'linux-pipes-scripting.json': (
        'PipePipeline',
        {'commands': ['cat fills.csv', 'grep BUY', 'awk -F, \'{print $3}\'', 'sort -n', 'head -5']},
    ),
    'linux-permissions-processes.json': (
        'PermissionBits',
        {'initialOctal': '755'},
    ),
    'linux-monitoring-ssh.json': (
        'TerminalSteps',
        {'steps': [
            {'cmd': 'top -bn1 | head -5', 'out': ['top - 14:02:11 up 12 days,  3 users,  load average: 1.42, 1.09, 0.87', 'Tasks: 231 total,   2 running, 229 sleeping', '%Cpu(s): 23.1 us,  4.2 sy,  0.0 ni, 71.9 id', 'MiB Mem :  32000.0 total,   8100.2 free,  4200.1 used'], 'note': 'load average, run queue, CPU split, memory — the first four things to check.'},
            {'cmd': 'df -h /data', 'out': ['Filesystem      Size  Used Avail Use% Mounted on', '/dev/nvme0n1p2  916G  612G  258G  71% /data'], 'note': 'A full disk takes down more trading systems than any bug.'},
            {'cmd': 'ss -tulpn | grep 3010', 'out': ['tcp LISTEN 0 128 127.0.0.1:3010 0.0.0.0:* users:(("code-runner",pid=4123,fd=6))']},
            {'cmd': 'journalctl -u runner -n 2 --no-pager', 'out': ['Nov 09 06:24:58 host runner[4123]: job 8f3a completed ok in 37ms', 'Nov 09 06:25:01 host runner[4123]: job 91bc compile error (exit 1)']},
        ]},
    ),
    'net-tcp-udp.json': (
        'PacketJourney',
        {},
    ),
    'net-sockets.json': (
        'TerminalSteps',
        {'steps': [
            {'cmd': 'nc -l 8080', 'out': ['listening on 0.0.0.0:8080 …'], 'note': 'netcat as a one-line server: it accept()s, then echoes what arrives.'},
            {'cmd': 'echo "BUY 100 AAPL" | nc localhost 8080', 'out': ['(server side prints:) BUY 100 AAPL'], 'note': 'The client connect()s, writes bytes, closes. That is the essence of a socket.'},
            {'cmd': 'ss -tn state established', 'out': ['Recv-Q  Send-Q  Local Address:Port   Peer Address:Port', '0      0       127.0.0.1:52314     127.0.0.1:8080']},
        ]},
    ),
    'db-joins-aggregations.json': (
        'JoinVisual',
        {'left': [{'id': 1, 'name': 'AAPL'}, {'id': 2, 'name': 'MSFT'}, {'id': 3, 'name': 'ORCL'}],
         'right': [{'id': 2, 'name': 'MSFT'}, {'id': 3, 'name': 'ORCL'}, {'id': 4, 'name': 'NVDA'}]},
    ),
    'll-methodology.json': (
        'PercentileExplorer',
        {},
    ),
    'll-latency-budgets.json': (
        'LatencyBudget',
        {'parts': [
            {'name': 'wire + switch', 'ns': 800},
            {'name': 'NIC + driver', 'ns': 2500},
            {'name': 'kernel stack', 'ns': 3200},
            {'name': 'app decode + strategy', 'ns': 8000},
        ]},
    ),
    'tsmd-connectivity.json': (
        'PacketJourney',
        {},
    ),
    'tsmd-matching-strategy.json': (
        'OrderStateMachine',
        {'quantity': 500},
    ),
    'tsmd-oms-positions.json': (
        'OrderStateMachine',
        {'quantity': 1000},
    ),
    'cpp-allocators-pools.json': (
        'MemoryPool',
        {},
    ),
    'la-svd-covariance.json': (
        'CovarianceLab',
        {},
    ),
    'numa-errors-stability.json': (
        'FloatErrorLab',
        {},
    ),
    'swe-build-systems.json': (
        'TerminalSteps',
        {'steps': [
            {'cmd': 'cmake -B build -DCMAKE_BUILD_TYPE=Release', 'out': ['-- The CXX compiler identification is GNU 13.2.0', '-- Configuring done (0.4s)', '-- Generating done (0.1s)'], 'note': 'Configure: CMake probes the toolchain and writes build/build.ninja.'},
            {'cmd': 'cmake --build build -j8', 'out': ['[3/7] Building CXX object CMakeFiles/pricer.dir/src/pricer.cpp.o', '[7/7] Linking CXX executable pricer', 'Link time: 1.9s'], 'note': 'Build: only what changed recompiles — the whole point of a build system.'},
            {'cmd': 'head -4 build/compile_commands.json', 'out': ['[', '  {', '    "directory": "/work/pricer/build",', '    "command": "/usr/bin/g++ -std=c++20 -O2 -c …"']},
        ]},
    ),
}

def insert_interactive(lesson, component, params):
    blocks = lesson['blocks']
    if any(b.get('type') == 'interactive' for b in blocks):
        return False, 'already has interactive'
    block = {'type': 'interactive', 'component': component, 'params': params}
    # insert after the last code/math block, else after the 3rd block, else append
    idx = None
    for i, b in enumerate(blocks):
        if b.get('type') in ('code', 'math'):
            idx = i
    if idx is None:
        idx = min(3, len(blocks) - 1)
    blocks.insert(idx + 1, block)
    return True, f'inserted {component} at block {idx + 1}'

changed, skipped = 0, []
for fname, (component, params) in PLANS.items():
    # find the module dir containing this lesson
    found = None
    for mod in os.listdir(LDIR):
        p = os.path.join(LDIR, mod, fname)
        if os.path.exists(p):
            found = p
            break
    if not found:
        skipped.append((fname, 'FILE NOT FOUND'))
        continue
    with open(found) as f:
        lesson = json.load(f)
    ok, msg = insert_interactive(lesson, component, params)
    if ok:
        with open(found, 'w') as f:
            json.dump(lesson, f, indent=2, ensure_ascii=False)
            f.write('\n')
        changed += 1
        print(f'  ✓ {fname}: {msg}')
    else:
        skipped.append((fname, msg))

print(f'\n{changed} lessons updated, {len(skipped)} skipped')
for s in skipped:
    print(f'  - {s[0]}: {s[1]}')
