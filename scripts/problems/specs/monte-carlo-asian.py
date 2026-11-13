import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Monte Carlo Asian Call', difficulty='hard', category='quant-finance', tags=['quant-finance', 'options', 'monte-carlo', 'simulation', 'floating-point'], estMinutes=45,
    statement=[p('Price an arithmetic-average Asian call with a **fixed pseudo random generator**, so every correct program gets the same answer. The generator is a linear congruential generator with state $x$ (start $x = \\text{seed}$):'),
               math('x \\leftarrow (1103515245\\, x + 12345) \\bmod 2^{31}'),
               p('Each path has $N$ steps. At each step advance the generator once, then move **up** if bit 30 of the new $x$ (that is $\\lfloor x / 2^{30} \\rfloor$) is 1, otherwise **down**. With $\\Delta t = T/N$ the step factors are:'),
               math('u = \\exp\\big((r - \\sigma^2/2)\\Delta t + \\sigma\\sqrt{\\Delta t}\\big), \\quad d = \\exp\\big((r - \\sigma^2/2)\\Delta t - \\sigma\\sqrt{\\Delta t}\\big)'),
               p('The path spot starts at $S$ and is multiplied by $u$ or $d$ at every step. The payoff is $\\max(\\bar S - K, 0)$ where $\\bar S$ is the average of the $N$ spots after each step. Paths run one after another and the generator is **not** reset between paths. The price is $e^{-rT}$ times the mean payoff over $M$ paths. Print it with exactly 4 decimals. Tests keep the answer away from a rounding tie.')],
    inputFormat='One line: `S K r sigma T N M seed`.',
    outputFormat='One number with 4 decimals.',
    constraints=['$1 \\le N \\le 64$, $1 \\le M \\le 20000$', '$1 \\le S, K \\le 1000$', '$0 \\le r \\le 0.2$, $0.01 \\le \\sigma \\le 1$, $0.01 \\le T \\le 10$', '$0 \\le \\text{seed} < 2^{31}$'],
    hints=['Use 64-bit unsigned integers for the generator and mask with 0x7fffffff.', 'Do not reset the generator for each path. One stream drives all $M \\cdot N$ steps.'],
    editorial=[p('The simulation is $O(MN)$. Because the step directions come from a fixed generator, the result is deterministic and must match digit for digit.'),
               p('The mean of the payoffs is accumulated in double precision; the answer is rounded only at the end.')],
    lessons=['opt-exotics-american', 'prc-monte-carlo-engine', 'qalg-simulation'])
def oracle(inp):
    t = inp.split(); S, K, r, sg, T = map(Decimal, t[:5]); N, M, seed = int(t[5]), int(t[6]), int(t[7])
    dt = T / N; drift = (r - sg * sg / 2) * dt; vol = sg * dt.sqrt(); u = (drift + vol).exp(); d = (drift - vol).exp()
    x = seed; tot = Decimal(0)
    for _ in range(M):
        s = S; a = Decimal(0)
        for _ in range(N):
            x = (1103515245 * x + 12345) & 0x7fffffff
            s *= u if (x >> 30) & 1 else d; a += s
        tot += max(a / N - K, Decimal(0))
    return fixed(rnd((-r * T).exp() * tot / M, 4), 4)
def gen(r):
    while True:
        x = f"{r.randint(100, 20000) / 100:.2f} {r.randint(100, 20000) / 100:.2f} {r.randint(0, 1500) / 10000:.4f} {r.randint(500, 8000) / 10000:.4f} {r.randint(10, 500) / 100:.2f} {r.randint(1, 10)} {r.randint(1, 200)} {r.randint(0, 2**31 - 1)}\n"
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['100.00 100.00 0.0500 0.2000 1.00 4 10 42\n']
EDGE = ['100.00 100.00 0.0000 0.0100 0.01 1 1 0\n', '100.00 1000.00 0.0500 0.2000 1.00 8 50 7\n', '100.00 1.00 0.0500 0.2000 1.00 8 50 7\n', '100.00 100.00 0.0500 0.2000 1.00 64 100 2147483647\n']
def BIG(): return ['100.00 100.00 0.0500 0.2000 1.00 64 20000 123456789\n', '50.00 55.00 0.0300 0.4000 2.00 52 20000 1\n']
ORACLE_MAX = 100000
