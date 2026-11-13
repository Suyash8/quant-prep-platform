import random
def oracle(inp):
    lines = inp.strip().split('\n'); c, t = map(int, lines[0].split())
    order = []  # least recent first, list of [key, value]
    out = []
    for ln in lines[1:1 + t]:
        p = ln.split()
        if p[0] == 'PUT':
            k, v = p[1], int(p[2])
            order = [e for e in order if e[0] != k]
            order.append([k, v])
            if len(order) > c: order.pop(0)
        else:
            k = p[1]
            hit = [e for e in order if e[0] == k]
            if hit:
                order = [e for e in order if e[0] != k] + hit; out.append(str(hit[0][1]))
            else: out.append('MISS')
    return '\n'.join(out)
def gen(r):
    c = r.randint(1, 4); t = r.randint(1, 14); keys = 'abcdef'[:r.randint(2, 6)]
    ops = [(f"PUT {r.choice(keys)} {r.randint(-9, 99)}" if r.random() < .5 else f"GET {r.choice(keys)}") for _ in range(t)]
    if not any(o.startswith('GET') for o in ops): ops[-1] = 'GET a'
    return f"{c} {t}\n" + '\n'.join(ops) + '\n'
EDGE = ['1 4\nPUT a 1\nPUT a 2\nGET a\nGET b\n', '2 6\nPUT a 1\nPUT b 2\nPUT a 3\nPUT c 4\nGET b\nGET a\n', '2 6\nPUT a 1\nPUT b 2\nGET a\nGET zz\nPUT c 3\nGET b\n', '3 3\nGET x\nGET y\nPUT x 5\n', '1 3\nPUT k1 -5\nGET k1\nGET k1\n']
def BIG():
    r = random.Random(3); t = 100000; ops = []
    for i in range(t):
        k = f"k{r.randint(0, 3000)}"
        ops.append(f"PUT {k} {r.randint(-10**9, 10**9)}" if r.random() < .4 else f"GET {k}")
    ops[-1] = 'GET k1'
    return [f"1000 {t}\n" + '\n'.join(ops) + '\n']
