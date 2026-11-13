import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Volume-Weighted Order Slicing', difficulty='medium', category='quant-finance', tags=['quant-finance', 'execution', 'rounding'], estMinutes=30,
    statement=[p('An execution algorithm trades a parent order of $Q$ shares across $n$ time buckets in proportion to a forecast volume curve $v_1 \\dots v_n$. The ideal share count for bucket $i$ is $Q \\cdot v_i / V$ with $V = \\sum v_i$, which is rarely a whole number.'),
               p('Use the **largest remainder method**. Give each bucket $\\lfloor Q v_i / V \\rfloor$ shares. The shares still unassigned (fewer than $n$) go one each to the buckets with the largest fractional parts $(Q v_i) \\bmod V$. If two buckets have equal fractional parts, the **earlier** bucket wins. The slices then sum to exactly $Q$.')],
    inputFormat='First line: $n$ and $Q$. Second line: $n$ non-negative integers $v_1 \\dots v_n$ with at least one positive value.',
    outputFormat='One line: the $n$ slice sizes separated by single spaces.',
    constraints=['$1 \\le n \\le 10^5$, $0 \\le Q \\le 10^9$', '$0 \\le v_i \\le 10^6$ and $V = \\sum v_i \\ge 1$', '$Q \\cdot v_i$ fits in a signed 64-bit integer'],
    hints=['Compute floor(Q * v_i / V) and the remainder (Q * v_i) % V in integers. Never use floating point.', 'Sort bucket indices by (remainder descending, index ascending) and give the first Q - sum(floor) of them one extra share.'],
    editorial=[p('Integer arithmetic keeps the split exact. Let $f_i = \\lfloor Q v_i / V \\rfloor$ and $r_i = Q v_i \\bmod V$. The leftover $L = Q - \\sum f_i$ is always less than $n$, and it is handed out by sorting on $r_i$. A bucket with $v_i = 0$ has $r_i = 0$ and is only picked after every positive remainder, and never if $L$ is covered by larger remainders.'),
               p('Rounding each bucket independently with `round()` can make the total miss $Q$ by several shares. Largest remainder guarantees the total and keeps every slice within one share of its ideal value.')],
    lessons=['mic-execution-algos', 'mkt-order-types', 'mic-spreads-impact'])
def oracle(inp):
    t = list(map(int, inp.split())); n, Q = t[0], t[1]; v = t[2:2 + n]; V = sum(v)
    fl = [Q * x // V for x in v]; rem = [Q * x % V for x in v]; left = Q - sum(fl)
    order = sorted(range(n), key=lambda i: (-rem[i], i))
    for i in order[:left]: fl[i] += 1
    return ' '.join(map(str, fl))
def gen(r):
    n = r.randint(1, 7); v = [r.randint(0, 6) for _ in range(n)]
    if sum(v) == 0: v[0] = 1
    return f"{n} {r.randint(0, 30)}\n{' '.join(map(str, v))}\n"
EXAMPLES = ['4 10\n1 2 3 4\n', '3 5\n1 1 1\n']
EDGE = ['1 0\n5\n', '1 1000000000\n1\n', '3 2\n0 1 0\n', '5 1\n1 1 1 1 1\n', '4 1000000000\n1000000 0 0 1000000\n', '3 7\n2 2 2\n']
def BIG():
    r = random.Random(151); n = 100000
    return [f"{n} 1000000000\n" + ' '.join(str(r.randint(0, 10**6)) for _ in range(n)) + '\n', f"{n} 99999\n" + ' '.join(['1'] * n) + '\n']
ORACLE_MAX = 10**9
