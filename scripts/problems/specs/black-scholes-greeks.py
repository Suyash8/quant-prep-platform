import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Black-Scholes Price and Greeks', difficulty='medium', category='quant-finance', tags=['quant-finance', 'options', 'floating-point'], estMinutes=35,
    statement=[p('For a European call on a non-dividend stock with spot $S$, strike $K$, risk-free rate $r$, volatility $\\sigma$ and maturity $T$ (years), the Black-Scholes model gives:'),
               math('d_1 = \\frac{\\ln(S/K) + (r + \\sigma^2/2)T}{\\sigma\\sqrt{T}}, \\quad d_2 = d_1 - \\sigma\\sqrt{T}'),
               math('C = S\\,\\Phi(d_1) - K e^{-rT}\\Phi(d_2), \\quad \\Delta = \\Phi(d_1), \\quad \\Gamma = \\frac{\\varphi(d_1)}{S\\sigma\\sqrt{T}}, \\quad \\mathcal{V} = S\\,\\varphi(d_1)\\sqrt{T}'),
               p('where $\\Phi$ is the standard normal CDF and $\\varphi$ its density. For each query print $C$, $\\Delta$, $\\Gamma$, $\\mathcal{V}$ (vega per 1.00 of volatility) with exactly 6 decimals, separated by single spaces. Tests keep $|d_1| < 8$ and every printed value away from a rounding tie. Print a value that rounds to zero as `0.000000`.')],
    inputFormat='First line: $q$. Then $q$ lines `S K r sigma T` (decimal numbers).',
    outputFormat='One line per query: `C delta gamma vega`.',
    constraints=['$1 \\le q \\le 1000$', '$0.01 \\le S, K \\le 1000$', '$0 \\le r \\le 0.2$, $0.01 \\le \\sigma \\le 1$, $0.01 \\le T \\le 10$', '$|d_1| < 8$'],
    hints=['Use the error function: $\\Phi(x) = \\tfrac12 \\operatorname{erfc}(-x/\\sqrt2)$.', 'Compute $d_1$ once and reuse it for delta, gamma and vega.'],
    editorial=[p('All four outputs follow from $d_1$ and $d_2$. Using erfc instead of 1 + erf keeps the tails accurate, which matters for deep out of the money options.'),
               p('Self checks: put-call parity, delta in $[0,1]$ and gamma, vega non-negative.')],
    lessons=['opt-black-scholes', 'opt-greeks'])
PI = Decimal('3.14159265358979323846264338327950288419716939937510582097494459230781640628620899')
def Phi(x):
    s = Decimal(0); term = x; n = 0
    while True:
        add = term / (2 * n + 1)
        s += add
        if n > 20 and abs(add) < Decimal(10) ** -70: break
        n += 1; term = -term * x * x / (2 * n)
    return Decimal('0.5') + s / (2 * PI).sqrt()
def pdf(x): return (-x * x / 2).exp() / (2 * PI).sqrt()
def oracle(inp):
    out = []
    for line in inp.strip().split('\n')[1:]:
        S, K, r, sg, T = map(Decimal, line.split())
        sq = sg * T.sqrt(); d1 = ((S / K).ln() + (r + sg * sg / 2) * T) / sq; d2 = d1 - sq
        assert abs(d1) < 8
        C = S * Phi(d1) - K * (-r * T).exp() * Phi(d2)
        vals = [C, Phi(d1), pdf(d1) / (S * sq), S * pdf(d1) * T.sqrt()]
        out.append(' '.join(fixed(rnd(v, 6), 6) if abs(v) >= Decimal('5e-7') else '0.000000' for v in vals))
    return '\n'.join(out)
def gen(r):
    while True:
        qs = []
        for _ in range(r.randint(1, 4)):
            S = r.choice([r.randint(1, 100000) / 100, 100]); K = r.choice([S, r.randint(1, 100000) / 100, round(S * r.uniform(.8, 1.2), 2) or 1])
            qs.append(f"{S:.2f} {K:.2f} {r.randint(0, 2000) / 10000:.4f} {r.randint(100, 10000) / 10000:.4f} {r.randint(1, 1000) / 100:.2f}")
        x = f"{len(qs)}\n" + '\n'.join(qs) + '\n'
        try: oracle(x); return x
        except (AssertionError, Exception): pass
EXAMPLES = ['2\n100.00 100.00 0.0500 0.2000 1.00\n100.00 110.00 0.0000 0.3000 0.50\n']
EDGE = ['3\n100.00 100.00 0.0000 0.0100 0.01\n100.00 100.00 0.2000 1.0000 10.00\n1000.00 1000.00 0.0500 0.2500 1.00\n']
def BIG():
    r = random.Random(175); qs = []
    while len(qs) < 1000:
        S = r.randint(5000, 20000) / 100; K = round(S * r.uniform(.8, 1.2), 2)
        qs.append(f"{S:.2f} {K:.2f} {r.randint(0, 1000) / 10000:.4f} {r.randint(1500, 6000) / 10000:.4f} {r.randint(10, 500) / 100:.2f}")
    return [f"1000\n" + '\n'.join(qs) + '\n']
ORACLE_MAX = 100000
