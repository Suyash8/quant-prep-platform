#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<int> coins(n);
    for (auto &c : coins) scanf("%d", &c);
    int amount;
    scanf("%d", &amount);
    const int INF = amount + 1;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int c : coins) {
        if (c < 1 || c > amount) continue;
        for (int x = c; x <= amount; x++)
            if (dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
    }
    printf("%d\n", dp[amount] <= amount ? dp[amount] : -1);
    return 0;
}
