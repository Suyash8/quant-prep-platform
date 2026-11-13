import random
def oracle(inp):
    t = inp.split(); n = int(t[0]); a = list(map(int, t[1:1 + n])); m = int(t[1 + n]); qs = list(map(int, t[2 + n:2 + n + m]))
    out = []
    for q in qs:
        idx = -1
        for i, v in enumerate(a):
            if v >= q: idx = i; break
        out.append(str(idx))
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 8); a = sorted(r.randint(-5, 5) for _ in range(n)); m = r.randint(1, 8)
    return f"{n}\n{' '.join(map(str, a))}\n{m}\n{' '.join(str(r.randint(-7, 7)) for _ in range(m))}\n"
EDGE = ['1\n-1000000000\n3\n-1000000000 -999999999 1000000000\n', '4\n7 7 7 7\n3\n7 8 6\n', '3\n1000000000 1000000000 1000000000\n2\n1000000000 -1000000000\n']
def BIG():
    r = random.Random(7); a = sorted(r.randint(-10**9, 10**9) for _ in range(200000)); q = [r.randint(-10**9, 10**9) for _ in range(200000)]
    return [f"200000\n{' '.join(map(str, a))}\n200000\n{' '.join(map(str, q))}\n"]
