#include <cstdio>
using namespace std;

int main() {
    int n, span;
    if (scanf("%d %d", &n, &span) != 2) return 1;
    double alpha = 2.0 / (span + 1), ema = 0.0;
    for (int i = 0; i < n; i++) {
        double p;
        if (scanf("%lf", &p) != 1) return 1;
        ema = (i == 0) ? p : alpha * p + (1 - alpha) * ema;
        printf("%.4f\n", ema);
    }
    return 0;
}
