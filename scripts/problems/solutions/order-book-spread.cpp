#include <cstdio>
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
    map<long long, long long> bids, asks;
    while (n--) {
        char kind, side;
        long long price, qty;
        if (scanf(" %c %c %lld %lld", &kind, &side, &price, &qty) != 4) return 1;
        map<long long, long long>& lv = (side == 'B') ? bids : asks;
        if (kind == 'A') {
            lv[price] += qty;
        } else {
            lv[price] -= qty;
            if (lv[price] == 0) lv.erase(price);
        }
        string b = bids.empty() ? "-" : money(bids.rbegin()->first);
        string a = asks.empty() ? "-" : money(asks.begin()->first);
        string s = (bids.empty() || asks.empty()) ? "-" : money(asks.begin()->first - bids.rbegin()->first);
        printf("%s %s %s\n", b.c_str(), a.c_str(), s.c_str());
    }
    return 0;
}
