import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Maximum Drawdown', difficulty='easy', category='quant-finance', tags=['quant-finance', 'arrays', 'risk'], estMinutes=20,
    statement=[p('A risk report tracks the value of a strategy at the end of each day. The **drawdown** on day $j$ is how far the value has fallen from its highest earlier value, as a fraction of that peak. The **maximum drawdown** is the largest drawdown over the whole history.'),
               math('\\text{MDD} = \\max_{i \\le j} \\; \\frac{v_i - v_j}{v_i}'),
               p('A strategy that never falls below an earlier value has a maximum drawdown of $0$. Print the result as a fraction (not a percentage) with exactly 4 decimal places.')],
    inputFormat='First line: $n$. Second line: $n$ equity values $v_1 \\dots v_n$, each a positive number with at most two decimal digits.',
    outputFormat='One line: the maximum drawdown as a fraction with exactly 4 decimals, for example `0.2500`.',
    constraints=['$1 \\le n \\le 10^5$', '$0.01 \\le v_i \\le 10^6$, at most two decimal digits', 'No test value lies within $10^{-8}$ of a rounding tie at the fourth decimal'],
    hints=['Scan once and keep the running peak. At each day the drawdown is (peak - value) / peak.', 'The best peak for day j is the highest value seen up to and including day j, so one pass is enough.'],
    editorial=[p('Keep `peak = max(peak, v)` and `best = max(best, (peak - v) / peak)`. The peak that maximises the drawdown on day j is always the running maximum, so the pairwise $O(n^2)$ definition collapses to $O(n)$.'),
               p('Drawdown is measured against the peak, not against the starting value. A curve that doubles and then halves has a drawdown of 0.5 from the peak even though it ends at its start.')],
    lessons=['risk-drawdown-hedging', 'pf-performance-ratios'])
def oracle(inp):
    t = inp.split(); n = int(t[0]); v = [Fraction(x) for x in t[1:1 + n]]; best = Fraction(0)
    for i in range(n):
        for j in range(i, n): best = max(best, (v[i] - v[j]) / v[i])
    return fixed(rnd(best, 4), 4)
def gen(r):
    while True:
        n = r.randint(1, 8); s = f"{n}\n{' '.join(f'{r.randint(1, 3000) / 100:.2f}' for _ in range(n))}\n"
        try: oracle(s); return s
        except AssertionError: pass
EXAMPLES = ['6\n100.00 120.00 90.00 130.00 65.00 80.00\n', '3\n10.00 11.00 12.50\n']
EDGE = ['1\n0.01\n', '2\n1000000.00 0.01\n', '4\n5.00 5.00 5.00 5.00\n', '5\n1.00 2.00 1.00 2.00 1.00\n', '3\n3.00 2.00 1.00\n']
def BIG():
    r = random.Random(61); v = 1000.0; out = []
    for _ in range(100000): v = max(0.01, v * (1 + r.uniform(-.02, .0205))); out.append(f"{v:.2f}")
    return ["100000\n" + ' '.join(out) + '\n']
ORACLE_MAX = 3000
