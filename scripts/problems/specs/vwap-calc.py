from fractions import Fraction
import random
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; S = Q = 0
    for i in range(n):
        q, p = t[1 + 2 * i], t[2 + 2 * i]; S += q * p; Q += q
    v = Fraction(S * 100, Q)   # VWAP in units of 1e-4 dollars
    if abs(v - v.__floor__() - Fraction(1, 2)) < Fraction(1, 10**6): raise AssertionError('tie')
    c = round(v)
    return f"{c // 10000}.{c % 10000:04d}"
def gen(r):
    while True:
        n = r.randint(1, 6); s = f"{n}\n" + ''.join(f"{r.randint(1, 500)} {r.randint(1, 100000)}\n" for _ in range(n))
        try: oracle(s); return s
        except AssertionError: pass
EDGE = ['1\n1 1\n', '1\n10000 100000\n', '2\n1 1\n1 2\n'.replace('1 2', '1 4'), '3\n3 1\n1 1\n2 1\n']
def BIG():
    r = random.Random(51); n = 100000
    return ["100000\n" + "10000 100000\n" * n, "100000\n" + ''.join(f"{r.randint(1, 10000)} {r.randint(1, 100000)}\n" for _ in range(n))]
ORACLE_MAX = 10**9
