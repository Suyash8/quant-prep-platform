#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    int m;
    if (scanf("%d", &m) != 1) return 0;
    for (int i = 0; i < m; i++) {
        long long q;
        scanf("%lld", &q);
        int idx = int(lower_bound(a.begin(), a.end(), q) - a.begin());
        if (idx == n) printf("-1\n");
        else printf("%d\n", idx);
    }
    return 0;
}
