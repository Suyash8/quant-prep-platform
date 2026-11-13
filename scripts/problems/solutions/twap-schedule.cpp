#include <cstdio>
using namespace std;

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 1;
    while (t--) {
        long long total, n;
        if (scanf("%lld %lld", &total, &n) != 2) return 1;
        long long base = total / n, rem = total % n;
        for (long long k = 0; k < n; k++) printf("%lld%c", k < rem ? base + 1 : base, k + 1 < n ? ' ' : '\n');
    }
    return 0;
}
