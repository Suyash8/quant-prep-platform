#include <cstdio>
#include <functional>
#include <queue>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    priority_queue<long long> low;                                           // smaller half
    priority_queue<long long, vector<long long>, greater<long long>> high;  // larger half
    while (n--) {
        long long x;
        if (scanf("%lld", &x) != 1) return 1;
        if (low.empty() || x <= low.top()) low.push(x);
        else high.push(x);
        if (low.size() > high.size() + 1) {
            high.push(low.top());
            low.pop();
        } else if (high.size() > low.size()) {
            low.push(high.top());
            high.pop();
        }
        long long total = low.size() > high.size() ? low.top() * 2 : low.top() + high.top();
        printf("%lld.%d\n", total / 2, total % 2 ? 5 : 0);
    }
    return 0;
}
