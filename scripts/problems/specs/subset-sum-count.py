import random
MOD = 10**9 + 7
def oracle(inp):
    t = list(map(int, inp.split())); n, target = t[0], t[1]; a = t[2:2 + n]
    if n > 16:  # too many masks to enumerate: count subsets with a dictionary keyed by partial sum
        ways = {0: 1}
        for v in a:
            nxt = dict(ways)
            for k, c in ways.items():
                if k + v <= target: nxt[k + v] = (nxt.get(k + v, 0) + c) % MOD
            ways = nxt
        return str(ways.get(target, 0) % MOD)
    cnt = 0
    for mask in range(1 << n):
        if sum(a[i] for i in range(n) if mask >> i & 1) == target: cnt += 1
    return str(cnt % MOD)
def gen(r):
    n = r.randint(1, 10); target = r.randint(1, 15)
    return f"{n} {target}\n{' '.join(str(r.randint(1, target)) for _ in range(n))}\n"
EDGE = ['1 1\n1\n', '3 5\n5 5 5\n', '4 4\n1 1 1 1\n', '5 6\n1 2 3 4 5\n', '3 20000\n20000 1 2\n', '1 20000\n20000\n']
def BIG():
    r = random.Random(31)
    return ["200 20000\n" + ' '.join(['1'] * 200) + '\n', "200 20000\n" + ' '.join(str(r.randint(1, 200)) for _ in range(200)) + '\n', "200 100\n" + ' '.join(['1'] * 200) + '\n',
            "200 20000\n" + ' '.join(str(r.randint(1, 20000)) for _ in range(200)) + '\n']
PATCH = [("$0 \\le target \\le 20{,}000$", "$1 \\le target \\le 20{,}000$"), ("$0 \\le target \\le 20000$", "$1 \\le target \\le 20000$")]
