from fractions import Fraction
def oracle(inp):
    tok = inp.split(); t = int(tok[0]); legs = []
    for i in range(t):
        ty, side, k, q, prem = tok[1 + 5 * i:6 + 5 * i]; legs.append((ty, side, Fraction(k), int(q), Fraction(prem)))
    qn = int(tok[1 + 5 * t]); out = []
    for s in tok[2 + 5 * t:2 + 5 * t + qn]:
        S = Fraction(s); tot = Fraction(0)
        for ty, side, K, q, prem in legs:
            intr = max(Fraction(0), S - K) if ty == 'C' else max(Fraction(0), K - S)
            pnl = (intr - prem) * q
            tot += pnl if side == 'BUY' else -pnl
        c = tot * 100
        assert c.denominator == 1
        c = int(c); sign = '-' if c < 0 else ''
        out.append(f"{sign}{abs(c) // 100}.{abs(c) % 100:02d}")
    return '\n'.join(out)
def gen(r):
    t = r.randint(1, 4); legs = []
    for _ in range(t):
        legs.append(f"{r.choice('CP')} {r.choice(['BUY', 'SELL'])} {r.randint(1, 20) * 5} {r.randint(1, 5)} {r.randint(0, 800) / 100:.2f}")
    q = r.randint(1, 5)
    return f"{t}\n" + '\n'.join(legs) + f"\n{q}\n" + '\n'.join(f"{r.randint(1, 120) + r.choice([0, 0.5, 0.25])}" for _ in range(q)) + '\n'
EDGE = ['1\nC SELL 100 1 5.00\n3\n100\n105\n90\n', '2\nP BUY 50.50 2 1.25\nC BUY 50.50 2 1.25\n3\n50.50\n50.50\n0.01\n', '1\nC BUY 1000000 1000 100000\n2\n1000000\n1000000\n',
        '2\nC BUY 100 1 3.00\nC SELL 100 1 3.00\n2\n80\n120\n', '4\nC BUY 90 1 12.00\nC SELL 100 2 6.00\nC BUY 110 1 2.00\nP SELL 80 1 0.50\n5\n70\n90\n100\n110\n130\n']
META = {'constraints': ['$1 \\le t \\le 10$', '$0 < K, S \\le 10^6$', '$1 \\le \\text{QTY} \\le 1000$', '$0 \\le \\text{PREMIUM} \\le 10^5$', 'K, PREMIUM and the terminal prices are written with at most two decimal digits, so every P&L is an exact number of cents']}
