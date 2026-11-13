import random
def oracle(inp):
    t = list(map(int, inp.split())); n, m = t[0], t[1]
    pre = [set() for _ in range(n)]
    for i in range(m):
        a, b = t[2 + 2 * i], t[3 + 2 * i]; pre[a].add(b)
    done = set(); order = []
    while len(order) < n:
        cand = [c for c in range(n) if c not in done and pre[c] <= done]
        if not cand: return 'IMPOSSIBLE'
        c = min(cand); done.add(c); order.append(c)
    return ' '.join(map(str, order))
def gen(r):
    n = r.randint(1, 7); m = r.randint(0, 8); pairs = set()
    dag = r.random() < 0.6; perm = list(range(n)); r.shuffle(perm)
    for _ in range(m):
        a, b = r.randrange(n), r.randrange(n)
        if dag:
            if a == b: continue
            if perm.index(a) < perm.index(b): a, b = b, a
        pairs.add((a, b))
    pairs = sorted(pairs); r.shuffle(pairs)
    return f"{n} {len(pairs)}\n" + ''.join(f"{a} {b}\n" for a, b in pairs)
EDGE = ['1 0\n', '1 1\n0 0\n', '2 2\n0 1\n1 0\n', '3 0\n', '4 2\n3 0\n0 3\n', '5 4\n0 1\n0 2\n3 4\n2 3\n', '3 2\n0 2\n1 2\n']
def BIG():
    n = 100000
    star = f"{n} {n - 1}\n" + ''.join(f"0 {i}\n" for i in range(1, n))
    chain = f"{n} {n - 1}\n" + ''.join(f"{i} {i + 1}\n" for i in range(n - 1))   # i needs i+1 first: order n-1 ... 0
    cyc = f"{n} {n}\n" + ''.join(f"{i} {(i + 1) % n}\n" for i in range(n))
    return [star, chain, cyc]
