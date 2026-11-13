import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Exponential Moving Average', difficulty='easy', category='quant-finance', tags=['quant-finance', 'time-series', 'floating-point'], estMinutes=20,
    statement=[p('An exponential moving average (EMA) with span $s$ weighs recent prices more than old ones. It uses the smoothing factor $\\alpha = 2 / (s + 1)$ and is **seeded with the first price**:'),
               math('e_1 = p_1, \\qquad e_i = \\alpha\\, p_i + (1 - \\alpha)\\, e_{i-1} \\quad (i \\ge 2)'),
               p('Print $e_i$ for every day, each with exactly 4 decimal places. Compute with ordinary double precision numbers in the order written above; the tests keep every printed value away from a rounding tie, so any sensible double implementation agrees.')],
    inputFormat='First line: $n$ and $s$. Second line: $n$ prices, each a positive number with at most two decimal digits.',
    outputFormat='$n$ lines: $e_1 \\dots e_n$ with exactly 4 decimals.',
    constraints=['$1 \\le n \\le 10^5$, $1 \\le s \\le 1000$', '$0.01 \\le p_i \\le 10^6$', 'No printed value lies within $10^{-8}$ of a rounding tie at the fourth decimal'],
    hints=['Keep one running value. Initialise it with the first price, then update it once per remaining price.', 'With span 1, alpha is 1, so the EMA equals the price series.'],
    editorial=[p('The recurrence needs only the previous value, so the series costs $O(n)$ time and $O(1)$ extra memory. A span of $s$ corresponds to $\\alpha = 2/(s+1)$, so a span of 9 gives $\\alpha = 0.2$.'),
               p('Seeding with the first price (not with 0 or with an average of the first $s$ prices) is part of the specification. Seeding with 0 pulls the early values far below the prices.')],
    lessons=['qalg-streaming'])
def oracle(inp):
    t = inp.split(); n, s = int(t[0]), int(t[1]); a = Fraction(2, s + 1); e = None; out = []
    for i in range(n):
        pr = Fraction(t[2 + i]); e = pr if e is None else a * pr + (1 - a) * e
        out.append(fixed(rnd(e, 4), 4))
    return '\n'.join(out)
def gen(r):
    while True:
        n = r.randint(1, 8); s = r.choice([1, 2, 3, 5, 9, 20, 1000]); x = f"{n} {s}\n{' '.join(f'{r.randint(1, 20000) / 100:.2f}' for _ in range(n))}\n"
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['5 3\n10.00 11.00 12.00 11.00 10.00\n']
EDGE = ['1 1\n0.01\n', '3 1\n5.00 6.00 7.00\n', '2 1000\n1000000.00 0.01\n', '4 9\n10.00 10.00 10.00 10.00\n', '3 4\n1.00 2.00 3.00\n']
def BIG():
    r = random.Random(171); n = 100000
    return [f"{n} 20\n" + ' '.join(f"{r.randint(1, 10**6) / 100:.2f}" for _ in range(n)) + '\n']
ORACLE_MAX = 1500
