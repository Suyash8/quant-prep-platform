from collections import deque
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; coins = t[1:1 + n]; amount = t[1 + n]
    dist = {0: 0}; q = deque([0])
    while q:
        u = q.popleft()
        for c in coins:
            w = u + c
            if w <= amount and w not in dist:
                dist[w] = dist[u] + 1; q.append(w)
    return str(dist.get(amount, -1))
def gen(r):
    n = r.randint(1, 5)
    return f"{n}\n{' '.join(str(r.randint(1, 12)) for _ in range(n))}\n{r.randint(0, 40)}\n"
EDGE = ['3\n1 5 11\n15\n', '1\n7\n0\n', '2\n5 5\n10\n', '3\n2 4 6\n7\n', '1\n1\n10000\n', '20\n10000 9999 9998 9997 9996 9995 9994 9993 9992 9991 9990 9989 9988 9987 9986 9985 9984 9983 9982 9981\n10000\n', '2\n9973 9967\n10000\n', '4\n186 419 83 408\n6249\n']
