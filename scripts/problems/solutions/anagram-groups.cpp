#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    map<string, vector<string>> groups;
    for (int i = 0; i < n; i++) {
        string w;
        cin >> w;
        string key = w;
        sort(key.begin(), key.end());
        groups[key].push_back(w);
    }
    vector<vector<string>> lists;
    for (auto& kv : groups) {
        sort(kv.second.begin(), kv.second.end());
        lists.push_back(kv.second);
    }
    sort(lists.begin(), lists.end(), [](const vector<string>& a, const vector<string>& b) {
        if (a.size() != b.size()) return a.size() > b.size();
        return a[0] < b[0];
    });
    cout << lists.size() << "\n";
    for (const auto& g : lists) {
        for (size_t i = 0; i < g.size(); i++) cout << (i ? " " : "") << g[i];
        cout << "\n";
    }
    return 0;
}
