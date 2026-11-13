#include <algorithm>
#include <cstdio>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    long long x, cur = 0, best = 0;
    for (int i = 0; i < n; i++) {
        if (scanf("%lld", &x) != 1) return 1;
        cur = (i == 0) ? x : max(x, cur + x);
        best = (i == 0) ? cur : max(best, cur);
    }
    printf("%lld\n", best);
    return 0;
}
