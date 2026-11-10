#!/usr/bin/env python3
"""Generate problems 1-4: bst-validate, portfolio-variance, longest-increasing-subsequence, course-schedule."""
import json, os

OUT = "/home/z/my-project/content/problems"
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
# 1. bst-validate
# ============================================================================

SOL_BST_PY = r'''import sys

def main():
    line = ""
    for raw in sys.stdin.read().splitlines():
        if raw.strip():
            line = raw.strip()
            break
    if line.startswith("["):
        line = line[1:]
    if line.endswith("]"):
        line = line[:-1]
    tokens = [t.strip() for t in line.split(",")] if line.strip() else []
    n = len(tokens)
    if n == 0:
        print("true")
        return
    has_val = []
    val = []
    for t in tokens:
        if t == "null":
            has_val.append(False)
            val.append(0)
        else:
            has_val.append(True)
            val.append(int(t))
    left = [-1] * n
    right = [-1] * n
    queue = [0]
    i = 1
    qi = 0
    while qi < len(queue) and i < n:
        node = queue[qi]
        qi += 1
        if i < n:
            if has_val[i]:
                left[node] = i
                queue.append(i)
            i += 1
        if i < n:
            if has_val[i]:
                right[node] = i
                queue.append(i)
            i += 1
    NEG = float("-inf")
    POS = float("inf")
    ok = True
    stack = [(0, NEG, POS)]
    while stack:
        node, lo, hi = stack.pop()
        v = val[node]
        if not (lo < v < hi):
            ok = False
            break
        if left[node] != -1:
            stack.append((left[node], lo, v))
        if right[node] != -1:
            stack.append((right[node], v, hi))
    print("true" if ok else "false")

main()
'''

