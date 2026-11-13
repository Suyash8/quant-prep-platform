import heapq
import sys

MOD = 10**9 + 7


def main():
    tok = sys.stdin.buffer.read().split()
    n, m = int(tok[0]), int(tok[1])
    adj = [[] for _ in range(n)]
    for e in range(m):
        u, v, w = int(tok[2 + 3 * e]), int(tok[3 + 3 * e]), int(tok[4 + 3 * e])
        adj[u].append((v, w))
        adj[v].append((u, w))
    INF = float('inf')
    dist = [INF] * n
    ways = [0] * n
    dist[0] = 0
    ways[0] = 1
    heap = [(0, 0)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                ways[v] = ways[u]
                heapq.heappush(heap, (nd, v))
            elif nd == dist[v]:
                ways[v] = (ways[v] + ways[u]) % MOD
    print('\n'.join(f"{dist[v]} {ways[v] % MOD}" if dist[v] != INF else '-1 0' for v in range(n)))


main()
