#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
using namespace std;

// Prices have at most two decimals, so llround(x * 100) is the exact number of cents.
static long long toCents(double x) { return llround(x * 100.0); }

struct Leg {
    char kind;
    int sign;
    long long strike, qty, prem;
};

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 1;
    vector<Leg> legs;
    for (int i = 0; i < t; i++) {
        char kind[4], side[8];
        double k, p;
        long long q;
        if (scanf("%3s %7s %lf %lld %lf", kind, side, &k, &q, &p) != 5) return 1;
        legs.push_back({kind[0], string(side) == "BUY" ? 1 : -1, toCents(k), q, toCents(p)});
    }
    int m;
    if (scanf("%d", &m) != 1) return 1;
    while (m--) {
        double s;
        if (scanf("%lf", &s) != 1) return 1;
        long long spot = toCents(s), total = 0;
        for (const Leg& g : legs) {
            long long intrinsic = g.kind == 'C' ? max(0LL, spot - g.strike) : max(0LL, g.strike - spot);
            total += g.sign * (intrinsic - g.prem) * g.qty;
        }
        printf("%s%lld.%02lld\n", total < 0 ? "-" : "", llabs(total) / 100, llabs(total) % 100);
    }
    return 0;
}
