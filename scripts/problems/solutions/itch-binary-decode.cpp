#include <cstdio>
#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
using namespace std;
typedef unsigned long long ull;

static int hv(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return c - 'A' + 10;
}

int main() {
    int n;
    string line;
    if (!(cin >> n)) return 1;
    getline(cin, line);
    ull expected = 1, shares = 0;
    unordered_map<ull, ull> book;
    for (int k = 0; k < n; k++) {
        getline(cin, line);
        while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) line.pop_back();
        if (line.size() % 2 == 1 || line.size() < 10) { puts("ERR LENGTH -"); continue; }
        vector<int> b;
        for (size_t i = 0; i < line.size(); i += 2) b.push_back(hv(line[i]) * 16 + hv(line[i + 1]));
        ull seq = 0;
        for (int i = 0; i < 4; i++) seq = seq * 256 + b[i];
        if (seq < expected) { printf("DUP %llu\n", seq); continue; }
        if (seq > expected) printf("GAP %llu %llu\n", expected, seq - 1);
        expected = seq + 1;
        int ty = b[4];
        size_t need;
        if (ty == 0x41) need = 22;
        else if (ty == 0x58 || ty == 0x45) need = 17;
        else { printf("ERR TYPE %llu\n", seq); continue; }
        if (ty == 0x41 && b.size() == 22 && b[13] != 0x42 && b[13] != 0x53) { printf("ERR TYPE %llu\n", seq); continue; }
        if (b.size() != need) { printf("ERR LENGTH %llu\n", seq); continue; }
        ull id = 0;
        for (int i = 5; i < 13; i++) id = id * 256 + b[i];
        int qo = ty == 0x41 ? 14 : 13;
        ull q = 0;
        for (int i = qo; i < qo + 4; i++) q = q * 256 + b[i];
        if (ty == 0x41) {
            if (book.count(id)) printf("ERR DUPID %llu\n", seq);
            else book[id] = q;
        } else {
            auto it = book.find(id);
            if (it == book.end()) printf("ERR UNKNOWN %llu\n", seq);
            else if (q > it->second) printf("ERR OVERFLOW %llu\n", seq);
            else {
                it->second -= q;
                if (ty == 0x45) shares += q;
                if (it->second == 0) book.erase(it);
            }
        }
    }
    printf("BOOK %zu\nSHARES %llu\n", book.size(), shares);
    return 0;
}
