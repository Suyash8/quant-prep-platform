#!/usr/bin/env python3
"""Generate problems 5-7: rolling-max-window, median-of-two-sorted, implied-vol-bisection."""
import json, os, math

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../content/problems'))
os.makedirs(OUT, exist_ok=True)

def p(md): return {"type": "p", "md": md}
def h2(t): return {"type": "h2", "text": t}
def h3(t): return {"type": "h3", "text": t}
def math_b(tex, caption=None):
    d = {"type": "math", "tex": tex}
    if caption: d["caption"] = caption
    return d
def code(lang, c, caption=None):
    d = {"type": "code", "lang": lang, "code": c}
    if caption: d["caption"] = caption
    return d
def callout(variant, title, md): return {"type": "callout", "variant": variant, "title": title, "md": md}
def lst(items, ordered=False): return {"type": "list", "ordered": ordered, "items": items}
def table(headers, rows): return {"type": "table", "headers": headers, "rows": rows}
def steps(title, items): return {"type": "steps", "title": title, "items": items}

def write(slug, obj):
    obj["slug"] = slug
    path = os.path.join(OUT, slug + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
    print("wrote", path)

def T(pairs):
    return [{"input": i, "expected": o, "hidden": h} for (i, o, h) in pairs]

# ============================================================================
# 5. rolling-max-window
# ============================================================================

SOL_RM_PY = r'''import sys
from collections import deque

def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0]); k = int(data[1])
    a = [int(x) for x in data[2:2 + n]]
    dq = deque()
    out = []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(str(a[dq[0]]))
    sys.stdout.write(" ".join(out) + "\n")

main()
'''

SOL_RM_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    deque<int> dq;
    string out;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) {
            out += to_string(a[dq.front()]);
            out += (i + 1 < n) ? ' ' : '\n';
        }
    }
    fputs(out.c_str(), stdout);
    return 0;
}
'''

def rm_brute(a, k):
    return [max(a[i:i + k]) for i in range(len(a) - k + 1)]

assert " ".join(map(str, rm_brute([1, 3, -1, -3, 5, 3, 6, 7], 3))) == "3 3 5 5 6 7"
assert " ".join(map(str, rm_brute([-5, -2, -9, -1, -7, -3, -8], 3))) == "-2 -1 -1 -1 -3"

n_perf = 50000
k_perf = 137
perf_vals = [(i * 1103515245 + 12345) % 1000003 - 500000 for i in range(n_perf)]
perf_in = "%d %d\n%s\n" % (n_perf, k_perf, " ".join(map(str, perf_vals)))
perf_out = " ".join(map(str, rm_brute(perf_vals, k_perf))) + "\n"

rm_tests = T([
    ("8 3\n1 3 -1 -3 5 3 6 7\n", "3 3 5 5 6 7\n", False),
    ("5 1\n4 2 9 1 5\n", "4 2 9 1 5\n", False),
    ("5 5\n2 4 1 3 9\n", "9\n", False),
    ("6 2\n1 2 3 4 5 6\n", "2 3 4 5 6\n", True),
    ("6 2\n6 5 4 3 2 1\n", "6 5 4 3 2\n", True),
    ("7 3\n-5 -2 -9 -1 -7 -3 -8\n", "-2 -1 -1 -1 -3\n", False),
    ("4 4\n-1 -2 -3 -4\n", "-1\n", True),
    ("2 2\n-1000000000 1000000000\n", "1000000000\n", True),
    (perf_in, perf_out, True),
])

write("rolling-max-window", {
    "title": "Sliding Window Maximum",
    "difficulty": "hard",
    "category": "cpp-internals",
    "tags": ["monotonic-deque", "sliding-window", "std-deque", "amortized-analysis"],
    "statement": [
        p("A market-data feed delivers an array of $n$ values and a window size $k$. A consumer repeatedly asks: what is the largest value inside the most recent $k$ samples? Computing `max` from scratch for every window costs $O(nk)$ — fine for a demo, fatal at feed rates. You must produce the maximum of **every contiguous window of length $k$** in one left-to-right sweep."),
        p("Formally, with array $a$ indexed $0 \\dots n-1$, output $\\max(a_i, \\dots, a_{i+k-1})$ for every $i = 0, \\dots, n-k$."),
        callout("info", "Why a plain data structure stalls", "A heap gives you the max in $O(\\log k)$ but cannot evict elements that fall out of the window on the left without lazy deletion bookkeeping. A balanced BST works but carries heavy constants. The right tool keeps exactly the *useful candidates* in a **monotonic deque**: indices whose values are decreasing, where every element is pushed and popped at most once — $O(n)$ total."),
        p("The name of the game for the C++ implementer is also *which* deque: `std::deque` allocates fixed-size blocks in a map of chunks (good cache behavior for this pattern), while a raw ring buffer over a `vector` gives even tighter memory. Either passes comfortably; a naive $O(nk)$ loop does not."),
    ],
    "inputFormat": "Line 1: `n k` ($1 \\le k \\le n$). Line 2: $n$ space-separated integers.",
    "outputFormat": "One line with $n - k + 1$ space-separated integers: the maximum of each window, left to right.",
    "constraints": [
        "1 <= k <= n <= 2 * 10^5",
        "-10^9 <= a_i <= 10^9"
    ],
    "examples": [
        {"input": "8 3\n1 3 -1 -3 5 3 6 7\n", "output": "3 3 5 5 6 7\n",
         "explanation": "Windows: `[1 3 -1] -> 3`, `[3 -1 -3] -> 3`, `[-1 -3 5] -> 5`, `[-3 5 3] -> 5`, `[5 3 6] -> 6`, `[3 6 7] -> 7`."},
        {"input": "5 1\n4 2 9 1 5\n", "output": "4 2 9 1 5\n",
         "explanation": "A window of size 1 is just each element echoed."},
        {"input": "7 3\n-5 -2 -9 -1 -7 -3 -8\n", "output": "-2 -1 -1 -1 -3\n",
         "explanation": "All-negative data: `[-5 -2 -9] -> -2`, `[-2 -9 -1] -> -1`, `[-9 -1 -7] -> -1`, `[-1 -7 -3] -> -1`, `[-7 -3 -8] -> -3`."},
    ],
    "hints": [
        "Store *indices*, not values, in the deque — you need to know when an element leaves the window.",
        "Before pushing index i, pop from the back every index whose value is <= a[i]: they can never be a window maximum again while i is alive.",
        "The front of the deque is always the current window maximum; pop it from the front once it slides out (index <= i - k)."
    ],
    "editorial": [
        h2("Approach: monotonic decreasing deque of indices"),
        p("Sweep $i$ from left to right keeping a deque of indices whose values form a strictly decreasing sequence from front to back. The invariant: every index in the deque is a *candidate* maximum for the current window — any earlier index with a value $\\le a_i$ was dominated by $i$ (younger and at least as large) and is popped before $i$ enters. Processing index $i$ takes three steps:"),
        lst([
            "**Back-pop:** while the deque is non-empty and $a[\\text{back}] \\le a_i$, pop the back. (Using $\\le$ keeps equal values out, which is fine and slightly shrinks the deque.)",
            "**Push:** append $i$ to the back.",
            "**Evict & report:** if the front index is $\\le i - k$ it left the window — pop the front. If $i \\ge k-1$, the window $[i-k+1, i]$ is complete and its maximum is $a[\\text{front}]$."
        ]),
        steps("Trace of 1 3 -1 -3 5 3 6 7 with k = 3", [
            "i=0 (1): deque [0]",
            "i=1 (3): pop 0 (1<=3), push 1        deque [1]        output a[1]=3? not yet (window incomplete)",
            "i=2 (-1): push 2                     deque [1,2]      window [0..2] -> max a[1]=3",
            "i=3 (-3): push 3                     deque [1,2,3]    -> max 3",
            "i=4 (5): pop 3,2,1 (all <=5), push 4 deque [4]       -> max 5",
            "i=5 (3): push 5                      deque [4,5]      -> max 5",
            "i=6 (6): pop 5,4, push 6             deque [6]        -> max 6",
            "i=7 (7): pop 6, push 7               deque [7]        -> max 7",
            "Outputs: 3 3 5 5 6 7."
        ]),
        p("Each index is pushed once and popped at most once, so the total work is $O(n)$ despite the nested `while` — the classic **amortized** argument. Memory is $O(k)$ for the deque. In C++, `std::deque<int>` is the natural fit (its block layout avoids the reallocation spikes a growing `vector` can cause), and `std::monotonic_buffer_resource`-style ring buffers squeeze the constants further."),
        code("python", SOL_RM_PY.strip(), "Reference solution (Python)"),
        callout("pitfall", "Off-by-one eviction and equality pops", "Evict from the front while `front <= i - k` (strictly: an index is out of the window once `i - front >= k`). Popping with `<` instead of `<=` on the back also still works for correctness but leaves duplicate-dominated entries around; the reference uses `<=` for a leaner deque."),
    ],
    "solutions": {"python": SOL_RM_PY.strip(), "cpp": SOL_RM_CPP.strip()},
    "tests": rm_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 30,
})

# ============================================================================
# 6. median-of-two-sorted
# ============================================================================

SOL_MT_PY = r'''import sys

