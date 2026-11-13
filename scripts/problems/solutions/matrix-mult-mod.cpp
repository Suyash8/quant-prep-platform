#include <cstdio>
#include <vector>
using namespace std;

typedef unsigned long long u64;
typedef vector<vector<u64>> Matrix;

static Matrix multiply(const Matrix& a, const Matrix& b, u64 mod) {
    int n = (int)a.size();
    Matrix c(n, vector<u64>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int t = 0; t < n; t++) {
            if (a[i][t] == 0) continue;
            for (int j = 0; j < n; j++) c[i][j] = (c[i][j] + a[i][t] * b[t][j]) % mod;
        }
    }
    return c;
}

int main() {
    int n;
    u64 k, mod;
    if (scanf("%d %llu %llu", &n, &k, &mod) != 3) return 1;
    Matrix base(n, vector<u64>(n)), result(n, vector<u64>(n, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (scanf("%llu", &base[i][j]) != 1) return 1;
            base[i][j] %= mod;
        }
        result[i][i] = 1 % mod;
    }
    while (k) {
        if (k & 1) result = multiply(result, base, mod);
        base = multiply(base, base, mod);
        k >>= 1;
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) printf(j ? " %llu" : "%llu", result[i][j]);
        printf("\n");
    }
    return 0;
}
