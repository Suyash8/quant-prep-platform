#include <cstdio>
#include <functional>
#include <queue>
#include <vector>
using namespace std;

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 1;
    vector<vector<int>> after(n);
    vector<int> indeg(n, 0);
    for (int i = 0; i < m; i++) {
        int a, b;
        if (scanf("%d %d", &a, &b) != 2) return 1;
        after[b].push_back(a);
        indeg[a]++;
    }
    priority_queue<int, vector<int>, greater<int>> heap;
    for (int i = 0; i < n; i++) {
        if (indeg[i] == 0) heap.push(i);
    }
    vector<int> order;
    while (!heap.empty()) {
        int u = heap.top();
        heap.pop();
        order.push_back(u);
        for (int w : after[u]) {
            if (--indeg[w] == 0) heap.push(w);
        }
    }
    if ((int)order.size() != n) {
        puts("IMPOSSIBLE");
        return 0;
    }
    for (int i = 0; i < n; i++) printf("%d%c", order[i], i + 1 < n ? ' ' : '\n');
    return 0;
}
