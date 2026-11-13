#include <algorithm>
#include <cstdio>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

static void show(const char* name, unordered_map<long long, long long>& levels, bool descending, int k) {
    vector<long long> prices;
    for (const auto& kv : levels) prices.push_back(kv.first);
    sort(prices.begin(), prices.end());
    if (descending) reverse(prices.begin(), prices.end());
    printf("%s", name);
    if (prices.empty()) printf(" -");
    for (size_t i = 0; i < prices.size() && (int)i < k; i++) printf(" %lld:%lld", prices[i], levels[prices[i]]);
    printf("\n");
}

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    unordered_map<long long, long long> bids, asks;
    while (n--) {
        char kind, side;
        long long price, qty;
        if (scanf(" %c %c %lld %lld", &kind, &side, &price, &qty) != 4) return 1;
        auto& levels = side == 'B' ? bids : asks;
        long long total = levels[price] + (kind == 'A' ? qty : -qty);
        if (total == 0) levels.erase(price);
        else levels[price] = total;
    }
    show("BIDS", bids, true, k);
    show("ASKS", asks, false, k);
    return 0;
}
