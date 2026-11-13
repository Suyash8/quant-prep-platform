#include <cstdio>
#include <cmath>
using namespace std;

int main() {
    long long n, f;
    if (scanf("%lld %lld", &n, &f) != 2) return 1;
    long long sum = 0, sq = 0;
    for (long long i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 1;
        sum += x;
        sq += x * x;
    }
    long long num = n * sq - sum * sum;
    if (n == 1 || num == 0) { printf("0.0000\n"); return 0; }
    double s = sqrt((double)num / ((double)n * (n - 1)));
    printf("%.4f\n", ((double)sum / n - f / 252.0) / s * sqrt(252.0));
    return 0;
}
