#include <cstdio>
#include <cmath>
#include <algorithm>
using namespace std;

int main() {
    double S, K, r, sg, T;
    int N, M;
    unsigned long long x;
    if (scanf("%lf %lf %lf %lf %lf %d %d %llu", &S, &K, &r, &sg, &T, &N, &M, &x) != 8) return 1;
    double dt = T / N, drift = (r - sg * sg / 2) * dt, vol = sg * sqrt(dt);
    double u = exp(drift + vol), d = exp(drift - vol), tot = 0.0;
    for (int p = 0; p < M; p++) {
        double s = S, a = 0.0;
        for (int i = 0; i < N; i++) {
            x = (1103515245ULL * x + 12345ULL) & 0x7fffffffULL;
            s *= ((x >> 30) & 1) ? u : d;
            a += s;
        }
        tot += max(a / N - K, 0.0);
    }
    printf("%.4f\n", exp(-r * T) * tot / M);
    return 0;
}
