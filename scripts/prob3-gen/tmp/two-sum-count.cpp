#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    unordered_map<long long, long long> seen;
    seen.reserve(2 * (size_t)n);
    long long count = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        auto it = seen.find(target - x);
        if (it != seen.end()) count += it->second;
        ++seen[x];
    }
    printf("%lld\n", count);
    return 0;
}
