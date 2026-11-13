#include <cstdio>
#include <cmath>
using namespace std;

static double Phi(double x) { return 0.5 * erfc(-x / sqrt(2.0)); }

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 1;
    const double PI = acos(-1.0);
    while (q--) {
        double S, K, r, sg, T;
        if (scanf("%lf %lf %lf %lf %lf", &S, &K, &r, &sg, &T) != 5) return 1;
        double sq = sg * sqrt(T);
        double d1 = (log(S / K) + (r + sg * sg / 2) * T) / sq, d2 = d1 - sq;
        double pdf = exp(-d1 * d1 / 2) / sqrt(2 * PI);
        double v[4] = {S * Phi(d1) - K * exp(-r * T) * Phi(d2), Phi(d1), pdf / (S * sq), S * pdf * sqrt(T)};
        for (int i = 0; i < 4; i++) {
            if (i) putchar(' ');
            if (fabs(v[i]) < 5e-7) printf("0.000000"); else printf("%.6f", v[i]);
        }
        putchar('\n');
    }
    return 0;
}