SOL_BST_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    string line, s;
    while (getline(cin, s)) {
        bool nonempty = false;
        for (char c : s) if (!isspace((unsigned char)c)) { nonempty = true; break; }
        if (nonempty) { line = s; break; }
    }
    if (!line.empty()) {
        size_t a = line.find('[');
        if (a != string::npos) {
            size_t b = line.find(']');
            if (b == string::npos) b = line.size();
            line = line.substr(a + 1, b - a - 1);
        } else {
            size_t b = line.find(']');
            if (b != string::npos) line = line.substr(0, b);
        }
    }
    int n = 0;
    vector<long long> val;
    vector<char> hasVal;
    {
        string tok;
        auto flush = [&]() {
            size_t i = 0, j = tok.size();
            while (i < j && isspace((unsigned char)tok[i])) i++;
            while (j > i && isspace((unsigned char)tok[j - 1])) j--;
            string x = tok.substr(i, j - i);
            if (x.empty() || x == "null") { hasVal.push_back(0); val.push_back(0); }
            else { hasVal.push_back(1); val.push_back(stoll(x)); }
            tok.clear();
        };
        for (char c : line) { if (c == ',') flush(); else tok += c; }
        if (!tok.empty() || !line.empty()) flush();
        n = (int)val.size();
    }
    if (n == 0) { cout << "true\n"; return 0; }
    vector<int> left(n, -1), right(n, -1);
    vector<int> queue;
    queue.push_back(0);
    int i = 1;
    for (size_t qi = 0; qi < queue.size() && i < n; ) {
        int node = queue[qi++];
        if (i < n) { if (hasVal[i]) { left[node] = i; queue.push_back(i); } i++; }
        if (i < n) { if (hasVal[i]) { right[node] = i; queue.push_back(i); } i++; }
    }
    vector<tuple<int, long long, long long>> st;
    st.push_back(make_tuple(0, LLONG_MIN, LLONG_MAX));
    bool ok = true;
    while (!st.empty()) {
        int node; long long lo, hi;
        tie(node, lo, hi) = st.back(); st.pop_back();
        long long v = val[node];
        if (!(lo < v && v < hi)) { ok = false; break; }
        if (left[node] != -1) st.push_back(make_tuple(left[node], lo, v));
        if (right[node] != -1) st.push_back(make_tuple(right[node], v, hi));
    }
    cout << (ok ? "true" : "false") << "\n";
    return 0;
}
'''

# deep valid chain: [1,null,2,null,3,...,2000]
chain_tokens = ["1"]
for k in range(2, 2001):
    chain_tokens.append("null")
    chain_tokens.append(str(k))
DEEP = "[" + ",".join(chain_tokens) + "]"

bst_tests = T([
    ("[2,1,3]\n", "true\n", False),
    ("[5,1,4,null,null,3,6]\n", "false\n", False),
    ("[2,2,2]\n", "false\n", True),
    ("[2147483647]\n", "true\n", True),
    ("[]\n", "true\n", False),
    ("[3,1,5,0,2,4,6]\n", "true\n", True),
    ("[-5,-10,0]\n", "true\n", False),
    ("[32,26,47,19,null,null,56,null,27]\n", "true\n", False),
    ("[1,1]\n", "false\n", True),
    ("[10,5,15,null,null,6,20]\n", "false\n", True),
    (DEEP + "\n", "true\n", True),
])

write("bst-validate", {
    "title": "Validate BST",
    "difficulty": "easy",
    "category": "trees",
    "tags": ["binary-search-tree", "dfs", "bounds"],
    "statement": [
        p("A cached service hands you a binary tree that was serialized as a flat array. Before the search code is allowed to run binary-search-style queries against it, the tree must be re-validated: is it really a **binary search tree**? A BST here satisfies three conditions: every value in the left subtree of a node is **strictly less** than the node's value, every value in the right subtree is **strictly greater**, and *both* subtrees are themselves valid BSTs."),
        callout("warn", "The classic trap: ancestor bounds", "Checking only parent-versus-child is not enough. In the tree `[5,1,4,null,null,3,6]` the node `3` is the left child of `4`, so locally `3 < 4` looks fine — but `4` is the right child of the root `5`, so *everything* under `4` must also be greater than `5`. Every node must lie inside the interval constrained by **all** of its ancestors."),
        p("Trees arrive in the standard level-order serialization: a bracketed, comma-separated list of tokens, filled level by level (left child before right child), with `null` marking a missing child. Children of `null` nodes are simply not listed."),
        code("text", "[2,1,3]        ->   2\n                    / \\\n                   1   3\n\n[5,1,4,null,null,3,6]\n\n      5          <- 4 is the RIGHT child of 5\n     / \\            so the subtree under 4 must be > 5\n    1   4\n       / \\\n      3   6        3 breaks that: 3 < 5  ->  invalid", "Serialization examples"),
        p("An empty tree `[]` is trivially a valid BST. Print `true` or `false` — lowercase, no quotes."),
    ],
    "inputFormat": "A single line containing a bracketed, comma-separated level-order serialization of a binary tree: integer node values and the token `null` for missing children. The empty tree is `[]`.",
    "outputFormat": "Print `true` if the tree is a valid BST under the strict definition above, otherwise print `false`.",
    "constraints": [
        "0 <= number of nodes <= 10^5",
        "-2^31 <= node value <= 2^31 - 1",
        "The serialization is well-formed; the root token is never `null` when the tree is non-empty."
    ],
    "examples": [
        {"input": "[2,1,3]\n", "output": "true\n", "explanation": "1 < 2 < 3 and both subtrees are trivially valid."},
        {"input": "[5,1,4,null,null,3,6]\n", "output": "false\n", "explanation": "Node 4 is the right child of root 5, so 4's entire subtree must lie above 5. Node 3 sits under 4 and 3 < 5 — the ancestor bound is violated."},
        {"input": "[32,26,47,19,null,null,56,null,27]\n", "output": "true\n", "explanation": "27 is the right child of 19 and lives under 26, inside the root's left subtree, so it must lie in (19, 32); it does (19 < 27 < 32). Every other node is inside its ancestor interval too."},
    ],
    "hints": [
        "Carry a (lower, upper) interval down the tree: stepping into a left child only tightens the upper bound, stepping into a right child only tightens the lower bound.",
        "Use strict inequalities — under this definition a BST cannot contain duplicate values, so `[2,2,2]` is invalid.",
        "A skewed tree with many nodes will blow the recursion stack in Python; an explicit stack of (node, lo, hi) triples avoids that."
    ],
    "editorial": [
        h2("Approach: propagate ancestor bounds"),
        p("Validate top-down with intervals. The root may be anything in $(-\\infty, +\\infty)$. When validation descends into a child, the parent's value pins one side of the interval: a left child $v$ of node $u$ must satisfy $v < \\mathrm{val}(u)$, so its interval becomes $(lo, \\mathrm{val}(u))$; a right child gets $(\\mathrm{val}(u), hi)$. A node is valid iff its value lies strictly inside the interval it receives, and the check recurses into both subtrees."),
        steps("Worked check on [5,1,4,null,null,3,6]", [
            "Root 5 gets $(-\\infty, +\\infty)$ — valid.",
            "Left child 1 gets $(-\\infty, 5)$ — valid. Right child 4 gets $(5, +\\infty)$ — valid.",
            "Children of 4 inherit the interval $(5, +\\infty)$: left child 3 must be in $(5, 4)$ — an empty interval, since $5 > 4$ — so 3 fails immediately.",
            "Conclusion: `false`."
        ]),
        p("An equivalent one-liner check is that an in-order traversal produces a *strictly increasing* sequence — that characterization is valid here because duplicates are forbidden. Both views lead to an $O(n)$ algorithm with $O(h)$ memory, where $h$ is the tree height. Prefer an explicit stack (or Morris traversal) over recursion: a skewed chain of $10^5$ nodes would exceed Python's default recursion limit."),
        code("python", SOL_BST_PY.strip(), "Reference solution (Python)"),
        callout("pitfall", "Two easy ways to fail", "Using `<=` for children (breaks `[2,2,2]`), and using 32-bit sentinels for the open interval while node values reach $2^{31}-1$ — in C++ validate against `long long` limits."),
    ],
    "solutions": {"python": SOL_BST_PY.strip(), "cpp": SOL_BST_CPP.strip()},
    "tests": bst_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 15,
})

# ============================================================================
# 2. portfolio-variance
# ============================================================================

SOL_PV_PY = r'''import sys, math

