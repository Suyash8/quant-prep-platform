import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Correlated Asset Clusters', difficulty='medium', category='graphs', tags=['graphs', 'union-find', 'quant-finance'], estMinutes=30,
    statement=[p('A risk team groups assets into clusters. Assets are numbered $0$ to $n-1$. You get pairwise correlations for some pairs. Two assets are **linked** when their correlation is strictly greater than a threshold $\\theta$. A cluster is a maximal set of assets connected through chains of links, so if A is linked to B and B to C, all three are in one cluster even when A and C are not directly linked.'),
               p('All correlations and the threshold have exactly two decimal digits, so compare them exactly as hundredths, never as floating point numbers. Assets with no link form a cluster of one.')],
    inputFormat='First line: $n$, $m$ and $\\theta$ (two decimals). Then $m$ lines `i j rho` with $0 \\le i, j < n$, $i \\ne j$ and $-1.00 \\le \\rho \\le 1.00$ with two decimals.',
    outputFormat='First line: the number of clusters. Then one line per cluster with its members in increasing order separated by spaces. Clusters are ordered by their smallest member.',
    constraints=['$1 \\le n \\le 10^5$, $0 \\le m \\le 2 \\cdot 10^5$', '$\\rho$ and $\\theta$ have exactly two decimal digits', 'A pair may appear more than once; each line is judged on its own'],
    hints=['Use a disjoint set union (union-find) with path compression. Union i and j only when rho > theta.', 'Parse the two decimals into integers (hundredths) so equality at the threshold is exact.'],
    editorial=[p('Each qualifying pair triggers one `union`. With path compression and union by size the total cost is almost linear. After processing every pair, group assets by their root, sort members, and order the clusters by their smallest member.'),
               p('Comparing floats is the trap here: `0.35 > 0.35` is false, but values produced by arithmetic may not compare equal. Converting to integers of hundredths removes the question.')],
    lessons=['disc-graphs-trees', 'alg-graph-traversal', 'pf-diversification-frontier'])
def hund(s):
    neg = s.startswith('-'); s = s.lstrip('-'); w, _, f = s.partition('.'); v = int(w) * 100 + int((f + '00')[:2]); return -v if neg else v
def oracle(inp):
    tok = inp.split(); n, m = int(tok[0]), int(tok[1]); th = hund(tok[2]); label = list(range(n))
    for e in range(m):
        i, j, rho = int(tok[3 + 3 * e]), int(tok[4 + 3 * e]), hund(tok[5 + 3 * e])
        if rho > th:
            a, b = label[i], label[j]
            label = [a if x == b else x for x in label]
    groups = {}
    for v in range(n): groups.setdefault(label[v], []).append(v)
    gl = sorted(groups.values(), key=lambda g: g[0])
    return '\n'.join([str(len(gl))] + [' '.join(map(str, g)) for g in gl])
def gen(r):
    n = r.randint(1, 8); m = r.randint(0, 10); rows = []
    for _ in range(m):
        if n < 2: break
        i, j = r.sample(range(n), 2); rows.append(f"{i} {j} {r.randint(-100, 100) / 100:.2f}")
    return f"{n} {len(rows)} {r.randint(-30, 70) / 100:.2f}\n" + ''.join(x + '\n' for x in rows)
EXAMPLES = ['5 4 0.50\n0 1 0.80\n1 2 0.55\n3 4 0.50\n0 2 -0.20\n']
EDGE = ['1 0 0.00\n', '2 1 -1.00\n0 1 -1.00\n', '2 1 0.99\n0 1 1.00\n', '3 3 0.00\n0 1 0.00\n1 2 -0.01\n0 2 0.01\n', '4 3 -0.50\n3 2 -0.49\n2 1 -0.49\n1 0 -0.49\n', '3 2 0.10\n0 1 0.10\n0 1 0.11\n']
def BIG():
    r = random.Random(101); n = 100000; rows = []
    while len(rows) < 200000:
        a, b = r.randrange(n), r.randrange(n)
        if a != b: rows.append(f"{a} {b} {r.randint(40, 70) / 100:.2f}")
    return [f"{n} 200000 0.50\n" + '\n'.join(rows) + '\n']
