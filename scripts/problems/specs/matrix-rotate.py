import random
def oracle(inp):
    t = inp.split(); n = int(t[0]); g = [t[1 + i * n:1 + (i + 1) * n] for i in range(n)]
    res = [[None] * n for _ in range(n)]
    for i in range(n):
        for j in range(n): res[j][n - 1 - i] = g[i][j]
    return '\n'.join(' '.join(r) for r in res)
def gen(r):
    n = r.randint(1, 5); return f"{n}\n" + '\n'.join(' '.join(r.choice(['a', 'b1', '7', '-3', 'x9']) for _ in range(n)) for _ in range(n)) + '\n'
EDGE = ['1\nA\n', '2\n1 2\n3 4\n', '4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n']
def BIG():
    r = random.Random(2); n = 1000
    return [f"{n}\n" + '\n'.join(' '.join(str(r.randint(-999, 999)) for _ in range(n)) for _ in range(n)) + '\n']
