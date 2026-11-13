#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<vector<string>> g(n, vector<string>(n));
    for (auto& row : g) {
        for (auto& s : row) cin >> s;
    }
    for (int j = 0; j < n; j++) {
        for (int i = 0; i < n; i++) cout << (i ? " " : "") << g[n - 1 - i][j];
        cout << "\n";
    }
    return 0;
}
