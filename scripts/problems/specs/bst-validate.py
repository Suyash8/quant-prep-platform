import sys
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]
    v = [0] * n; L = [0] * n; R = [0] * n
    for i in range(n): v[i], L[i], R[i] = t[1 + 3 * i:4 + 3 * i]
    sys.setrecursionlimit(10000)
    seq = []
    def inorder(u):
        if u == -1: return
        inorder(L[u]); seq.append(v[u]); inorder(R[u])
    inorder(0)
    return 'VALID' if all(seq[i] < seq[i + 1] for i in range(len(seq) - 1)) else 'INVALID'
def gen(r):
    n = r.randint(1, 8)
    L = [-1] * n; R = [-1] * n
    for i in range(1, n):
        while True:
            p = r.randrange(0, i)
            side = r.choice('LR')
            if side == 'L' and L[p] == -1: L[p] = i; break
            if side == 'R' and R[p] == -1: R[p] = i; break
            if L[p] != -1 and R[p] != -1 and all(L[q] != -1 and R[q] != -1 for q in range(i)): return gen(r)
    order = []
    def ino(u):
        if u == -1: return
        ino(L[u]); order.append(u); ino(R[u])
    ino(0)
    vals = sorted(r.sample(range(-20, 21), n)); v = [0] * n
    for k, u in enumerate(order): v[u] = vals[k]
    if r.random() < 0.6:
        for _ in range(r.randint(1, 2)): v[r.randrange(n)] = r.randint(-20, 20)
    return f"{n}\n" + ''.join(f"{v[i]} {L[i]} {R[i]}\n" for i in range(n))
EDGE = ['1\n-2147483648 -1 -1\n', '3\n10 1 2\n5 -1 -1\n10 -1 -1\n', '3\n10 1 -1\n5 -1 2\n12 -1 -1\n', '5\n10 1 2\n5 3 4\n15 -1 -1\n2 -1 -1\n11 -1 -1\n', '4\n2147483647 1 -1\n2147483646 2 -1\n-2147483648 -1 3\n0 -1 -1\n']
def BIG():
    n = 100000  # left-leaning chain (depth n), valid; and the same chain with one swapped value
    rows = [f"{n - i} {i + 1 if i + 1 < n else -1} -1" for i in range(n)]
    bad = list(rows); bad[n // 2] = f"{n} {n // 2 + 1} -1"
    return [f"{n}\n" + '\n'.join(rows) + '\n', f"{n}\n" + '\n'.join(bad) + '\n']
