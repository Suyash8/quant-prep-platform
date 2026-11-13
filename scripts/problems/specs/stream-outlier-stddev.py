import random
ORACLE_MAX = 10**9
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; xs = t[1:1 + n]; S = Q = 0; out = []
    for i, x in enumerate(xs, 1):
        S += x; Q += x * x
        v = i * Q - S * S          # i^2 * variance, exact integer
        lhs = (i * x - S) ** 2     # i^2 * (x - mean)^2
        rhs = 9 * v                # i^2 * 9 * variance, so the test is lhs > rhs
        if v > 0:
            if abs(lhs - rhs) * 10**9 < rhs: raise AssertionError('near tie')
        out.append('outlier' if v > 0 and lhs > rhs else 'ok')
    return '\n'.join(out)
def gen(r):
    while True:
        n = r.randint(1, 18); base = r.randint(-5, 5); xs = [base + r.randint(-2, 2) for _ in range(n)]
        if r.random() < .6 and n > 11: xs[r.randrange(11, n)] = r.choice([-1, 1]) * r.randint(15, 60)
        s = f"{n}\n" + ''.join(f"{x}\n" for x in xs)
        try: oracle(s); return s
        except AssertionError: pass
EDGE = ['1\n5\n', '2\n1\n1000000\n', '11\n' + '0\n' * 10 + '33\n', '12\n' + '10\n11\n' * 5 + '10\n11\n40\n', '3\n7\n7\n7\n', '11\n' + '5\n' * 10 + '-1000000\n', '15\n' + '1000000\n-1000000\n' * 7 + '1000000\n']
def BIG():
    r = random.Random(23); n = 200000; xs = [r.randint(-5, 5) for _ in range(n)]
    for i in r.sample(range(20, n), 50): xs[i] = r.choice([-1, 1]) * r.randint(1000, 10**6)
    return [f"{n}\n" + ''.join(f"{x}\n" for x in xs)]
PATCH = [("|x, mu_old|", "|x - mu_old|"), ("|x, mu|", "|x - mu|")]
