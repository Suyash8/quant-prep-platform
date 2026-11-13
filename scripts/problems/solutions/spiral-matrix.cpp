#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<vector<string>> g(n, vector<string>(m));
    for (auto& row : g) {
        for (auto& s : row) cin >> s;
    }
    vector<string> out;
    int top = 0, bottom = n - 1, left = 0, right = m - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) out.push_back(g[top][j]);
        for (int i = top + 1; i <= bottom; i++) out.push_back(g[i][right]);
        if (top < bottom) {
            for (int j = right - 1; j >= left; j--) out.push_back(g[bottom][j]);
        }
        if (left < right) {
            for (int i = bottom - 1; i > top; i--) out.push_back(g[i][left]);
        }
        top++;
        bottom--;
        left++;
        right--;
    }
    for (size_t i = 0; i < out.size(); i++) cout << (i ? " " : "") << out[i];
    cout << "\n";
    return 0;
}
