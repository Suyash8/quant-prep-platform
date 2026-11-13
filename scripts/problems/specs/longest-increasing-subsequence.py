import random
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; a = t[1:1 + n]
    best = [1] * n
    for i in range(n):
        for j in range(i):
            if a[j] < a[i]: best[i] = max(best[i], best[j] + 1)
    return str(max(best))
def gen(r):
    n = r.randint(1, 10); return f"{n}\n{' '.join(str(r.randint(-5, 5)) for _ in range(n))}\n"
EDGE = ['1\n5\n', '3\n4 4 4\n', '5\n1 2 3 4 5\n', '5\n5 4 3 2 1\n', '4\n-1000000000 1000000000 -1000000000 1000000000\n', '6\n3 10 2 1 20 4\n']
def BIG():
    r = random.Random(11); n = 200000
    return [f"{n}\n{' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n))}\n", f"{n}\n{' '.join(str(i) for i in range(n))}\n",
            f"{n}\n{' '.join(str(n - i) for i in range(n))}\n", f"{n}\n{' '.join(['3'] * n)}\n"]
