#include <algorithm>
#include <cstdio>
#include <utility>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<pair<long long, long long>> w(n);
    for (auto& x : w) {
        if (scanf("%lld %lld", &x.first, &x.second) != 2) return 1;
    }
    sort(w.begin(), w.end());
    vector<pair<long long, long long>> merged;
    long long cs = w[0].first, ce = w[0].second;
    for (int i = 1; i < n; i++) {
        if (w[i].first <= ce) {
            ce = max(ce, w[i].second);
        } else {
            merged.emplace_back(cs, ce);
            cs = w[i].first;
            ce = w[i].second;
        }
    }
    merged.emplace_back(cs, ce);
    printf("%zu\n", merged.size());
    for (const auto& m : merged) printf("%lld %lld\n", m.first, m.second);
    return 0;
}
