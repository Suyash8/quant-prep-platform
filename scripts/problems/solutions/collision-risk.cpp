#include <cstdio>
#include <cstdlib>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<long long> x(n), v(n);
    for (auto& a : x) {
        if (scanf("%lld", &a) != 1) return 1;
    }
    for (auto& a : v) {
        if (scanf("%lld", &a) != 1) return 1;
    }
    long long t;
    if (scanf("%lld", &t) != 1) return 1;
    // tau = dx / dv with dx = xj - xi, dv = vi - vj. Integer test: same sign and |dx| <= t * |dv|.
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            long long dx = x[j] - x[i], dv = v[i] - v[j];
            if (dv == 0) continue;
            if ((dx > 0) == (dv > 0) && llabs(dx) <= t * llabs(dv)) {
                puts("COLLIDE");
                return 0;
            }
        }
    }
    puts("SAFE");
    return 0;
}
