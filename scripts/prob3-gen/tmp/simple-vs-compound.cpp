#include <cstdio>

int main() {
    double P, r;
    long long t;
    if (scanf("%lf %lf %lld", &P, &r, &t) != 3) return 0;
    double factor = 1.0 + r / 100.0;
    double compound = P;
    for (long long i = 0; i < t; i++) compound = compound * factor; // repeated multiplication
    double simple = P * (r / 100.0) * (double)t;
    double diff = compound - simple;
    if (diff < 0) diff = -diff;
    printf("%.2f\n", diff);
    return 0;
}
