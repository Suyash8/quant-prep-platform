#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    map<string, long long> net;
    for (int i = 0; i < n; i++) {
        string sym;
        long long q;
        cin >> sym >> q;
        net[sym] += q;
    }
    for (const auto& kv : net) cout << kv.first << " " << kv.second << "\n";
    return 0;
}
