import random
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; a = t[1:1 + n]
    return str(max(sum(a[l:r + 1]) for l in range(n) for r in range(l, n)))
def gen(r):
    n = r.randint(1, 9); lo = r.choice([-9, -9, -2]); return f"{n}\n{' '.join(str(r.randint(lo, 9)) for _ in range(n))}\n"
EDGE = ['1\n-5\n', '1\n1000000000\n', '3\n-8 -3 -6\n', '4\n0 0 0 0\n', '5\n-1000000000 -1000000000 -1000000000 -1000000000 -1000000000\n', '3\n1000000000 -1000000000 1000000000\n']
def BIG():
    n = 100000
    return [f"{n}\n{' '.join(['1000000000'] * n)}\n", f"{n}\n{' '.join(['-1000000000'] * n)}\n"]
