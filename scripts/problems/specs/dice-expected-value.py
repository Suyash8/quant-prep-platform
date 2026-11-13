from fractions import Fraction
def oracle(inp):
    n = int(inp.split()[0])
    e = Fraction(0)
    for _ in range(n): e += Fraction(1 + 2 + 3 + 4 + 5 + 6, 6)
    return str(e.numerator) if e.denominator == 1 else f"{e.numerator}/{e.denominator}"
import random
def gen(r): return f"{r.randint(1, 60)}\n"
EDGE = ['1\n', '2\n', '3\n', '59\n', '60\n', '30\n', '7\n']