def main():
    toks = sys.stdin.read().split()
    w1, w2, s1, s2, rho = (float(t) for t in toks[:5])
    t1 = w1 * w1 * s1 * s1
    t2 = w2 * w2 * s2 * s2
    w12 = 2 * w1 * w2
    t3 = w12 * rho * s1 * s2
    var = t1 + t2 + t3
    if var < 0:
        var = 0.0
    vol = math.sqrt(var)
    print("%.6f" % var)
    print("%.6f" % vol)

main()
'''

SOL_PV_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    double w1, w2, s1, s2, rho;
    if (!(cin >> w1 >> w2 >> s1 >> s2 >> rho)) return 0;
    double t1 = w1 * w1 * s1 * s1;
    double t2 = w2 * w2 * s2 * s2;
    double w12 = 2.0 * w1 * w2;
    double t3 = w12 * rho * s1 * s2;
    double var = t1 + t2 + t3;
    if (var < 0) var = 0.0;
    double vol = sqrt(var);
    printf("%.6f\n%.6f\n", var, vol);
    return 0;
}
'''

pv_tests = T([
    ("0.6 0.4 0.2 0.3 0.5\n", "0.043200\n0.207846\n", False),
    ("0.5 0.5 0.1 0.1 -1.0\n", "0.000000\n0.000000\n", False),
    ("1.0 0.0 0.2 0.5 0.3\n", "0.040000\n0.200000\n", True),
    ("0.3 0.7 0.25 0.15 0.0\n", "0.016650\n0.129035\n", True),
    ("0.4 0.6 0.1 0.2 1.0\n", "0.025600\n0.160000\n", False),
    ("1.2 -0.2 0.15 0.1 0.4\n", "0.029920\n0.172974\n", True),
    ("0.5 0.5 0.2 0.2 -0.5\n", "0.010000\n0.100000\n", True),
    ("0.5 0.5 0.01 0.01 1.0\n", "0.000100\n0.010000\n", True),
])

