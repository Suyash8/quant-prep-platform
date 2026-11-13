#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

static vector<int> parent;

static int findRoot(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}

static int hundredths(const char* s) {
    bool neg = s[0] == '-';
    if (neg) s++;
    int whole = 0;
    while (*s && *s != '.') whole = whole * 10 + (*s++ - '0');
    int frac = 0, digits = 0;
    if (*s == '.') {
        s++;
        while (*s && digits < 2) {
            frac = frac * 10 + (*s++ - '0');
            digits++;
        }
    }
    while (digits++ < 2) frac *= 10;
    int v = whole * 100 + frac;
    return neg ? -v : v;
}

int main() {
    int n, m;
    char buf[64];
    if (scanf("%d %d %63s", &n, &m, buf) != 3) return 1;
    int theta = hundredths(buf);
    parent.resize(n);
    iota(parent.begin(), parent.end(), 0);
    for (int e = 0; e < m; e++) {
        int i, j;
        if (scanf("%d %d %63s", &i, &j, buf) != 3) return 1;
        if (hundredths(buf) > theta) {
            int a = findRoot(i), b = findRoot(j);
            if (a != b) parent[b] = a;
        }
    }
    vector<vector<int>> groups(n);
    for (int v = 0; v < n; v++) groups[findRoot(v)].push_back(v);
    vector<vector<int>> clusters;
    for (auto& g : groups) {
        if (!g.empty()) clusters.push_back(g);
    }
    sort(clusters.begin(), clusters.end(), [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
    printf("%zu\n", clusters.size());
    for (const auto& g : clusters) {
        for (size_t k = 0; k < g.size(); k++) printf(k ? " %d" : "%d", g[k]);
        printf("\n");
    }
    return 0;
}
