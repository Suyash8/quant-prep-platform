#include <cstdio>
#include <tuple>
#include <vector>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<long long> val(n);
    vector<int> l(n), r(n);
    for (int i = 0; i < n; i++) {
        if (scanf("%lld %d %d", &val[i], &l[i], &r[i]) != 3) return 1;
    }
    const long long NEG = -(1LL << 40), POS = 1LL << 40;
    vector<tuple<int, long long, long long>> st;
    st.emplace_back(0, NEG, POS);
    while (!st.empty()) {
        auto [u, lo, hi] = st.back();
        st.pop_back();
        if (val[u] <= lo || val[u] >= hi) {
            puts("INVALID");
            return 0;
        }
        if (l[u] != -1) st.emplace_back(l[u], lo, val[u]);
        if (r[u] != -1) st.emplace_back(r[u], val[u], hi);
    }
    puts("VALID");
    return 0;
}
