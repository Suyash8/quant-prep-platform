#include <algorithm>
#include <cstdio>
#include <deque>
#include <map>
#include <string>
using namespace std;

static string money(long long c) {
    char buf[32];
    snprintf(buf, sizeof buf, "%lld.%02lld", c / 100, c % 100);
    return buf;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    map<long long, deque<long long>> bids, asks;  // price -> FIFO of resting quantities
    while (n--) {
        char kind, side;
        if (scanf(" %c %c", &kind, &side) != 2) return 1;
        if (kind == 'L') {
            long long price, qty;
            if (scanf("%lld %lld", &price, &qty) != 2) return 1;
            (side == 'B' ? bids : asks)[price].push_back(qty);
            continue;
        }
        long long remaining;
        if (scanf("%lld", &remaining) != 1) return 1;
        map<long long, deque<long long>>& opp = (side == 'B') ? asks : bids;
        while (remaining > 0 && !opp.empty()) {
            auto it = (side == 'B') ? opp.begin() : prev(opp.end());
            deque<long long>& q = it->second;
            while (remaining > 0 && !q.empty()) {
                long long fill = min(remaining, q.front());
                printf("T %s %lld\n", money(it->first).c_str(), fill);
                remaining -= fill;
                q.front() -= fill;
                if (q.front() == 0) q.pop_front();
            }
            if (q.empty()) opp.erase(it);
        }
    }
    printf("BID %s\n", bids.empty() ? "-" : money(bids.rbegin()->first).c_str());
    printf("ASK %s\n", asks.empty() ? "-" : money(asks.begin()->first).c_str());
    return 0;
}
