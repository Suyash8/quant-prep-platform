#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    while (!s.empty() && (s.back() == '\r' || s.back() == '\n' || s.back() == ' ')) s.pop_back();
    size_t i = 0;
    bool first = true;
    while (i < s.size()) {
        size_t j = i;
        while (j < s.size() && s[j] == s[i]) j++;
        if (!first) cout << ' ';
        cout << s[i] << (j - i);
        first = false;
        i = j;
    }
    cout << "\n";
    return 0;
}
