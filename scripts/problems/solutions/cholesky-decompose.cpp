#include <cstdio>
#include <cmath>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<vector<double>> a(n, vector<double>(n)), L(n, vector<double>(n, 0.0));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {
            long long x;
            if (scanf("%lld", &x) != 1) return 1;
            a[i][j] = (double)x;
        }
    for (int j = 0; j < n; j++) {
        double s = a[j][j];
        for (int k = 0; k < j; k++) s -= L[j][k] * L[j][k];
        L[j][j] = sqrt(s);
        for (int i = j + 1; i < n; i++) {
            double t = a[i][j];
            for (int k = 0; k < j; k++) t -= L[i][k] * L[j][k];
            L[i][j] = t / L[j][j];
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (j) putchar(' ');
            if (fabs(L[i][j]) < 5e-7) printf("0.000000");
            else printf("%.6f", L[i][j]);
        }
        putchar('\n');
    }
    return 0;
}
