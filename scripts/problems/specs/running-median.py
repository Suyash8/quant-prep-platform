import random
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; p = t[1:1 + n]; out = []
    for i in range(1, n + 1):
        s = sorted(p[:i]); k = len(s)
        tot = s[k // 2] * 2 if k % 2 else s[k // 2 - 1] + s[k // 2]
        out.append(f"{tot // 2}.{5 if tot % 2 else 0}")
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 12); return f"{n}\n" + ''.join(f"{r.randint(1, 15)}\n" for _ in range(n))
EDGE = ['1\n1000000000\n', '2\n1000000000\n1000000000\n', '2\n1\n1000000000\n', '4\n5\n5\n5\n5\n', '5\n9\n8\n7\n6\n5\n', '3\n999999999\n1000000000\n1\n']
def BIG():
    r = random.Random(17); n = 200000
    return [f"{n}\n" + ''.join(f"{r.randint(1, 10**9)}\n" for _ in range(n)), f"{n}\n" + ''.join(f"{i + 1}\n" for i in range(n))]
