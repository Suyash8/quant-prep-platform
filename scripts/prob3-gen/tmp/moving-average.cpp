#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    auto emit = [&](long long s) {
        long long t = (200 * s + k) / (2 * k); // round-half-up of s/k to hundredths
        printf("%lld.%02lld\n", t / 100, t % 100);
    };
    emit(s);
    for (int i = k; i < n; i++) {
        s += a[i] - a[i - k];
        emit(s);
    }
    return 0;
}