write("portfolio-variance", {
    "title": "Two-Asset Portfolio Variance",
    "difficulty": "medium",
    "category": "quant-finance",
    "tags": ["portfolio-theory", "volatility", "correlation"],
    "statement": [
        p("A portfolio holds two assets with portfolio weights $w_1$ and $w_2$ (weights may be negative for short positions and always satisfy $w_1 + w_2 = 1$). Each asset has an annual volatility — a standard deviation — $\\sigma_1$ and $\\sigma_2$, and the two asset returns have correlation $\\rho$. Your job is the bread-and-butter computation every risk system performs: the variance and the volatility of the portfolio return."),
        math_b(r"\sigma_p^2 \;=\; w_1^2 \sigma_1^2 \;+\; w_2^2 \sigma_2^2 \;+\; 2\,w_1 w_2 \rho\, \sigma_1 \sigma_2", "Two-asset portfolio variance"),
        math_b(r"\sigma_p \;=\; \sqrt{\sigma_p^2}", "Portfolio volatility"),
        callout("quant", "Why correlation matters", "The cross term $2 w_1 w_2 \\rho \\sigma_1 \\sigma_2$ is the diversification engine. For $\\rho < 1$ the portfolio variance is strictly less than the weighted average of asset variances with perfect correlation; at $\\rho = 1$ it degenerates to $(w_1\\sigma_1 + w_2\\sigma_2)^2$ — no diversification at all — and at $\\rho = -1$ a perfect hedge is possible and the variance can reach exactly zero."),
        p("Read the five inputs $w_1\\; w_2\\; \\sigma_1\\; \\sigma_2\\; \\rho$ from a single line, compute both quantities, and print each with **exactly six digits after the decimal point**: variance on the first line, volatility on the second. Note the inputs are *volatilities* (standard deviations), not variances — you must square them yourself."),
        callout("pitfall", "Degenerate floating-point cases", "When $\\rho = \\pm 1$ and the hedge is mathematically perfect, floating-point rounding can leave a variance that is a tiny negative number such as $-10^{-19}$. If the computed variance is negative, print `0.000000` for both lines: clamp to zero before taking the square root (a negative `sqrt` input yields NaN in C++ and an exception in Python)."),
    ],
    "inputFormat": "One line with five space-separated real numbers: `w1 w2 sigma1 sigma2 rho`, where $w_1 + w_2 = 1$, $0 \\le \\sigma_1, \\sigma_2 \\le 5$ and $-1 \\le \\rho \\le 1$.",
    "outputFormat": "Two lines: the portfolio variance, then the portfolio volatility, each formatted with exactly 6 digits after the decimal point (e.g. `0.043200`).",
    "constraints": [
        "-10 <= w1, w2 <= 10 and w1 + w2 = 1",
        "0 <= sigma1, sigma2 <= 5",
        "-1 <= rho <= 1",
        "If the computed variance is negative (only possible for rho = ±1), output 0.000000 for both lines."
    ],
    "examples": [
        {"input": "0.6 0.4 0.2 0.3 0.5\n", "output": "0.043200\n0.207846\n",
         "explanation": "$0.6^2 \\cdot 0.2^2 = 0.0144$, $0.4^2 \\cdot 0.3^2 = 0.0144$, cross term $2 \\cdot 0.6 \\cdot 0.4 \\cdot 0.5 \\cdot 0.2 \\cdot 0.3 = 0.0144$; total $0.0432$. Volatility $\\sqrt{0.0432} \\approx 0.207846$."},
        {"input": "0.4 0.6 0.1 0.2 1.0\n", "output": "0.025600\n0.160000\n",
         "explanation": "Perfectly correlated assets: the portfolio volatility must collapse to $w_1\\sigma_1 + w_2\\sigma_2 = 0.04 + 0.12 = 0.16$, and indeed $0.16^2 = 0.0256$."},
    ],
    "hints": [
        "The inputs are standard deviations; the formula needs variances. Square $\\sigma_1$ and $\\sigma_2$ before substituting.",
        "Keep the two outputs distinct: variance is the quantity *before* the square root.",
        "Guard the $\\rho = \\pm 1$ corner: clamp a negative variance to zero before `sqrt`."
    ],
    "editorial": [
        h2("Approach: direct evaluation of the two-asset formula"),
        p("There is no algorithmic difficulty here — the exercise is precision and specification discipline. Evaluate"),
        math_b(r"\sigma_p^2 = w_1^2\sigma_1^2 + w_2^2\sigma_2^2 + 2 w_1 w_2 \rho \sigma_1 \sigma_2, \qquad \sigma_p = \sqrt{\sigma_p^2}"),
        p("in IEEE double precision, clamp a numerically negative variance to zero (only reachable at $\\rho = \\pm 1$), and print both numbers with `%.6f`. At the extremes the answer has closed forms worth memorizing: for $\\rho = 1$, $\\sigma_p = w_1\\sigma_1 + w_2\\sigma_2$; for $\\rho = -1$, $\\sigma_p = |w_1\\sigma_1 - w_2\\sigma_2|$. Both reference solutions evaluate the three terms separately and sum them left to right, so Python and C++ produce bit-identical doubles and the 6-digit rounding agrees exactly."),
        code("python", SOL_PV_PY.strip(), "Reference solution (Python)"),
        p("Complexity: $O(1)$ time and space. The realistic pitfalls are reading the inputs as variances instead of volatilities, printing the two lines in the wrong order, and crashing on `sqrt` of a tiny negative number in the perfectly-hedged case."),
    ],
    "solutions": {"python": SOL_PV_PY.strip(), "cpp": SOL_PV_CPP.strip()},
    "tests": pv_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 15,
})

