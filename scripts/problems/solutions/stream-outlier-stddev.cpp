#include <cmath>
#include <cstdio>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long count = 0;
    double mean = 0.0, m2 = 0.0;
    while (n--) {
        long long xi;
        if (scanf("%lld", &xi) != 1) return 1;
        double x = (double)xi;
        count++;
        double delta = x - mean;
        mean += delta / count;
        double delta2 = x - mean;
        m2 += delta * delta2;
        double var = m2 / count;
        puts(var > 0 && fabs(x - mean) > 3 * sqrt(var) ? "outlier" : "ok");
    }
    return 0;
}
