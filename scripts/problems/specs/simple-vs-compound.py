from fractions import Fraction
from decimal import Decimal
def oracle(inp):
    p, r, t = inp.split(); P = int(p); R = Fraction(Decimal(r)); t = int(t)
    comp = P * (1 + R / 100) ** t; simple = P * R * t / 100
    gap = abs(comp - simple); s = gap * 100
    fr = s - s.__floor__()
    if abs(fr - Fraction(1, 2)) < Fraction(1, 10**4) * 100: raise AssertionError('near tie')
    c = (s + Fraction(1, 2)).__floor__()
    return f"{c // 100}.{c % 100:02d}"
def gen(r):
    while True:
        s = f"{r.choice([r.randint(1, 1000), r.randint(1, 10**6)])} {r.randint(1, 1500) / 100:.2f} {r.randint(1, 30)}\n"
        try: oracle(s); return s
        except AssertionError: pass
EDGE = ['1 0.01 1\n', '1 15.00 30\n', '1000000 15.00 30\n', '1000000 0.01 30\n', '5000 10.00 3\n', '1000 5.00 10\n', '1 0.01 30\n']
