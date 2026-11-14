#include <cstdio>
#include <cstdint>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;
typedef uint64_t u64;
static const uint32_t B = 1000000000u;
struct Big {  // sign-magnitude, base 1e9 little endian
    bool neg = false;
    vector<uint32_t> d;
    Big() {}
    Big(long long x) {
        if (x < 0) { neg = true; x = -x; }
        while (x) { d.push_back((uint32_t)(x % B)); x /= B; }
    }
    bool zero() const { return d.empty(); }
    void trim() { while (!d.empty() && d.back() == 0) d.pop_back(); if (d.empty()) neg = false; }
};
static int cmpMag(const Big& a, const Big& b) {
    if (a.d.size() != b.d.size()) return a.d.size() < b.d.size() ? -1 : 1;
    for (int i = (int)a.d.size() - 1; i >= 0; i--)
        if (a.d[i] != b.d[i]) return a.d[i] < b.d[i] ? -1 : 1;
    return 0;
}
static Big addMag(const Big& a, const Big& b) {
    Big r; u64 c = 0;
    for (size_t i = 0; i < max(a.d.size(), b.d.size()) || c; i++) {
        u64 s = c + (i < a.d.size() ? a.d[i] : 0) + (i < b.d.size() ? b.d[i] : 0);
        r.d.push_back((uint32_t)(s % B)); c = s / B;
    }
    return r;
}
static Big subMag(const Big& a, const Big& b) {  // |a| >= |b|
    Big r; long long c = 0;
    for (size_t i = 0; i < a.d.size(); i++) {
        long long s = (long long)a.d[i] - c - (i < b.d.size() ? b.d[i] : 0);
        if (s < 0) { s += B; c = 1; } else c = 0;
        r.d.push_back((uint32_t)s);
    }
    r.trim(); return r;
}
static Big add(const Big& a, const Big& b) {
    Big r;
    if (a.neg == b.neg) { r = addMag(a, b); r.neg = a.neg; }
    else {
        int c = cmpMag(a, b);
        if (c == 0) return Big();
        if (c > 0) { r = subMag(a, b); r.neg = a.neg; } else { r = subMag(b, a); r.neg = b.neg; }
    }
    r.trim(); return r;
}
static Big bneg(Big a) { if (!a.zero()) a.neg = !a.neg; return a; }
static Big sub(const Big& a, const Big& b) { return add(a, bneg(b)); }
static Big mul(const Big& a, const Big& b) {
    Big r; if (a.zero() || b.zero()) return r;
    vector<u64> t(a.d.size() + b.d.size() + 1, 0);
    for (size_t i = 0; i < a.d.size(); i++) {
        u64 c = 0;
        for (size_t j = 0; j < b.d.size() || c; j++) {
            u64 cur = t[i + j] + c + (j < b.d.size() ? (u64)a.d[i] * b.d[j] : 0);
            t[i + j] = cur % B; c = cur / B;
        }
    }
    for (u64 x : t) r.d.push_back((uint32_t)x);
    r.neg = a.neg != b.neg; r.trim(); return r;
}
static Big mulSmall(const Big& a, u64 m) {  // m < 1e9
    Big r; u64 c = 0;
    for (size_t i = 0; i < a.d.size() || c; i++) {
        u64 cur = c + (i < a.d.size() ? (u64)a.d[i] * m : 0);
        r.d.push_back((uint32_t)(cur % B)); c = cur / B;
    }
    r.trim(); return r;
}
// floor division of magnitudes, schoolbook with binary search per limb
static Big divMag(const Big& a, const Big& b) {
    Big q, rem; q.d.assign(a.d.size(), 0);
    for (int i = (int)a.d.size() - 1; i >= 0; i--) {
        rem.d.insert(rem.d.begin(), a.d[i]); rem.trim();
        uint32_t lo = 0;
        if (cmpMag(rem, b) >= 0) {
            long double rv = 0, bv = 0;
            int er = max(0, (int)rem.d.size() - 3), eb = max(0, (int)b.d.size() - 3);
            for (int t = (int)rem.d.size() - 1; t >= er; t--) rv = rv * B + rem.d[t];
            for (int t = (int)b.d.size() - 1; t >= eb; t--) bv = bv * B + b.d[t];
            long double est = rv / bv;
            for (int t = 0; t < er - eb; t++) est *= B;
            for (int t = 0; t < eb - er; t++) est /= B;
            if (est < 0) est = 0;
            if (est > B - 1) est = B - 1;
            lo = (uint32_t)est;
            while (lo > 0 && cmpMag(mulSmall(b, lo), rem) > 0) lo--;
            while (lo < B - 1 && cmpMag(mulSmall(b, lo + 1), rem) <= 0) lo++;
        }
        q.d[i] = lo;
        if (lo) rem = subMag(rem, mulSmall(b, lo));
    }
    q.trim(); return q;
}
static Big divExact(const Big& a, const Big& b) {
    Big q = divMag(a, b); if (!q.zero()) q.neg = a.neg != b.neg; return q;
}
static u64 toU64(const Big& a) {  // requires value < 2^64 (small)
    u64 r = 0; for (int i = (int)a.d.size() - 1; i >= 0; i--) r = r * B + a.d[i]; return r;
}
static Big fromU128(unsigned __int128 x) {
    Big r; while (x) { r.d.push_back((uint32_t)(x % B)); x /= B; } return r;
}
static Big pow10_12() { return Big(1000000000000LL); }
static string fmt(const Big& num, const Big& den, bool neg) {
    Big n12 = mul(num, pow10_12());
    Big q = divMag(n12, den);
    u64 qq = toU64(q);  // <= 1e18 because sqrt(R) <= 1e3
    u64 k = 0, lo = 0, hi = 2000000000ull;
    while (lo < hi) {
        u64 mid = lo + (hi - lo + 1) / 2;
        if ((unsigned __int128)mid * mid <= qq) lo = mid; else hi = mid - 1;
    }
    k = lo;
    Big lhs = mulSmall(n12, 4);
    Big rhs = mul(fromU128((unsigned __int128)(2 * k + 1) * (2 * k + 1)), den);
    int c = cmpMag(lhs, rhs);
    if (c > 0 || (c == 0 && (k & 1))) k++;
    char buf[64];
    snprintf(buf, sizeof buf, "%s%llu.%06llu", (neg && k) ? "-" : "", (unsigned long long)(k / 1000000), (unsigned long long)(k % 1000000));
    return buf;
}
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    vector<vector<Big>> a(n, vector<Big>(n));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {
            long long x;
            if (scanf("%lld", &x) != 1) return 1;
            a[i][j] = Big(x);
        }
    Big prev(1);
    vector<vector<string>> out(n, vector<string>(n, "0.000000"));
    for (int j = 0; j < n; j++) {
        Big pj = a[j][j];
        for (int i = j; i < n; i++) {
            if (i == j) out[i][j] = fmt(pj, prev, false);
            else {
                Big v = a[i][j];
                Big num = mul(v, v); num.neg = false;
                out[i][j] = fmt(num, mul(pj, prev), v.neg);
            }
        }
        for (int i = j + 1; i < n; i++)
            for (int k = j + 1; k < n; k++)
                a[i][k] = divExact(sub(mul(a[i][k], pj), mul(a[i][j], a[j][k])), prev);
        prev = pj;
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) { if (j) putchar(' '); fputs(out[i][j].c_str(), stdout); }
        putchar('\n');
    }
}
