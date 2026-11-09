#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long p = 7 * n, q = 2;
    long long g = __gcd(p, q);
    p /= g;
    q /= g;
    if (q == 1) printf("%lld\n", p);
    else printf("%lld/%lld\n", p, q);
    return 0;
}
