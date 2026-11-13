import random
def oracle(inp):
    t = inp.split(); n = int(t[0]); words = t[1:1 + n]
    groups = {}
    for w in words:
        key = ''.join(sorted(w)); groups.setdefault(key, []).append(w)
    gl = [sorted(g) for g in groups.values()]
    gl.sort(key=lambda g: (-len(g), g[0]))
    return '\n'.join([str(len(gl))] + [' '.join(g) for g in gl])
def gen(r):
    n = r.randint(0, 9); alpha = 'abc'[:r.randint(1, 3)]
    ws = [''.join(r.choice(alpha) for _ in range(r.randint(1, 4))) for _ in range(n)]
    return f"{n}\n{' '.join(ws)}\n"
EDGE = ['0\n\n', '1\nz\n', '3\nab ba ab\n', '4\nabc bca xyz zyx\n', '5\naa aa aa b b\n', '2\nabcdefghijklmnopqrst tsrqponmlkjihgfedcba\n']
def BIG():
    r = random.Random(5)
    ws = [''.join(r.choice('abcd') for _ in range(r.randint(1, 8))) for _ in range(100000)]
    return [f"100000\n{' '.join(ws)}\n"]
PATCH = [("tickers are unique as given", "tickers may repeat, and every occurrence is kept in its group"),
         ("$1 \\le n \\le 10^5$", "$0 \\le n \\le 10^5$")]
