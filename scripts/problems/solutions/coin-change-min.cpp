#include <algorithm>
#include <cstdio>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<int> coins(n);
    for (auto& c : coins) {
        if (scanf("%d", &c) != 1) return 1;
    }
    int amount;
    if (scanf("%d", &amount) != 1) return 1;
    const int INF = amount + 1;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int x = 1; x <= amount; x++) {
        for (int c : coins) {
            if (c <= x) dp[x] = min(dp[x], dp[x - c] + 1);
        }
    }
    printf("%d\n", dp[amount] <= amount ? dp[amount] : -1);
    return 0;
}
