import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
MOD = 10**9 + 7
NEW = dict(title='Lowest-Latency Routes', difficulty='medium', category='graphs', tags=['graphs', 'shortest-path', 'dijkstra'], estMinutes=35,
    statement=[p('A trading network has $n$ nodes numbered $0$ to $n-1$ and $m$ bidirectional links. Each link has a positive latency in microseconds. Node $0$ is the exchange gateway. For every node, find the lowest total latency from node $0$ and also **how many different routes achieve that lowest latency**.'),
               p('Two routes are different when their sequences of links differ. Report the route count modulo $10^9 + 7$. A node that cannot be reached prints `-1 0`. Node $0$ itself has distance $0$ and exactly one route.')],
    inputFormat='First line: $n$ and $m$. Then $m$ lines `u v w`: a link between $u$ and $v$ with latency $w$.',
    outputFormat='$n$ lines. Line $i$ contains `dist count` for node $i$, or `-1 0` if unreachable.',
    constraints=['$1 \\le n \\le 10^5$, $0 \\le m \\le 2 \\cdot 10^5$', '$1 \\le w \\le 10^9$; distances fit in a signed 64-bit integer', 'Parallel links between the same pair of nodes count as different links; there are no self-links'],
    hints=['Run Dijkstra with a min-heap. Keep a count array: when you find a strictly shorter distance, copy the count; when you find an equal distance, add the count.', 'Because every latency is positive, a node is final when it leaves the heap, so counts of equal-distance predecessors are complete by then.'],
    editorial=[p('Dijkstra gives final distances in non-decreasing order. Relaxing an edge $u \\to v$ with $d_u + w < d_v$ replaces `count[v]` by `count[u]`; with $d_u + w = d_v$ it adds `count[u]`. Positive weights guarantee every predecessor on a shortest path is settled before $v$, so `count[u]` is final when it is used.'),
               p('The count is taken modulo $10^9+7$ because the number of shortest routes can grow exponentially, for example in a ladder of parallel links. Remember to treat parallel links as separate routes.')],
    lessons=['alg-shortest-paths-mst', 'net-latency'])
def oracle(inp):
    t = list(map(int, inp.split())); n, m = t[0], t[1]; edges = [(t[2 + 3 * i], t[3 + 3 * i], t[4 + 3 * i]) for i in range(m)]
    INF = float('inf'); dist = [INF] * n; dist[0] = 0
    for _ in range(n):                       # Bellman-Ford
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
            if dist[v] + w < dist[u]: dist[u] = dist[v] + w
    cnt = [0] * n; cnt[0] = 1
    for v in sorted(range(n), key=lambda x: dist[x]):
        if v == 0 or dist[v] == INF: continue
        for a, b, w in edges:
            for x, y in ((a, b), (b, a)):
                if y == v and dist[x] + w == dist[v]: cnt[v] = (cnt[v] + cnt[x]) % MOD
    return '\n'.join(f"{dist[v]} {cnt[v]}" if dist[v] != INF else '-1 0' for v in range(n))
def gen(r):
    n = r.randint(1, 7); m = r.randint(0, 12); rows = []
    for _ in range(m):
        if n < 2: break
        a, b = r.sample(range(n), 2); rows.append(f"{a} {b} {r.randint(1, 4)}")
    return f"{n} {len(rows)}\n" + ''.join(x + '\n' for x in rows)
EXAMPLES = ['5 6\n0 1 2\n0 2 2\n1 3 1\n2 3 1\n3 0 5\n1 2 1\n']
EDGE = ['1 0\n', '3 0\n', '2 2\n0 1 5\n1 0 5\n', '3 1\n1 2 1000000000\n', '4 3\n0 1 1000000000\n1 2 1000000000\n2 3 1000000000\n', '4 5\n0 1 1\n0 2 1\n1 3 1\n2 3 1\n1 2 1\n']
def BIG():
    n = 100000; rows = []
    for i in range(1, 30001):   # ladder: pairs of parallel paths, count explodes mod p
        pass
    r = random.Random(111)
    for i in range(1, n): rows.append(f"{i - 1} {i} 1"); rows.append(f"{i - 1} {i} 1") if i < 99998 else None
    rows = rows[:200000]
    return [f"{n} {len(rows)}\n" + '\n'.join(rows) + '\n']
