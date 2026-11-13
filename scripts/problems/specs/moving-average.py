from fractions import Fraction
import random
def oracle(inp):
    t = list(map(int, inp.split())); n, k = t[0], t[1]; p = t[2:2 + n]; out = []
    for i in range(n - k + 1):
        s = sum(p[i:i + k]); c = (Fraction(100 * s, k) + Fraction(1, 2)).__floor__()
        out.append(f"{c // 100}.{c % 100:02d}")
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 10); k = r.randint(1, n); return f"{n} {k}\n{' '.join(str(r.randint(0, 20)) for _ in range(n))}\n"
EDGE = ['3 2\n0 0 1\n', '2 2\n9 0\n', '1 1\n1000000\n', '4 4\n1 1 1 0\n', '5 2\n1 0 0 1 1\n', '3 3\n3 3 3\n', '4 8\n'.replace('4 8', '8 8') + '1 0 0 0 0 0 0 1\n', '8 8\n1 1 0 0 0 0 0 0\n']
def BIG():
    r = random.Random(9); n = 100000
    return [f"{n} 7\n{' '.join(str(r.randint(0, 10**6)) for _ in range(n))}\n", f"{n} {n}\n{' '.join(['1000000'] * n)}\n", f"{n} 1\n{' '.join(str(r.randint(0, 10**6)) for _ in range(n))}\n"]
