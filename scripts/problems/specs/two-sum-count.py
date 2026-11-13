import random
def oracle(inp):
    t = list(map(int, inp.split())); n, T = t[0], t[1]; a = t[2:2 + n]
    return str(sum(1 for i in range(n) for j in range(i + 1, n) if a[i] + a[j] == T))
def gen(r):
    n = r.randint(1, 10); return f"{n} {r.randint(-6, 6)}\n{' '.join(str(r.randint(-4, 4)) for _ in range(n))}\n"
EDGE = ['1 0\n0\n', '2 0\n0 0\n', '3 1000000000\n1000000000 0 1000000000\n', '2 -2000000000\n-1000000000 -1000000000\n'.replace('-2000000000', '-1000000000') , '4 4\n2 2 2 2\n']
def BIG():
    n = 100000; r = random.Random(41)
    return [f"{n} 0\n" + ' '.join(['0'] * n) + '\n', f"{n} 1000000000\n" + ' '.join(str(r.choice([500000000, 1000000000, 0, 3])) for _ in range(n)) + '\n',
            f"{n} 5\n" + ' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n)) + '\n']
