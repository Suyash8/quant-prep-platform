from fractions import Fraction
from decimal import Decimal
def oracle(inp):
    t = inp.split(); n = int(t[0]); out = []
    for i in range(n):
        p = Fraction(Decimal(t[1 + 2 * i])); b = Fraction(Decimal(t[2 + 2 * i]))
        f = (b * p - (1 - p)) / b
        if f < 0: f = Fraction(0)
        s = f * 10000
        frac = s - (s.numerator // s.denominator)
        if abs(frac - Fraction(1, 2)) < Fraction(1, 10**7): raise AssertionError('near tie')
        c = (s + Fraction(1, 2)).__floor__()
        out.append(f"{c // 10000}.{c % 10000:04d}")
    return '\n'.join(out)
def gen(r):
    while True:
        n = r.randint(1, 5)
        s = f"{n}\n" + ''.join(f"{r.randint(0, 100) / 100:.2f} {r.choice([1, 2, 3, 0.5, 0.25, 4.5, 10]) if r.random() < .5 else r.randint(1, 50) / 10:.2f}\n" for _ in range(n))
        try: oracle(s); return s
        except AssertionError: pass
EDGE = ['2\n1.00 3.0\n0.00 2.0\n', '1\n0.50 1.0\n', '1\n0.99 1000.00\n', '1\n1.00 0.01\n', '1\n0.00 1000.00\n', '3\n0.25 3.0\n0.75 0.5\n0.60 0.4\n']
