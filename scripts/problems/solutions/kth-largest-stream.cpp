#include <cstdio>
#include <functional>
#include <queue>
#include <vector>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    priority_queue<long long, vector<long long>, greater<long long>> heap;  // the k largest so far
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 1;
        if ((int)heap.size() < k) {
            heap.push(x);
        } else if (x > heap.top()) {
            heap.pop();
            heap.push(x);
        }
        if ((int)heap.size() == k) printf("%lld\n", heap.top());
        else puts("-1");
    }
    return 0;
}
