import random
def oracle(inp):
    tok = inp.split(); n = int(tok[0]); d = {}
    for i in range(n):
        s, q = tok[1 + 2 * i], int(tok[2 + 2 * i]); d[s] = d.get(s, 0) + q
    return '\n'.join(f"{k} {d[k]}" for k in sorted(d, key=lambda s: s.encode()))
def gen(r):
    n = r.randint(1, 10); syms = ['A', 'AB', 'B1', 'B2', 'A10', '9', 'Z', 'ZZ0', '0A']
    return f"{n}\n" + ''.join(f"{r.choice(syms)} {r.randint(-9, 9)}\n" for _ in range(n))
EDGE = ['1\nA 0\n', '3\nA 1000000000\nA 1000000000\nA -1000000000\n', '4\nB 5\nA -5\n0 1\n9 2\n', '2\nABCDEFGHIJ 1\nABCDEFGHI -1\n']
def BIG():
    r = random.Random(8)
    syms = [''.join(r.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(r.randint(1, 10))) for _ in range(5000)]
    return ["200000\n" + ''.join(f"{r.choice(syms)} {r.choice([-1, 1]) * 10**9}\n" for _ in range(200000)), "200000\n" + "AAPL 1000000000\n" * 200000]
