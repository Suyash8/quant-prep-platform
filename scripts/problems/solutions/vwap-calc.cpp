#include <cstdio>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long notional = 0, shares = 0;
    for (int i = 0; i < n; i++) {
        long long q, p;
        if (scanf("%lld %lld", &q, &p) != 2) return 1;
        notional += q * p;
        shares += q;
    }
    long long units = (200 * notional + shares) / (2 * shares);
    printf("%lld.%04lld\n", units / 10000, units % 10000);
    return 0;
}
