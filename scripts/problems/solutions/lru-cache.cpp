#include <iostream>
#include <list>
#include <string>
#include <unordered_map>
#include <utility>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    size_t cap;
    int t;
    cin >> cap >> t;
    list<pair<string, long long>> items;  // front = most recently used
    unordered_map<string, list<pair<string, long long>>::iterator> where;
    while (t--) {
        string op, key;
        cin >> op >> key;
        if (op == "PUT") {
            long long v;
            cin >> v;
            auto it = where.find(key);
            if (it != where.end()) {
                it->second->second = v;
                items.splice(items.begin(), items, it->second);
            } else {
                items.emplace_front(key, v);
                where[key] = items.begin();
                if (items.size() > cap) {
                    where.erase(items.back().first);
                    items.pop_back();
                }
            }
        } else {
            auto it = where.find(key);
            if (it == where.end()) {
                cout << "MISS\n";
            } else {
                items.splice(items.begin(), items, it->second);
                cout << it->second->second << "\n";
            }
        }
    }
    return 0;
}
