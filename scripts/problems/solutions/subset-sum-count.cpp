#include <cstdio>
#include <vector>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 1;
    vector<long long> dp(target + 1, 0);
    dp[0] = 1;
    for (int i = 0; i < n; i++) {
        int a;
        if (scanf("%d", &a) != 1) return 1;
        for (int x = target; x >= a; x--) dp[x] = (dp[x] + dp[x - a]) % MOD;
    }
    printf("%lld\n", dp[target] % MOD);
    return 0;
}
