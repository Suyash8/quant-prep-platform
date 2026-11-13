import random
def oracle(inp):
    t = inp.split(); n, m = int(t[0]), int(t[1]); g = [t[2 + i * m:2 + (i + 1) * m] for i in range(n)]
    seen = [[False] * m for _ in range(n)]; r = c = 0; dr, dc = 0, 1; out = []
    for _ in range(n * m):
        out.append(g[r][c]); seen[r][c] = True
        nr, nc = r + dr, c + dc
        if not (0 <= nr < n and 0 <= nc < m and not seen[nr][nc]):
            dr, dc = dc, -dr; nr, nc = r + dr, c + dc
        r, c = nr, nc
    return ' '.join(out)
def gen(r):
    n, m = r.randint(1, 6), r.randint(1, 6); k = 0
    return f"{n} {m}\n" + '\n'.join(' '.join(r.choice(['a', 'b2', '17', 'XY']) + str(i * m + j) for j in range(m)) for i in range(n)) + '\n'
EDGE = ['1 1\nA\n', '1 5\na b c d e\n', '5 1\na\nb\nc\nd\ne\n', '2 2\n1 2\n3 4\n', '4 3\n1 2 3\n4 5 6\n7 8 9\n10 11 12\n']
def BIG():
    n = m = 500
    return [f"{n} {m}\n" + '\n'.join(' '.join(f"t{i * m + j}" for j in range(m)) for i in range(n)) + '\n']
