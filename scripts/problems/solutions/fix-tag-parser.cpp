#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;

static bool allDigits(const string& s) {
    if (s.empty()) return false;
    for (char c : s) {
        if (c < '0' || c > '9') return false;
    }
    return true;
}

static string parse(const string& line) {
    if (line.empty() || line.back() != '|') return "BAD_FORMAT";
    string body = line.substr(0, line.size() - 1);
    vector<string> fields;
    size_t start = 0;
    while (true) {
        size_t bar = body.find('|', start);
        if (bar == string::npos) {
            fields.push_back(body.substr(start));
            break;
        }
        fields.push_back(body.substr(start, bar - start));
        start = bar + 1;
    }
    map<string, string> values;
    vector<string> order;
    for (const string& f : fields) {
        size_t eq = f.find('=');
        if (eq == string::npos) return "BAD_FORMAT";
        string tag = f.substr(0, eq), val = f.substr(eq + 1);
        if (tag.size() < 1 || tag.size() > 4 || !allDigits(tag)) return "BAD_FORMAT";
        if (val.empty() || val.find('=') != string::npos || values.count(tag)) return "BAD_FORMAT";
        values[tag] = val;
        order.push_back(tag);
    }
    if (order.front() != "8" || order.back() != "10") return "BAD_FORMAT";
    const string& check = values["10"];
    if (check.size() != 3 || !allDigits(check)) return "BAD_FORMAT";
    string prefix = line.substr(0, line.size() - (3 + check.size() + 1));
    unsigned sum = 0;
    for (unsigned char c : prefix) sum += c;
    char buf[8];
    snprintf(buf, sizeof buf, "%03u", sum % 256);
    if (check != buf) return "BAD_CHECKSUM";
    string out = "OK";
    for (const char* t : {"35", "55", "38", "44"}) out += " " + (values.count(t) ? values[t] : string("-"));
    return out;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    string line;
    getline(cin, line);
    t = stoi(line);
    while (t-- && getline(cin, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        cout << parse(line) << "\n";
    }
    return 0;
}
