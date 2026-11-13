#include <algorithm>
#include <cstdio>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<long long> a(n);
    for (auto& x : a) {
        if (scanf("%lld", &x) != 1) return 1;
    }
    int m;
    if (scanf("%d", &m) != 1) return 1;
    while (m--) {
        long long q;
        if (scanf("%lld", &q) != 1) return 1;
        int lo = 0, hi = n;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] < q) lo = mid + 1;
            else hi = mid;
        }
        printf("%d\n", lo < n ? lo : -1);
    }
    return 0;
}
