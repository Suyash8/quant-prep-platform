import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='American Put on a Binomial Tree', difficulty='hard', category='quant-finance', tags=['quant-finance', 'options', 'dynamic-programming', 'floating-point'], estMinutes=45,
    statement=[p('Price an American put with the Cox-Ross-Rubinstein tree. With $\\Delta t = T/N$:'),
               math('u = e^{\\sigma\\sqrt{\\Delta t}}, \\quad d = 1/u, \\quad q = \\frac{e^{r\\Delta t} - d}{u - d}, \\quad \\text{disc} = e^{-r\\Delta t}'),
               p('Node $(i, j)$ ($i$ steps, $j$ up moves) has spot $S u^{j} d^{\\,i-j}$. At step $N$ the value is $\\max(K - S_{N,j}, 0)$. Going backwards, the value at a node is the larger of the immediate exercise value $K - S_{i,j}$ and the continuation value $\\text{disc}\\,(q\\,V_{i+1,j+1} + (1-q)\\,V_{i+1,j})$, and never below 0. Print the root value with exactly 6 decimals. Tests keep the answer away from a rounding tie.')],
    inputFormat='One line: `S K r sigma T N`.',
    outputFormat='One number with 6 decimals.',
    constraints=['$1 \\le N \\le 1000$', '$1 \\le S, K \\le 1000$', '$0 \\le r \\le 0.2$, $0.01 \\le \\sigma \\le 1$, $0.01 \\le T \\le 10$', '$0 < q < 1$'],
    hints=['Keep one array of $N+1$ values and roll it back one level at a time.', 'Compute the spot at a node from its level and up count; exercise is checked at every node.'],
    editorial=[p('Rolling a single array gives $O(N^2)$ time and $O(N)$ memory. The early exercise check at each node is the only difference from the European put.'),
               p('With $r = 0$ early exercise has no benefit, so the American put equals the European one. That is a good test.')],
    lessons=['opt-exotics-american', 'opt-binomial', 'prc-binomial-engine'])
def oracle(inp):
    S, K, r, sg, T = map(Decimal, inp.split()[:5]); N = int(inp.split()[5])
    dt = T / N; u = (sg * dt.sqrt()).exp(); d = 1 / u; q = ((r * dt).exp() - d) / (u - d); disc = (-r * dt).exp()
    assert 0 < q < 1
    u2 = u * u; sN = S * d ** N
    V = []; s = sN
    for j in range(N + 1):
        V.append(max(K - s, Decimal(0))); s *= u2
    for i in range(N - 1, -1, -1):
        s = S * d ** i
        for j in range(i + 1):
            V[j] = max(K - s, disc * (q * V[j + 1] + (1 - q) * V[j]), Decimal(0)); s *= u2
    return fixed(rnd(V[0], 6), 6)
def gen(r):
    while True:
        x = f"{r.randint(100, 20000) / 100:.2f} {r.randint(100, 20000) / 100:.2f} {r.randint(0, 1500) / 10000:.4f} {r.randint(500, 8000) / 10000:.4f} {r.randint(10, 500) / 100:.2f} {r.randint(1, 30)}\n"
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['100.00 100.00 0.0500 0.2000 1.00 3\n']
EDGE = ['100.00 100.00 0.0000 0.2000 1.00 10\n', '50.00 100.00 0.1000 0.3000 2.00 20\n', '100.00 1.00 0.0500 0.2000 1.00 5\n', '100.00 100.00 0.0500 0.2000 1.00 1\n', '100.00 100.00 0.0100 0.0100 10.00 50\n']
def BIG(): return ['100.00 105.00 0.0500 0.2500 1.00 1000\n', '80.00 100.00 0.0800 0.4000 3.00 1000\n']
ORACLE_MAX = 100000
