from fractions import Fraction
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; x = t[1:1 + n]; v = t[1 + n:1 + 2 * n]; T = t[1 + 2 * n]
    for i in range(n):
        for j in range(i + 1, n):
            if v[i] == v[j]: continue
            tau = Fraction(x[j] - x[i], v[i] - v[j])
            if 0 < tau <= T: return 'COLLIDE'
    return 'SAFE'
def gen(r):
    n = r.randint(1, 5); x = r.sample(range(-15, 16), n); v = [r.randint(-4, 4) for _ in range(n)]
    return f"{n}\n{' '.join(map(str, x))}\n{' '.join(map(str, v))}\n{r.randint(1, 8)}\n"
EDGE = ['2\n0 10\n1 -1\n5\n', '2\n0 10\n1 -1\n4\n', '2\n0 5\n0 0\n1000000000\n', '2\n-1000000000 1000000000\n1000000000 -1000000000\n1\n', '2\n-1000000000 1000000000\n1000000000 -1000000000\n2\n', '2\n0 1\n1000000000 999999999\n1000000000\n', '2\n0 1\n-5 3\n9\n', '1\n7\n3\n5\n']
def BIG():
    return ['2000\n' + ' '.join(str(i * 1000000) for i in range(2000)) + '\n' + ' '.join(['7'] * 2000) + '\n1000000000\n']