# ============================================================================
# 3. longest-increasing-subsequence
# ============================================================================

SOL_LIS_PY = r'''import sys
from bisect import bisect_left

def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    tails = []
    for k in range(1, n + 1):
        x = int(data[k])
        pos = bisect_left(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    print(len(tails))

main()
'''

SOL_LIS_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<long long> tails;
    for (int k = 0; k < n; k++) {
        long long x;
        scanf("%lld", &x);
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    printf("%d\n", (int)tails.size());
    return 0;
}
'''

def lis_brute(a):
    if not a:
        return 0
    dp = [1] * len(a)
    best = 1
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
        if dp[i] > best:
            best = dp[i]
    return best

assert lis_brute([10, 9, 2, 5, 3, 7, 101, 18]) == 4
assert lis_brute([0, 8, 4, 12, 2, 10, 6, 14, 1, 9]) == 4
rnd_lis = [(i * 131 % 61) - 30 for i in range(120)]
big_lis = [(i * 37 % 997) - 400 for i in range(1000)]
assert lis_brute(rnd_lis) >= 3
assert lis_brute(big_lis) >= 5

lis_tests = T([
    ("8\n10 9 2 5 3 7 101 18\n", "4\n", False),
    ("4\n7 7 7 7\n", "1\n", False),
    ("10\n0 8 4 12 2 10 6 14 1 9\n", "4\n", False),
    ("1\n42\n", "1\n", True),
    ("6\n1 2 3 4 5 6\n", "6\n", True),
    ("6\n6 5 4 3 2 1\n", "1\n", True),
    ("5\n-5 -3 -3 0 -1\n", "3\n", True),
    ("5\n2 2 3 3 4\n", "3\n", True),
    ("120\n" + " ".join(map(str, rnd_lis)) + "\n", str(lis_brute(rnd_lis)) + "\n", True),
    ("1000\n" + " ".join(map(str, big_lis)) + "\n", str(lis_brute(big_lis)) + "\n", True),
])

write("longest-increasing-subsequence", {
    "title": "Longest Increasing Subsequence",
    "difficulty": "medium",
    "category": "dynamic-programming",
    "tags": ["dp", "binary-search", "patience-sorting"],
    "statement": [
        p("Given a sequence of integers, find the length of its **longest strictly increasing subsequence** (LIS) — the longest sequence of values that can be picked by deleting any number of elements without reordering, in which every picked value is strictly greater than the previous one. Equal neighbors do not count as increasing: from `2 2 3` the longest strictly increasing subsequence has length 2."),
        p("Subsequences need not be contiguous: in `10 9 2 5 3 7 101 18` one optimal pick is `2 5 7 18` (or `2 3 7 101`, or `2 5 7 101`), giving length 4."),
        callout("info", "Scale requirement", "With $n$ up to $2 \\cdot 10^5$, the classic $O(n^2)$ DP over all pairs is too slow in the worst case. An $O(n \\log n)$ algorithm — DP state combined with binary search — is expected."),
    ],
    "inputFormat": "Line 1: the integer $n$ ($1 \\le n \\le 2 \\cdot 10^5$). Line 2: $n$ space-separated integers $a_1, \\dots, a_n$ with $|a_i| \\le 10^9$.",
    "outputFormat": "Print one integer: the length of the longest strictly increasing subsequence.",
    "constraints": [
        "1 <= n <= 2 * 10^5",
        "-10^9 <= a_i <= 10^9"
    ],
    "examples": [
        {"input": "8\n10 9 2 5 3 7 101 18\n", "output": "4\n", "explanation": "One longest strictly increasing subsequence is `2 5 7 18`."},
        {"input": "4\n7 7 7 7\n", "output": "1\n", "explanation": "Strictly increasing means equal values cannot both be picked."},
    ],
    "hints": [
        "Keep an array `tails` where `tails[k]` is the smallest possible tail value of any increasing subsequence of length k+1 seen so far. This array is always sorted.",
        "For each new value x, binary-search `tails` for the first entry >= x (bisect_left / lower_bound): that position tells you the longest subsequence x can extend.",
        "Why `bisect_left` and not `bisect_right`? An equal value must *replace* the existing tail rather than extend it — extending would overcount duplicates."
    ],
    "editorial": [
        h2("Approach: patience array + binary search"),
        p("Maintain `tails`, where `tails[k]` holds the smallest tail among all strictly increasing subsequences of length $k+1$ discovered so far. This array is invariantly strictly increasing: if some length-$k+1$ subsequence can end at value $v$, then a length-$k$ subsequence ends at a value below $v$, so slot $k$ only ever holds tails that keep the whole array sorted. For each incoming $x$:"),
        lst([
            "Find the first index `pos` with `tails[pos] >= x` (binary search, `bisect_left`).",
            "If no such index exists, $x$ extends the best subsequence overall: append $x$ — the LIS length grows by one.",
            "Otherwise, $x$ forms a subsequence of length `pos+1` ending in a smaller-or-equal tail than before: overwrite `tails[pos] = x`. The length does not change, but future values now have a better chance to extend."
        ]),
        steps("Trace of 10 9 2 5 3 7 101 18", [
            "10 -> tails = [10]",
            "9  -> replaces 10        tails = [9]",
            "2  -> replaces 9         tails = [2]",
            "5  -> append             tails = [2, 5]",
            "3  -> replaces 5         tails = [2, 3]",
            "7  -> append             tails = [2, 3, 7]",
            "101 -> append            tails = [2, 3, 7, 101]",
            "18 -> replaces 101       tails = [2, 3, 7, 18]",
            "Final length 4 — `tails` always stays sorted, so each step is one binary search."
        ]),
        p("Using `bisect_left` (not `bisect_right`) enforces **strict** increase: an $x$ equal to an existing tail replaces it instead of extending, so duplicates never inflate the length. Each of the $n$ values costs $O(\\log n)$, giving $O(n \\log n)$ time and $O(n)$ space. If you also need the subsequence itself, store per-length predecessor indices and walk back at the end."),
        code("python", SOL_LIS_PY.strip(), "Reference solution (Python)"),
        callout("pitfall", "Searching the wrong array", "`tails` is searched by value, not the input: `bisect_left(tails, x)` returns the first index whose value is $\\ge x$. Calling the binary search on the original array `a` instead of `tails` is the most common bug."),
    ],
    "solutions": {"python": SOL_LIS_PY.strip(), "cpp": SOL_LIS_CPP.strip()},
    "tests": lis_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 25,
})

# ============================================================================
# 4. course-schedule
# ============================================================================

SOL_CS_PY = r'''import sys
from collections import deque

