import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Annualised Sharpe Ratio', difficulty='easy', category='quant-finance', tags=['quant-finance', 'statistics', 'floating-point'], estMinutes=20,
    statement=[p('Given $n$ daily returns $r_i$ in **basis points** (integers) and an annual risk-free rate of $f$ basis points, compute the annualised Sharpe ratio:'),
               math('S = \\frac{\\bar r - f/252}{s} \\sqrt{252}, \\qquad s = \\sqrt{\\frac{n\\sum r_i^2 - (\\sum r_i)^2}{n(n-1)}}'),
               p('where $\\bar r$ is the mean of the returns and $s$ the sample standard deviation. If the numerator $n\\sum r_i^2 - (\\sum r_i)^2$ is 0 (or $n = 1$), print `0.0000`. Otherwise print $S$ with exactly 4 decimals. Compute the numerator in exact integer arithmetic (use 64-bit integers).')],
    inputFormat='First line: $n$ and $f$. Second line: $n$ integers $r_i$.',
    outputFormat='One number with 4 decimals.',
    constraints=['$1 \\le n \\le 10^5$', '$|r_i| \\le 10^4$, $0 \\le f \\le 10^4$', 'The printed value is not within $10^{-8}$ of a rounding tie'],
    hints=['Use the integer form of the variance so a constant series gives exactly zero.', 'Sums of squares reach about $10^{13}$, so use 64-bit integers.'],
    editorial=[p('Accumulate $\\sum r$ and $\\sum r^2$ as integers. The numerator $n\\sum r^2-(\\sum r)^2$ is exact and is 0 exactly when all returns are equal, which avoids a division by a tiny float.'),
               p('Then $S=(\\bar r-f/252)\\sqrt{252}/s$ in double precision.')],
    lessons=['pf-performance-ratios', 'qalg-streaming'])
def oracle(inp):
    t = inp.split(); n, f = int(t[0]), int(t[1]); r = list(map(int, t[2:2 + n]))
    num = n * sum(x * x for x in r) - sum(r) ** 2
    if n == 1 or num == 0: return '0.0000'
    s = (Decimal(num) / (n * (n - 1))).sqrt()
    S = (Decimal(sum(r)) / n - Decimal(f) / 252) / s * Decimal(252).sqrt()
    return fixed(rnd(S, 4), 4)
def gen(r):
    while True:
        n = r.randint(1, 10); m = r.choice([5, 100, 10000]); x = f"{n} {r.randint(0, 10000)}\n{' '.join(str(r.randint(-m, m)) for _ in range(n))}\n"
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['5 0\n10 -5 20 0 15\n']
EDGE = ['1 100\n50\n', '3 0\n7 7 7\n', '2 0\n-10000 10000\n', '4 10000\n0 0 0 1\n']
def BIG():
    r = random.Random(172); n = 100000
    return [f"{n} 250\n" + ' '.join(str(r.randint(-10000, 10000)) for _ in range(n)) + '\n']
ORACLE_MAX = 100000
