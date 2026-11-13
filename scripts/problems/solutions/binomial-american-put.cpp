#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    double S, K, r, sg, T;
    int N;
    if (scanf("%lf %lf %lf %lf %lf %d", &S, &K, &r, &sg, &T, &N) != 6) return 1;
    double dt = T / N, u = exp(sg * sqrt(dt)), d = 1 / u;
    double q = (exp(r * dt) - d) / (u - d), disc = exp(-r * dt), u2 = u * u;
    vector<double> V(N + 1);
    double s = S * pow(d, N);
    for (int j = 0; j <= N; j++) { V[j] = max(K - s, 0.0); s *= u2; }
    for (int i = N - 1; i >= 0; i--) {
        s = S * pow(d, i);
        for (int j = 0; j <= i; j++) {
            V[j] = max(max(K - s, disc * (q * V[j + 1] + (1 - q) * V[j])), 0.0);
            s *= u2;
        }
    }
    printf("%.6f\n", V[0]);
    return 0;
}
