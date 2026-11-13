#include <cstdio>
using namespace std;

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 1;
    while (t--) {
        double p, b;
        if (scanf("%lf %lf", &p, &b) != 2) return 1;
        double q = 1.0 - p;
        double f = (b * p - q) / b;
        if (f <= 0) f = 0.0;
        printf("%.4f\n", f);
    }
    return 0;
}
