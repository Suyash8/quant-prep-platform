#include <algorithm>
#include <cstdio>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    double peak = 0.0, worst = 0.0;
    for (int i = 0; i < n; i++) {
        double v;
        if (scanf("%lf", &v) != 1) return 1;
        peak = max(peak, v);
        worst = max(worst, (peak - v) / peak);
    }
    printf("%.4f\n", worst);
    return 0;
}
