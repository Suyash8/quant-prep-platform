#include <cstdio>
#include <vector>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    vector<long long> p(n);
    for (auto& x : p) {
        if (scanf("%lld", &x) != 1) return 1;
    }
    long long s = 0;
    for (int i = 0; i < k; i++) s += p[i];
    for (int i = 0; i + k <= n; i++) {
        if (i > 0) s += p[i + k - 1] - p[i - 1];
        long long cents = (200 * s + k) / (2LL * k);
        printf("%lld.%02lld\n", cents / 100, cents % 100);
    }
    return 0;
}
