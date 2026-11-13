import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Bond Price and Yield to Maturity', difficulty='medium', category='quant-finance', tags=['quant-finance', 'fixed-income', 'bisection', 'floating-point'], estMinutes=35,
    statement=[p('A bond pays a coupon $c = F \\cdot (\\text{coupon rate}) / m$ at the end of each of $m$ periods per year, for $N = m \\cdot \\text{years}$ periods, and returns the face value $F$ with the last coupon. With annual yield $y$ (compounded $m$ times a year) and $i = y / m$:'),
               math('P(y) = \\sum_{t=1}^{N} \\frac{c}{(1+i)^t} + \\frac{F}{(1+i)^N}'),
               p('Answer two kinds of queries. `P F cpn m years y` asks for the price with $y$ given in percent. `Y F cpn m years price` asks for the yield in percent, found by bisection of the annual yield on $[0, 1]$ (0% to 100%); the price is strictly decreasing in $y$. Print every answer with exactly 4 decimals. Tests only use prices that lie between $P(1)$ and $P(0)$, and keep outputs away from a rounding tie.')],
    inputFormat='First line: $q$. Then $q$ lines, each a query as above. `cpn` and `y` are percents, `years` is an integer, `m` is one of 1, 2, 4, 12.',
    outputFormat='One line per query with 4 decimals.',
    constraints=['$1 \\le q \\le 200$', '$F \\le 10^6$, $1 \\le \\text{years} \\le 30$', '$0 \\le \\text{cpn}, y \\le 100$'],
    hints=['Price is a plain sum of discounted cash flows. Loop over periods.', 'For the yield use 100 to 200 bisection steps: lo=0 gives the highest price, hi=1 the lowest.'],
    editorial=[p('Evaluate $P(y)$ in $O(N)$. Because $P$ is strictly decreasing in $y$, bisection on $[0,1]$ converges to the yield; 100 halvings give far more than the 4 decimals needed.'),
               p('A bond priced at par has yield equal to the coupon rate. That is a useful self check.')],
    lessons=['fi-bond-pricing-yield', 'numa-root-finding'])
def price(F, cpn, m, yrs, y):
    N = m * yrs; i = y / m; c = F * cpn / m; v = 1 / (1 + i)
    return c * (1 - v ** N) / i + F * v ** N if i != 0 else c * N + F
def oracle(inp):
    out = []
    for line in inp.strip().split('\n')[1:]:
        t = line.split(); F = Fraction(t[1]); cpn = Fraction(t[2]) / 100; m = int(t[3]); yrs = int(t[4]); x = Fraction(t[5])
        if t[0] == 'P':
            out.append(fixed(rnd(price(F, cpn, m, yrs, x / 100), 4), 4))
        else:
            lo, hi = Fraction(0), Fraction(1)
            for _ in range(60):
                mid = (lo + hi) / 2
                if price(F, cpn, m, yrs, mid) > x: lo = mid
                else: hi = mid
            out.append(fixed(rnd((lo + hi) / 2 * 100, 4), 4))
    return '\n'.join(out)
def gen(r):
    while True:
        qs = []
        for _ in range(r.randint(1, 4)):
            F = r.choice([100, 1000, 5000]); cpn = r.randint(0, 2000) / 100; m = r.choice([1, 2, 4, 12]); yrs = r.randint(1, 30)
            if r.random() < .5: qs.append(f"P {F} {cpn:.2f} {m} {yrs} {r.randint(0, 3000) / 100:.2f}")
            else:
                pr = price(Fraction(F), Fraction(f"{cpn:.2f}") / 100, m, yrs, Fraction(r.randint(100, 2500), 10000))
                qs.append(f"Y {F} {cpn:.2f} {m} {yrs} {float(pr):.2f}")
        x = f"{len(qs)}\n" + '\n'.join(qs) + '\n'
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['2\nP 1000 5.00 2 10 5.00\nP 100 0.00 1 5 8.00\n']
EDGE = ['3\nP 1000 6.00 2 10 0.00\nP 100 10.00 1 1 100.00\nP 1000 5.00 12 30 5.00\n']
def BIG(): return []
ORACLE_MAX = 100000
