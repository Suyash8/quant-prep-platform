#include <cstdio>
#include <cstdlib>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long total = 0;
    for (int i = 0; i < n; i++) {
        char side;
        long long q, dollars, cents;
        // Price is "D.CC": read dollars and the two cent digits separately, never as a double.
        if (scanf(" %c %lld %lld.%lld", &side, &q, &dollars, &cents) != 4) return 1;
        long long price = dollars * 100 + cents;
        total += (side == 'S' ? q * price : -q * price);
    }
    printf("%s%lld.%02lld\n", total < 0 ? "-" : "", llabs(total) / 100, llabs(total) % 100);
    return 0;
}
