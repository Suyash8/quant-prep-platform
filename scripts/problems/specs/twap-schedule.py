import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='TWAP Slice Schedule', difficulty='easy', category='quant-finance', tags=['quant-finance', 'execution', 'math'], estMinutes=15,
    statement=[p('A time-weighted average price (TWAP) algorithm splits a parent order of $Q$ shares into $n$ child orders of nearly equal size, one per time slice. Shares are indivisible, so when $n$ does not divide $Q$ a remainder is left over.'),
               p('Every slice gets $\\lfloor Q / n \\rfloor$ shares. The $Q \\bmod n$ leftover shares are handed out one each to the **earliest** slices. If $Q < n$, the first $Q$ slices get one share and the rest get zero. Print the schedule for each parent order.')],
    inputFormat='First line: $t$. Then $t$ lines, each with two integers $Q$ and $n$.',
    outputFormat='For each query, one line with the $n$ slice sizes separated by single spaces, in time order.',
    constraints=['$1 \\le t \\le 10^4$', '$0 \\le Q \\le 10^9$, $1 \\le n \\le 10^5$', 'The sum of all $n$ over all queries is at most $2 \\cdot 10^5$'],
    hints=['Integer division and modulo give the base size and the remainder.', 'Slice i (0-based) gets one extra share exactly when i < Q mod n.'],
    editorial=[p('With `base, rem = divmod(Q, n)`, slice $i$ is `base + (1 if i < rem else 0)`. The slices sum to $Q$ and differ by at most one share, which is the most even split possible with whole shares.'),
               p('Front-loading the remainder is a convention. Real schedulers sometimes spread the extra shares or put them last, so the output rule belongs to the specification.')],
    lessons=['mic-execution-algos', 'mkt-order-types', 'tsmd-oms-positions'])
def oracle(inp):
    t = list(map(int, inp.split())); q = t[0]; out = []
    for i in range(q):
        Q, n = t[1 + 2 * i], t[2 + 2 * i]; slices = [0] * n
        for _ in range(Q % n if Q >= n else Q): pass
        base = Q // n; slices = [base] * n; left = Q - base * n; k = 0
        while left: slices[k] += 1; left -= 1; k += 1
        out.append(' '.join(map(str, slices)))
    return '\n'.join(out)
def gen(r):
    t = r.randint(1, 4); return f"{t}\n" + ''.join(f"{r.randint(0, 40)} {r.randint(1, 9)}\n" for _ in range(t))
EXAMPLES = ['3\n10 3\n9 3\n2 5\n']
EDGE = ['1\n0 1\n', '1\n0 5\n', '1\n1 1\n', '1\n1000000000 1\n', '1\n1000000000 7\n', '2\n5 8\n8 5\n', '1\n999999999 100000\n']
def BIG():
    return ["2\n1000000000 100000\n999999999 99999\n"]
ORACLE_MAX = 10**9
