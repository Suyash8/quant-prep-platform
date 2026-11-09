#include <cstdio>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long cents = 0;
    char side[4], price[32];
    for (int i = 0; i < n; i++) {
        long long q;
        if (scanf("%s %lld %s", side, &q, price) != 3) return 0;
        long long whole = 0, frac = 0;
        int j = 0;
        for (; price[j] && price[j] != '.'; j++) whole = whole * 10 + (price[j] - '0');
        if (price[j] == '.') {
            j++;
            for (int d = 0; d < 2 && price[j]; d++, j++) frac = frac * 10 + (price[j] - '0');
        }
        long long v = q * (whole * 100 + frac);
        if (side[0] == 'B') cents -= v;
        else cents += v;
    }
    long long a = cents < 0 ? -cents : cents;
    printf("%s%lld.%02lld\n", cents < 0 ? "-" : "", a / 100, a % 100);
    return 0;
}
