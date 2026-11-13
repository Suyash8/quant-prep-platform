#include <algorithm>
#include <deque>
#include <iostream>
#include <string>
#include <utility>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long q;
    cin >> n >> q;
    deque<pair<string, long long>> queue;
    for (int i = 0; i < n; i++) {
        string name;
        long long d;
        cin >> name >> d;
        queue.emplace_back(name, d);
    }
    long long now = 0;
    while (!queue.empty()) {
        auto [name, remaining] = queue.front();
        queue.pop_front();
        long long run = min(q, remaining);
        now += run;
        remaining -= run;
        if (remaining > 0) queue.emplace_back(name, remaining);
        else cout << name << " " << now << "\n";
    }
    return 0;
}
