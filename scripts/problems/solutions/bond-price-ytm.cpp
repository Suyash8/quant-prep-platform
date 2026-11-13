#include <cstdio>
#include <cmath>
using namespace std;

static double price(double F, double cpn, int m, int yrs, double y) {
    int N = m * yrs;
    double i = y / m, c = F * cpn / m, s = 0.0;
    for (int t = 1; t <= N; t++) s += c / pow(1 + i, t);
    return s + F / pow(1 + i, N);
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 1;
    while (q--) {
        char k;
        double F, cpn, x;
        int m, yrs;
        if (scanf(" %c %lf %lf %d %d %lf", &k, &F, &cpn, &m, &yrs, &x) != 6) return 1;
        cpn /= 100;
        if (k == 'P') {
            printf("%.4f\n", price(F, cpn, m, yrs, x / 100));
        } else {
            double lo = 0, hi = 1;
            for (int it = 0; it < 100; it++) {
                double mid = (lo + hi) / 2;
                if (price(F, cpn, m, yrs, mid) > x) lo = mid; else hi = mid;
            }
            printf("%.4f\n", (lo + hi) / 2 * 100);
        }
    }
    return 0;
}