def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0]); m = int(data[1])
    A = [int(x) for x in data[2:2 + n]]
    B = [int(x) for x in data[2 + n:2 + n + m]]
    if n > m:
        A, B = B, A
        n, m = m, n
    total = n + m
    lo, hi = 0, n
    NEG = float("-inf")
    POS = float("inf")
    while True:
        i = (lo + hi) // 2
        j = (total + 1) // 2 - i
        Aleft = A[i - 1] if i > 0 else NEG
        Aright = A[i] if i < n else POS
        Bleft = B[j - 1] if j > 0 else NEG
        Bright = B[j] if j < m else POS
        if Aleft <= Bright and Bleft <= Aright:
            if total % 2 == 1:
                best = max(Aleft, Bleft)
                v = float(best)
            else:
                s = max(Aleft, Bleft) + min(Aright, Bright)
                v = s / 2
            print("%.1f" % v)
            return
        if Aleft > Bright:
            hi = i - 1
        else:
            lo = i + 1

main()
'''

SOL_MT_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    vector<long long> A(n), B(m);
    for (auto &x : A) scanf("%lld", &x);
    for (auto &x : B) scanf("%lld", &x);
    if (n > m) { swap(A, B); swap(n, m); }
    int total = n + m;
    int lo = 0, hi = n;
    const long long NEG = LLONG_MIN, POS = LLONG_MAX;
    while (true) {
        int i = (lo + hi) / 2;
        int j = (total + 1) / 2 - i;
        long long Aleft  = (i > 0) ? A[i - 1] : NEG;
        long long Aright = (i < n) ? A[i]     : POS;
        long long Bleft  = (j > 0) ? B[j - 1] : NEG;
        long long Bright = (j < m) ? B[j]     : POS;
        if (Aleft <= Bright && Bleft <= Aright) {
            double v;
            if (total % 2 == 1) {
                v = (double)max(Aleft, Bleft);
            } else {
                long long s = max(Aleft, Bleft) + min(Aright, Bright);
                v = (double)s / 2.0;
            }
            printf("%.1f\n", v);
            return 0;
        }
        if (Aleft > Bright) hi = i - 1; else lo = i + 1;
    }
}
'''

