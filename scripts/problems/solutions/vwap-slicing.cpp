#include <algorithm>
#include <cstdio>
#include <numeric>
#include <vector>
using namespace std;

int main() {
    int n;
    long long total;
    if (scanf("%d %lld", &n, &total) != 2) return 1;
    vector<long long> vol(n), base(n), rem(n);
    long long vSum = 0;
    for (auto& x : vol) {
        if (scanf("%lld", &x) != 1) return 1;
        vSum += x;
    }
    long long given = 0;
    for (int i = 0; i < n; i++) {
        base[i] = total * vol[i] / vSum;
        rem[i] = total * vol[i] % vSum;
        given += base[i];
    }
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) { return rem[a] != rem[b] ? rem[a] > rem[b] : a < b; });
    for (long long k = 0; k < total - given; k++) base[order[k]]++;
    for (int i = 0; i < n; i++) printf(i ? " %lld" : "%lld", base[i]);
    printf("\n");
    return 0;
}