def main():
    data = sys.stdin.buffer.read().split()
    idx = 0
    n = int(data[idx]); idx += 1
    m = int(data[idx]); idx += 1
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for _ in range(m):
        a = int(data[idx]); b = int(data[idx + 1]); idx += 2
        adj[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    seen = 0
    while q:
        u = q.popleft()
        seen += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    print("possible" if seen == n else "impossible")

main()
'''

SOL_CS_CPP = r'''#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    vector<vector<int>> adj(n);
    vector<int> indeg(n, 0);
    for (int e = 0; e < m; e++) {
        int a, b;
        scanf("%d %d", &a, &b);
        adj[b].push_back(a);
        indeg[a]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    long seen = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        seen++;
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    printf(seen == n ? "possible\n" : "impossible\n");
    return 0;
}
'''

chain_edges = "\n".join("%d %d" % (i, i - 1) for i in range(1, 1000))
cs_tests = T([
    ("3 2\n2 0\n2 1\n", "possible\n", False),
    ("2 2\n0 1\n1 0\n", "impossible\n", False),
    ("1 0\n", "possible\n", False),
    ("3 3\n0 1\n1 2\n2 0\n", "impossible\n", True),
    ("4 4\n0 1\n0 2\n2 3\n1 3\n", "possible\n", True),
    ("2 1\n0 0\n", "impossible\n", True),
    ("3 4\n2 0\n2 0\n2 1\n1 0\n", "possible\n", True),
    ("5 1\n4 0\n", "possible\n", True),
    ("1000 999\n" + chain_edges + "\n", "possible\n", True),
    ("1000 1000\n" + chain_edges + "\n0 999\n", "impossible\n", True),
])

write("course-schedule", {
    "title": "Course Schedule (Topological Sort)",
    "difficulty": "medium",
    "category": "graphs",
    "tags": ["topological-sort", "kahn-algorithm", "cycle-detection", "bfs"],
    "statement": [
        p("You are given $n$ courses numbered `0` to `n-1` and a list of prerequisites: to take course `a` you must first have taken course `b`. Can all courses be taken in some order? This is exactly the question of whether the prerequisite digraph is **acyclic** — a valid ordering exists if and only if the graph has a topological order, which fails precisely when a cycle of prerequisites exists."),
        p("Model each prerequisite pair `a b` as a directed edge $b \\to a$ (after finishing $b$ you become eligible for $a$). Report whether all $n$ courses can be finished."),
        callout("info", "Kahn's algorithm in one breath", "Repeatedly take any course with no unfinished prerequisites (in-degree 0), 'complete' it, and decrement the in-degree of every course that depends on it. If every course eventually gets completed, the graph is acyclic; if the process stalls with courses left over, those leftovers are blocked by a cycle."),
    ],
    "inputFormat": "Line 1: `n m` — the number of courses and the number of prerequisite pairs. Each of the next $m$ lines contains two integers `a b` ($0 \\le a, b < n$) meaning course `a` requires course `b` to be taken first. Duplicate pairs may appear; a course may list itself as a prerequisite (which is instantly a cycle).",
    "outputFormat": "Print `possible` if all courses can be ordered, otherwise `impossible`.",
    "constraints": [
        "1 <= n <= 10^5",
        "0 <= m <= 2 * 10^5",
        "0 <= a, b < n for every prerequisite pair"
    ],
    "examples": [
        {"input": "3 2\n2 0\n2 1\n", "output": "possible\n", "explanation": "Take 0, then 1, then 2 (edges 0->2 and 1->2 form no cycle)."},
        {"input": "2 2\n0 1\n1 0\n", "output": "impossible\n", "explanation": "0 requires 1 and 1 requires 0 — a 2-cycle, so no valid order exists."},
    ],
    "hints": [
        "Build edges b -> a: the in-degree of course a counts the prerequisites it is still waiting on.",
        "Start with every vertex of in-degree 0 in a queue; pop u, increment a processed counter, and for each neighbor v decrement indeg[v], enqueueing v when it hits 0.",
        "Answer `possible` iff the processed counter reaches n."
    ],
    "editorial": [
        h2("Approach: Kahn's algorithm (BFS topological sort)"),
        p("Build the digraph with edges $b \\to a$ for each pair `a b` and compute the in-degree of every vertex. Push all in-degree-0 vertices into a queue. Each popped vertex $u$ is appended to the (conceptual) topological order; for every edge $u \\to v$, decrement `indeg[v]`, and when it reaches zero, $v$ has no remaining prerequisites and joins the queue. The graph is acyclic **iff** the number of processed vertices equals $n$ — a cycle's members never reach in-degree 0 because they keep each other waiting."),
        steps("Why the counter detects cycles", [
            "A vertex enters the queue only when all of its predecessors have been processed.",
            "If a cycle exists, none of its members can ever have all predecessors processed, so they are never enqueued.",
            "Hence `processed < n` exactly when a cycle exists — no separate DFS color-based cycle check is needed."
        ]),
        p("Complexity: $O(n + m)$ time and space — every vertex and edge is touched a constant number of times. Duplicate prerequisite pairs are harmless: the second copy just decrements an in-degree that was incremented once more at build time. A self-loop `a a` gives vertex $a$ an in-degree of 1 from itself, which can never be removed, so it correctly yields `impossible`."),
        code("python", SOL_CS_PY.strip(), "Reference solution (Python)"),
        callout("pitfall", "Wrong edge direction", "The pair `a b` means 'a needs b', so the edge points from $b$ to $a$. Reversing it silently answers a different problem — the in-degree of a course must count the prerequisites it is *waiting on*."),
    ],
    "solutions": {"python": SOL_CS_PY.strip(), "cpp": SOL_CS_CPP.strip()},
    "tests": cs_tests,
    "timeLimitMs": 4000,
    "memoryLimitMb": 256,
    "estMinutes": 20,
})

print("gen_a done")
