#include <cstdio>
#include <deque>
#include <vector>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    vector<long long> a(n);
    for (auto& x : a) {
        if (scanf("%lld", &x) != 1) return 1;
    }
    deque<int> dq;  // indices, values decreasing from front to back
    bool first = true;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) {
            printf(first ? "%lld" : " %lld", a[dq.front()]);
            first = false;
        }
    }
    printf("\n");
    return 0;
}
