#include <cstdio>
#include <functional>
#include <queue>
#include <utility>
#include <vector>
using namespace std;

int main() {
    const long long MOD = 1000000007LL, INF = (long long)4e18;
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 1;
    vector<vector<pair<int, long long>>> adj(n);
    for (int e = 0; e < m; e++) {
        int u, v;
        long long w;
        if (scanf("%d %d %lld", &u, &v, &w) != 3) return 1;
        adj[u].emplace_back(v, w);
        adj[v].emplace_back(u, w);
    }
    vector<long long> dist(n, INF), ways(n, 0);
    dist[0] = 0;
    ways[0] = 1;
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> heap;
    heap.emplace(0, 0);
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            long long nd = d + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                ways[v] = ways[u];
                heap.emplace(nd, v);
            } else if (nd == dist[v]) {
                ways[v] = (ways[v] + ways[u]) % MOD;
            }
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INF) puts("-1 0");
        else printf("%lld %lld\n", dist[v], ways[v] % MOD);
    }
    return 0;
}