def median_merged(a, b):
    c = sorted(a + b)
    t = len(c)
    if t % 2 == 1:
        return float(c[t // 2])
    return (c[t // 2 - 1] + c[t // 2]) / 2

N_BIG = 20000
A_big = [2 * i for i in range(1, N_BIG + 1)]
B_big = [2 * i - 1 for i in range(1, N_BIG + 1)]
assert median_merged(A_big, B_big) == (N_BIG + N_BIG + 1) / 2

mt_tests = T([
    ("2 1\n1 3\n2\n", "2.0\n", False),
    ("2 2\n1 2\n3 4\n", "2.5\n", False),
    ("4 2\n1 2 3 9\n4 5\n", "3.5\n", False),
    ("1 0\n5\n", "5.0\n", True),
    ("3 3\n1 3 5\n2 4 6\n", "3.5\n", True),
    ("2 2\n-5 -1\n-3 7\n", "-2.0\n", True),
    ("4 4\n2 2 2 2\n2 2 2 2\n", "2.0\n", True),
    ("5 1\n1 2 3 4 5\n100\n", "3.5\n", True),
    ("1 1\n-1000000000\n1000000000\n", "0.0\n", True),
    ("%d %d\n%s\n%s\n" % (N_BIG, N_BIG, " ".join(map(str, A_big)), " ".join(map(str, B_big))),
     "%.1f\n" % median_merged(A_big, B_big), True),
])

write("median-of-two-sorted", {
    "title": "Median of Two Sorted Arrays",
    "difficulty": "hard",
    "category": "advanced",
    "tags": ["binary-search", "partition", "two-arrays"],
    "statement": [
        p("You are given two sorted arrays $A$ (length $n$) and $B$ (length $m$), either of which may be empty. Return the **median** of the multiset that would result from merging them: the single middle element if $n + m$ is odd, and the average of the two middle elements if $n + m$ is even."),
        p("The naive route — merge into one array of size $n + m$ and index the middle — is $O(n + m)$ time and memory and works, but the interview-grade requirement is $O(\\log(\\min(n, m)))$ via a **binary search on the partition** of the smaller array."),
        callout("info", "The partition idea", "Imagine cutting $A$ after $i$ elements and $B$ after $j$ elements, so the left half of the conceptual merge holds exactly $i + j = \\lceil (n+m)/2 \\rceil$ elements. The cut is *correct* iff every element on the left is $\\le$ every element on the right, which reduces to two local checks: $A[i-1] \\le B[j]$ and $B[j-1] \\le A[i]$. Because $A$ is sorted, increasing $i$ only pushes `Aleft` up and `Bright` down — so the predicate 'cut too far right' is monotone and binary search finds the unique valid cut."),
    ],
    "inputFormat": "Line 1: `n m` ($n + m \\ge 1$). Line 2: $n$ space-separated integers (the array $A$). Line 3: $m$ space-separated integers (the array $B$). Both arrays are individually sorted in non-decreasing order.",
    "outputFormat": "One line: the median formatted with exactly one digit after the decimal point (e.g. `2.0`, `2.5`, `-2.0`).",
    "constraints": [
        "0 <= n, m and 1 <= n + m <= 4 * 10^5",
        "-10^9 <= every element <= 10^9",
        "Each array is sorted non-decreasingly"
    ],
    "examples": [
        {"input": "2 1\n1 3\n2\n", "output": "2.0\n", "explanation": "Merged: [1, 2, 3] — odd length, middle element 2."},
        {"input": "2 2\n1 2\n3 4\n", "output": "2.5\n", "explanation": "Merged: [1, 2, 3, 4] — even length, median (2 + 3) / 2 = 2.5."},
        {"input": "4 2\n1 2 3 9\n4 5\n", "output": "3.5\n", "explanation": "Merged: [1, 2, 3, 4, 5, 9] — median (3 + 4) / 2 = 3.5."},
    ],
    "hints": [
        "Binary search on the smaller array so that j = (n + m + 1) / 2 - i never leaves [0, m].",
        "Treat out-of-range cuts as -infinity on the left edge and +infinity on the right edge — that makes empty arrays and lopsided cuts fall out of the case analysis.",
        "Odd total: the median is max(Aleft, Bleft). Even total: average of max(Aleft, Bleft) and min(Aright, Bright)."
    ],
    "editorial": [
        h2("Approach: binary search the cut point"),
        p("WLOG $n \\le m$ (swap otherwise). We search for $i \\in [0, n]$, the number of $A$'s elements placed on the left side; then $j = \\frac{n + m + 1}{2} - i$ forces the left side to hold exactly $\\lceil (n+m)/2 \\rceil$ elements. Define the four boundary values with sentinels $\\pm\\infty$ when a cut lands at an array's end: `Aleft = A[i-1]`, `Aright = A[i]`, `Bleft = B[j-1]`, `Bright = B[j]`. The cut is valid iff `Aleft <= Bright` and `Bleft <= Aright`. If `Aleft > Bright`, the cut in $A$ is too far right — shrink it (`hi = i - 1`); otherwise grow it (`lo = i + 1`)."),
        steps("Why the search always finds a cut", [
            "A valid cut always exists (this is the median's defining property).",
            "The predicate 'Aleft > Bright' is monotone in $i$: raising $i$ increases `Aleft` and decreases `Bright`, so once it becomes true it stays true.",
            "Binary search therefore converges to the unique valid $i$ in $O(\\log \\min(n, m))$ probes."
        ]),
        p("Once valid: for an odd total the median is $\\max(\\text{Aleft}, \\text{Bleft})$; for an even total it is the average of that maximum and $\\min(\\text{Aright}, \\text{Bright})$. Sentinels make every degenerate shape — one empty array, the whole of $A$ on one side — a plain comparison rather than special-case code. Print with `%.1f`: medians are either integers or exact halves, so one decimal digit is lossless."),
        code("python", SOL_MT_PY.strip(), "Reference solution (Python)"),
        callout("pitfall", "Forgetting to search the smaller array", "If $n > m$ and you binary-search $A$, then $j$ can go negative or beyond $m$ and the sentinels no longer save you. Swap first so the searched array is the short one."),
    ],
    "solutions": {"python": SOL_MT_PY.strip(), "cpp": SOL_MT_CPP.strip()},
    "tests": mt_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 35,
})

# ============================================================================
# 7. implied-vol-bisection
# ============================================================================

def Ncdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def bs_call(S, K, r, T, sigma):
    sq = sigma * math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / sq
    d2 = d1 - sq
    return S * Ncdf(d1) - K * math.exp(-r * T) * Ncdf(d2)

CASES = [
    (100, 100, 0.05, 1, 0.25),
    (120, 110, 0.03, 0.5, 0.35),
    (80, 90, 0.02, 2, 0.20),
    (100, 100, 0.0, 1, 0.10),
    (50, 55, 0.04, 0.25, 0.45),
    (1000, 950, 0.01, 0.25, 0.18),
    (100, 105, 0.05, 0.5, 0.30),
    (10, 12, 0.06, 3, 0.55),
]
PRICES = ["%.4f" % bs_call(*c) for c in CASES]
# sanity: intrinsic must be well below quoted price, and price < S
for (S, K, r, T, sig), pr in zip(CASES, PRICES):
    prf = float(pr)
    intrinsic = max(0.0, S - K * math.exp(-r * T))
    assert prf > intrinsic + 0.05, (CASES, pr)
    assert prf < S * 0.85, (CASES, pr)

def case_line(idx):
    S, K, r, T, sig = CASES[idx]
    return "%s %s %s %s %s" % (S, K, r, T, PRICES[idx])

def expect(idx):
    return "%.4f" % CASES[idx][4]

SOL_IV_PY = r'''import sys, math

def bs_call(S, K, r, T, sigma):
    sq = sigma * math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / sq
    d2 = d1 - sq
    nd1 = 0.5 * (1.0 + math.erf(d1 / math.sqrt(2.0)))
    nd2 = 0.5 * (1.0 + math.erf(d2 / math.sqrt(2.0)))
    disc = K * math.exp(-r * T)
    term2 = disc * nd2
    term1 = S * nd1
    return term1 - term2

def main():
    data = sys.stdin.read().split()
    q = int(data[0])
    idx = 1
    out = []
    for _ in range(q):
        S = float(data[idx]); K = float(data[idx + 1]); r = float(data[idx + 2])
        T = float(data[idx + 3]); price = float(data[idx + 4])
        idx += 5
        lo, hi = 1e-6, 5.0
        for _ in range(200):
            mid = 0.5 * (lo + hi)
            if bs_call(S, K, r, T, mid) < price:
                lo = mid
            else:
                hi = mid
        out.append("%.4f" % (0.5 * (lo + hi)))
    sys.stdout.write("\n".join(out) + "\n")

main()
'''

SOL_IV_CPP = r'''#include <bits/stdc++.h>
using namespace std;

static double Ncdf(double x) {
    return 0.5 * (1.0 + erf(x / sqrt(2.0)));
}

static double bsCall(double S, double K, double r, double T, double sigma) {
    double sq = sigma * sqrt(T);
    double hsig = 0.5 * sigma;
    double hsig2 = hsig * sigma;
    double rt = r + hsig2;
    double rtT = rt * T;
    double num = log(S / K) + rtT;
    double d1 = num / sq;
    double d2 = d1 - sq;
    double nd1 = Ncdf(d1);
    double nd2 = Ncdf(d2);
    double disc = K * exp(-r * T);
    double term2 = disc * nd2;
    double term1 = S * nd1;
    return term1 - term2;
}

int main() {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    for (int t = 0; t < q; t++) {
        double S, K, r, T, price;
        scanf("%lf %lf %lf %lf %lf", &S, &K, &r, &T, &price);
        double lo = 1e-6, hi = 5.0;
        for (int it = 0; it < 200; it++) {
            double mid = 0.5 * (lo + hi);
            if (bsCall(S, K, r, T, mid) < price) lo = mid; else hi = mid;
        }
        printf("%.4f\n", 0.5 * (lo + hi));
    }
    return 0;
}
'''

iv_tests = T([
    ("1\n" + case_line(0) + "\n", expect(0) + "\n", False),
    ("2\n" + case_line(1) + "\n" + case_line(2) + "\n", expect(1) + "\n" + expect(2) + "\n", False),
    ("1\n" + case_line(4) + "\n", expect(4) + "\n", False),
    ("3\n" + case_line(3) + "\n" + case_line(5) + "\n" + case_line(6) + "\n",
     "\n".join([expect(3), expect(5), expect(6)]) + "\n", True),
    ("2\n" + case_line(7) + "\n" + case_line(0) + "\n", expect(7) + "\n" + expect(0) + "\n", True),
    ("8\n" + "\n".join(case_line(i) for i in range(8)) + "\n",
     "\n".join(expect(i) for i in range(8)) + "\n", False),
    ("5\n" + "\n".join(case_line(i) for i in [2, 2, 1, 1, 0]) + "\n",
     "\n".join(expect(i) for i in [2, 2, 1, 1, 0]) + "\n", True),
])

write("implied-vol-bisection", {
    "title": "Implied Volatility Solver",
    "difficulty": "hard",
    "category": "quant-finance",
    "tags": ["black-scholes", "bisection", "root-finding", "erf", "implied-volatility"],
    "statement": [
        p("A trader quotes you a European call price. Everything else in Black-Scholes is known — spot $S$, strike $K$, risk-free rate $r$, time to maturity $T$ — except the volatility $\\sigma$ the market has implicitly agreed on. That number is the **implied volatility**, and finding it is a root-finding problem: solve"),
        math_b(r"C_{BS}(S, K, r, T, \sigma) = S\,N(d_1) - K e^{-rT} N(d_2)", "Black-Scholes call price"),
        math_b(r"d_1 = \frac{\ln(S/K) + (r + \sigma^2/2)\,T}{\sigma \sqrt{T}}, \qquad d_2 = d_1 - \sigma \sqrt{T}", ""),
        p("for $\\sigma$ such that $C_{BS}(\\sigma)$ equals the quoted market price $C$. The standard-normal CDF must be evaluated as"),
        math_b(r"N(x) = \tfrac{1}{2}\left(1 + \operatorname{erf}\!\left(\frac{x}{\sqrt{2}}\right)\right)"),
        callout("warn", "Mandatory: use erf — not a hand-rolled approximation", "Implement $N(x)$ with the error function exactly as written: `math.erf` in Python and `erf` from `<cmath>` / `<math.h>` in C++. Polynomial Abramowitz–Stegun approximations drift by up to $10^{-5}$ in price, which moves the recovered volatility by enough to change the 4th decimal place — the checker compares exact text, so those approximations will be judged wrong even though they are 'usually fine'."),
        p("$C_{BS}(\\sigma)$ is strictly increasing in $\\sigma$ (the vega of an option is positive), so a **bisection search** is simple, robust and deterministic: start with the bracket $[\\sigma_{lo}, \\sigma_{hi}] = [10^{-6},\\ 5]$, and repeatedly test the midpoint — if $C_{BS}(\\text{mid}) < C$ the root lies to the right, otherwise to the left. Iterate until the bracket is narrower than $10^{-9}$ (or run 200 fixed iterations, which is far past double precision). Print the final midpoint rounded to **4 decimal places**."),
        callout("pitfall", "Precision discipline", "Keep the arithmetic in IEEE doubles in the natural order of the formulas. The reference solutions evaluate the terms of the price separately and subtract once; combined with erf-based $N$, Python and C++ agree bit-for-bit, and because every quoted price below corresponds to a volatility near a clean value, the 4-decimal output is identical for any correct implementation within bisection tolerance $10^{-9}$."),
    ],
    "inputFormat": "Line 1: $Q$ — the number of quotes ($1 \\le Q \\le 20$). Each of the next $Q$ lines contains five space-separated numbers: `S K r T C` — spot, strike, annual risk-free rate, time to maturity in years, and the market call price.",
    "outputFormat": "For each quote, one line: the implied volatility with exactly 4 digits after the decimal point (e.g. `0.2500`).",
    "constraints": [
        "1 <= Q <= 20",
        "0 < K <= S <= 100000",
        "0 <= r <= 0.2, 0 < T <= 5",
        "Each quoted price admits exactly one implied volatility in [0.001, 5) for the given parameters"
    ],
    "examples": [
        {"input": "1\n100 100 0.05 1 " + PRICES[0] + "\n", "output": "0.2500\n",
         "explanation": "At-the-money one-year call with $S = K = 100$, $r = 5\\%$: the Black-Scholes price hits " + PRICES[0] + " exactly when $\\sigma = 0.25$."},
        {"input": "2\n" + case_line(1) + "\n" + case_line(2) + "\n",
         "output": expect(1) + "\n" + expect(2) + "\n",
         "explanation": "Two more quotes: a slightly ITM half-year call and a two-year OTM call, implying volatilities " + expect(1) + " and " + expect(2) + "."},
        {"input": "1\n50 55 0.04 0.25 " + PRICES[4] + "\n", "output": "0.4500\n",
         "explanation": "A short-dated OTM call: vega is small, but bisection still converges without difficulty."},
    ],
    "hints": [
        "Vega is positive, so price is monotone in sigma — plain bisection is enough; no Newton iteration needed.",
        "N(x) = 0.5 * (1 + erf(x / sqrt(2))). In C++ include <cmath> and call erf; in Python import math and call math.erf.",
        "Run 200 bisection iterations (or until hi - lo < 1e-9) and print the midpoint with %.4f."
    ],
    "editorial": [
        h2("Approach: monotonicity + bisection on sigma"),
        p("For fixed $(S, K, r, T)$ with $T > 0$, the map $\\sigma \\mapsto C_{BS}(\\sigma)$ is continuous and strictly increasing ($\\partial C / \\partial \\sigma = S\\sqrt{T}\\,\\varphi(d_1) > 0$), so the implied volatility is the unique root of $f(\\sigma) = C_{BS}(\\sigma) - C$. Bisection halves the bracket each step and needs only sign comparisons — no derivatives, no convergence surprises, deterministic output:"),
        lst([
            "Initialize `lo = 1e-6`, `hi = 5.0`.",
            "Repeat 200 times: `mid = 0.5 * (lo + hi)`; if `bsCall(S, K, r, T, mid) < C` set `lo = mid`, else `hi = mid`.",
            "Print `%.4f` of the final midpoint."
        ]),
        p("After 200 halvings the bracket width is below $10^{-55}$ — vastly beyond double precision, so the loop is effectively converged after ~55 iterations and the remaining iterations only move the midpoint within a few ULPs. Two implementation notes matter for byte-identical output: evaluate the normal CDF strictly as $0.5\\,(1 + \\operatorname{erf}(x/\\sqrt 2))$ using the platform `erf` (both Python's `math.erf` and C's `erf` are accurate to about one ULP, and the 4-decimal rounding is insensitive to differences at that scale), and compute the price as $S N(d_1) - K e^{-rT} N(d_2)$ with the two products formed separately before the subtraction."),
        p("Complexity: $O(Q \\cdot I)$ with $I \\approx 60$ effective iterations — a few thousand erf evaluations, microseconds of work. In production you would use Newton's method with a vega derivative, or Jäckel's least-squares approaches for extreme quotes; bisection is the right tool for a robust always-correct baseline, and it is what the checker tolerates: any correct implementation lands within $10^{-9}$ of the same root, far inside the $5 \\times 10^{-5}$ rounding window at 4 decimals."),
        code("python", SOL_IV_PY.strip(), "Reference solution (Python)"),
        callout("quant", "Why the quoted prices round-trip cleanly", "Each test price is the Black-Scholes price at a clean volatility, quoted to 4 decimals. A 4-decimal price perturbation shifts the implied volatility by at most $5\\cdot10^{-5}/\\text{vega} \\approx 3\\cdot10^{-6}$ — far less than the $5\\cdot10^{-5}$ interval that decides the 4th decimal digit, so every correct solver prints the clean value."),
    ],
    "solutions": {"python": SOL_IV_PY.strip(), "cpp": SOL_IV_CPP.strip()},
    "tests": iv_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 45,
})

print("gen_b done")
