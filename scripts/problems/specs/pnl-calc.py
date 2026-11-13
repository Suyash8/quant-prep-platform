from fractions import Fraction
import random
def oracle(inp):
    tok = inp.split(); n = int(tok[0]); tot = Fraction(0)
    for i in range(n):
        side, q, p = tok[1 + 3 * i:4 + 3 * i]; v = int(q) * Fraction(p)
        tot += v if side == 'S' else -v
    c = int(tot * 100); sign = '-' if c < 0 else ''
    return f"{sign}{abs(c) // 100}.{abs(c) % 100:02d}"
def gen(r):
    pos = 0; ev = []
    for _ in range(r.randint(1, 10)):
        if pos > 0 and r.random() < .5:
            q = r.randint(1, pos); pos -= q; ev.append(f"S {q} {r.randint(1, 20000) / 100:.2f}")
        else:
            q = r.randint(1, 9); pos += q; ev.append(f"B {q} {r.randint(1, 20000) / 100:.2f}")
    if pos > 0: ev.append(f"S {pos} {r.randint(1, 20000) / 100:.2f}")
    return f"{len(ev)}\n" + '\n'.join(ev) + '\n'
EDGE = ['2\nB 1 0.01\nS 1 0.01\n', '2\nB 1 0.01\nS 1 0.02\n', '2\nB 1 0.02\nS 1 0.01\n', '2\nB 10000 1000.00\nS 10000 1000.00\n', '2\nB 10000 1000.00\nS 10000 0.01\n', '4\nB 3 10.10\nS 1 10.10\nB 1 0.10\nS 3 10.20\n']
def BIG():
    r = random.Random(21); ev = []; pos = 0
    for i in range(100000):
        if i == 99999 or (pos > 0 and (r.random() < .5 or i >= 99999 - 1)): 
            q = pos if i == 99999 else r.randint(1, pos); pos -= q; ev.append(f"S {q} {r.randint(1, 100000) / 100:.2f}")
        else:
            q = r.randint(1, 3); pos += q; ev.append(f"B {q} {r.randint(1, 100000) / 100:.2f}")
    return ["100000\n" + '\n'.join(ev) + '\n']
