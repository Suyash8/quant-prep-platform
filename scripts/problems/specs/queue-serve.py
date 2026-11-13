from collections import deque
import random
def oracle(inp):
    tok = inp.split(); n, q = int(tok[0]), int(tok[1]); dq = deque((tok[2 + 2 * i], int(tok[3 + 2 * i])) for i in range(n))
    t = 0; out = []
    while dq:
        name, rem = dq.popleft(); run = min(q, rem); t += run; rem -= run
        if rem: dq.append((name, rem))
        else: out.append(f"{name} {t}")
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 6); q = r.randint(1, 8)
    return f"{n} {q}\n" + ''.join(f"j{i} {r.randint(1, 30)}\n" for i in range(n))
EDGE = ['1 1000000000\nA 1000000000\n', '2 1\nA 3\nB 3\n', '3 5\nA 5\nB 5\nC 5\n', '2 1000000000\nA 1000000000\nB 1\n', '3 2\nx1 1\ny2 4\nz 2\n']
def BIG():
    r = random.Random(13); n = 100000
    a = f"{n} 1000000000\n" + ''.join(f"id{i} {r.randint(1, 10**9)}\n" for i in range(n))        # one quantum each
    b = f"{n} 10\n" + ''.join(f"id{i} {r.randint(1, 20)}\n" for i in range(n))                    # at most 2 quanta each
    return [a, b]
META = {'constraints': ['$1 \\le n \\le 10^5$', 'durations and quantum up to $10^9$, use 64-bit totals', 'the total number of quanta $\\sum \\lceil d_i / q \\rceil$ is at most $2 \\cdot 10^6$, so simulating the queue step by step is fast enough']}
