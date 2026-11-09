#!/usr/bin/env python3
"""Batch 2 of problems: 6 more, with machine-verified tests."""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, 'content', 'problems')

def run_py(code, stdin):
    r = subprocess.run(['python3', '-c', code], input=stdin, capture_output=True, text=True, timeout=20)
    if r.returncode != 0:
        raise RuntimeError(f"ref failed: {r.stderr[:300]}")
    return r.stdout

def write_problem(d):
    p = os.path.join(PDIR, d['slug'] + '.json')
    with open(p, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"  ✓ {d['slug']} ({len(d['tests'])} tests)")

# ============ 1. bst-validate ============
ref = r'''
import sys
sys.setrecursionlimit(200000)
data = sys.stdin.read().split()
n = int(data[0])
idx = 1
nodes = []
for i in range(n):
    v = int(data[idx]); l = int(data[idx+1]); r = int(data[idx+2]); idx += 3
    nodes.append((v, l, r))
def valid(i, lo, hi):
    if i == -1: return True
    v, l, r = nodes[i]
    if not (lo < v < hi): return False
    return valid(l, lo, v) and valid(r, v, hi)
print("VALID" if valid(0, float("-inf"), float("inf")) else "INVALID")
'''
tests = []
cases = [
    "3\n10 1 2\n5 -1 -1\n15 -1 -1\n",          # valid
    "3\n10 1 2\n20 -1 -1\n5 -1 -1\n",          # invalid: 20 > 10 in left subtree
    "1\n7 -1 -1\n",                             # single node
    "5\n8 1 2\n3 3 4\n10 -1 -1\n1 -1 -1\n6 -1 -1\n",   # valid larger
    "5\n8 1 2\n3 3 4\n10 -1 -1\n9 -1 -1\n6 -1 -1\n",   # invalid: 9 < 10 in right subtree
    "4\n50 1 2\n30 -1 3\n70 -1 -1\n40 -1 -1\n", # valid: 30<40<50 in left, 70 right
    "4\n50 1 2\n30 -1 3\n70 -1 -1\n55 -1 -1\n", # invalid: 55 < 70 in right subtree
    "2\n10 1 -1\n10 -1 -1\n",                   # duplicate: 10 not < 10 -> invalid
    "7\n4 1 2\n2 3 4\n6 5 6\n1 -1 -1\n3 -1 -1\n5 -1 -1\n7 -1 -1\n",  # full valid
    "7\n4 1 2\n2 3 4\n6 5 6\n1 -1 -1\n3 -1 -1\n8 -1 -1\n7 -1 -1\n",  # 8 under 6's right -> 8>7? no 7 is root right... 8 > 4 ok, but check: node 6 right = 8 -> 8 < inf ok; but 8 vs parent chain 4,6: valid? 6<8<inf ok. Actually valid unless violates. This tests deep chains
    "3\n5 1 2\n5 -1 -1\n5 -1 -1\n",             # all duplicates -> invalid
    "6\n100 1 2\n50 3 4\n150 5 -1\n25 -1 -1\n75 -1 -1\n125 -1 -1\n", # valid
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "bst-validate",
    "title": "Validate a Binary Search Tree",
    "difficulty": "medium",
    "category": "trees",
    "tags": ["bst", "recursion", "bounds-propagation"],
    "statement": [
        {"type": "p", "md": "A position-keeping system stores instruments in a binary search tree for ordered lookup, and a corrupted subtree (bad insertion logic) is suspected. You are given the tree as an array of nodes — each with a value, the index of its left child and the index of its right child (−1 for none) — and must decide whether the whole structure satisfies the BST ordering property."},
        {"type": "p", "md": "The BST property: for every node, every value in its left subtree is **strictly less** than the node's value, and every value in its right subtree is **strictly greater**. The property is about entire subtrees, not just parent-child pairs."},
    ],
    "inputFormat": "First line: $n$ ($1 \\le n \\le 10^5$). Then $n$ lines, the $i$-th describing node $i$: value $v_i$ and child indices $l_i, r_i$ ($-1 \\le l_i, r_i < n$). Node 0 is the root. All indices form a single proper tree.",
    "outputFormat": "`VALID` if the tree satisfies the BST property, otherwise `INVALID`.",
    "constraints": ["$1 \\le n \\le 10^5$", "values fit in 32-bit integers", "the tree is a proper binary tree (each node has at most 2 children)", "recursion depth may reach $n$ — iterate or raise the limit"],
    "examples": [
        {"input": "3\n10 1 2\n5 -1 -1\n15 -1 -1\n", "output": "VALID\n", "explanation": "5 < 10 < 15 with correct placement."},
        {"input": "3\n10 1 2\n20 -1 -1\n5 -1 -1\n", "output": "INVALID\n", "explanation": "20 sits in the left subtree of 10, but 20 > 10 — the classic parent-only check passes, the subtree check fails."},
    ],
    "hints": ["Checking only parent vs children is not enough — a grandchild can violate an ancestor's bound.", "Propagate an interval (lo, hi) down the recursion; a node must satisfy lo < v < hi.", "Watch for duplicates: strictly less / strictly greater means equal values are invalid."],
    "editorial": [
        {"type": "p", "md": "The wrong-but-tempting solution compares each node with its immediate children. It fails on exactly the interesting case: a value that is fine against its parent but violates a grandparent's bound (20 under 10's left child). The correct method threads an open interval $(lo, hi)$ through the traversal: the root gets $(-\\infty, +\\infty)$, a left child inherits $(lo, v)$, a right child inherits $(v, hi)$. A node is valid iff $lo < v < hi$, and the intervals narrow at every level."},
        {"type": "p", "md": "Complexity: $O(n)$ time, $O(h)$ stack. Two robustness notes that the constraints reward: deep left-skewed trees overflow default Python recursion limits (hence the raised limit or an explicit stack), and the strict inequality means duplicates are rejected — mirror the specification exactly rather than 'fixing' it."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nstruct N{ long long v; int l, r; };\nvector<N> t;\nbool ok(int i, long long lo, long long hi){\n if(i==-1) return true;\n if(!(lo < t[i].v && t[i].v < hi)) return false;\n return ok(t[i].l, lo, t[i].v) && ok(t[i].r, t[i].v, hi);\n}\nint main(){int n; scanf(\"%d\",&n); t.resize(n);\n for(int i=0;i<n;i++) scanf(\"%lld %d %d\",&t[i].v,&t[i].l,&t[i].r);\n puts(ok(0, LLONG_MIN, LLONG_MAX)?\"VALID\":\"INVALID\"); return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 25,
})

# ============ 2. lru-cache ============
ref = r'''
import sys
from collections import OrderedDict
data = sys.stdin.read().split()
cap = int(data[0])
t = int(data[1])
idx = 2
cache = OrderedDict()
out = []
for _ in range(t):
    op = data[idx]; idx += 1
    if op == "PUT":
        k, v = data[idx], int(data[idx+1]); idx += 2
        if k in cache: cache.move_to_end(k)
        cache[k] = v
        if len(cache) > cap: cache.popitem(last=False)
    else:
        k = data[idx]; idx += 1
        if k in cache:
            cache.move_to_end(k)
            out.append(str(cache[k]))
        else:
            out.append("MISS")
print("\n".join(out))
'''
tests = []
cases = [
    "2 7\nPUT a 1\nPUT b 2\nGET a\nPUT c 3\nGET b\nGET c\nGET a\n",
    "1 5\nPUT x 10\nGET x\nPUT y 20\nGET x\nGET y\n",
    "3 4\nGET nope\nPUT k 1\nGET k\nGET k2\n",
    "2 8\nPUT a 1\nPUT b 2\nGET a\nPUT c 3\nPUT d 4\nGET b\nGET a\nGET d\n",
    "1 3\nPUT a 1\nPUT a 2\nGET a\n",
    "2 9\nPUT a 1\nPUT b 2\nGET b\nPUT a 9\nPUT c 3\nGET a\nGET b\nGET c\nGET d\n",
    "4 6\nPUT a 1\nPUT b 2\nPUT c 3\nPUT d 4\nGET a\nGET a\n",
    "2 10\nPUT p 5\nGET p\nPUT q 6\nGET p\nPUT r 7\nGET q\nPUT s 8\nGET r\nGET s\nGET p\n",
    "3 5\nPUT a 1\nPUT b 2\nPUT c 3\nPUT d 4\nGET b\n",
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "lru-cache",
    "title": "LRU Cache Simulation",
    "difficulty": "medium",
    "category": "systems-design",
    "tags": ["cache", "ordered-dictionary", "design"],
    "statement": [
        {"type": "p", "md": "A market-data gateway caches the last instrument definitions it served, with strict capacity: when the cache is full, the **least recently used** entry is evicted. Both reads and writes count as *use*. Simulate the cache and report the result of every read."},
        {"type": "p", "md": "Operations: `PUT k v` sets key $k$ to value $v$ (evicting the LRU key if at capacity — and note that updating an existing key is *not* an eviction); `GET k` returns the current value of $k$ or `MISS` if absent. A `GET` refreshes recency, even on a miss it changes nothing."},
    ],
    "inputFormat": "First line: capacity $c$ ($1 \\le c \\le 10^5$) and operation count $t$ ($1 \\le t \\le 10^5$). Then $t$ operations, one per line.",
    "outputFormat": "One line per `GET`: the value, or `MISS`.",
    "constraints": ["$1 \\le c, t \\le 10^5$", "keys are short strings, values are integers", "an O(1)-per-operation design exists and is expected at these bounds"],
    "examples": [{"input": "2 7\nPUT a 1\nPUT b 2\nGET a\nPUT c 3\nGET b\nGET c\nGET a\n", "output": "1\nMISS\n3\n1\n", "explanation": "GET a refreshes a; PUT c evicts b (LRU); GET b misses; GET c hits 3; GET a hits 1 (a was refreshed)."}],
    "hints": ["A hash map plus a doubly-linked list gives O(1) everything — or in Python, `collections.OrderedDict` with `move_to_end`.", "Eviction removes the *front* (oldest) end; both GET and PUT move/insert at the *back*."],
    "editorial": [
        {"type": "p", "md": "The LRU contract needs, per operation: O(1) lookup (hash map), O(1) recency update (move a node to the newest end of an ordered structure), and O(1) eviction (pop the oldest end). A doubly-linked list keyed by a hash map is the classic composition; `OrderedDict` is exactly that structure with the same guarantees."},
        {"type": "p", "md": "The two behaviours tests love: an `UPDATE` of an existing key does not evict (the key stays, refreshed), and a `GET` on a present key refreshes it — changing which key the *next* eviction removes. Both are one-line differences in a correct implementation and silent bugs in a naive one."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int c, t; scanf(\"%d %d\",&c,&t);\n list<pair<string,long long>> order;\n unordered_map<string, list<pair<string,long long>>::iterator> pos;\n char buf[64]; char op[8]; long long val;\n for(int i=0;i<t;i++){ scanf(\"%s %s\", op, buf); string k(buf);\n  if(op[0]=='P'){ scanf(\"%lld\",&val);\n   auto it=pos.find(k);\n   if(it!=pos.end()){ order.erase(it->second); order.push_back({k,val}); pos[k]=prev(order.end()); }\n   else { order.push_back({k,val}); pos[k]=prev(order.end());\n          if((int)order.size()>c){ pos.erase(order.front().first); order.pop_front(); } }\n  } else {\n   auto it=pos.find(k);\n   if(it==pos.end()) puts(\"MISS\");\n   else { auto node=it->second; long long v=node->second;\n          order.erase(node); order.push_back({k,v}); pos[k]=prev(order.end());\n          printf(\"%lld\\n\", v); }\n  }\n } return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 30,
})

# ============ 3. subset-sum-count ============
ref = r'''
import sys
data = sys.stdin.read().split()
n = int(data[0]); target = int(data[1])
vals = [int(x) for x in data[2:2+n]]
dp = [0]*(target+1)
dp[0] = 1
for v in vals:
    for s in range(target, v-1, -1):
        dp[s] += dp[s-v]
print(dp[target] % 1000000007)
'''
tests = []
cases = [
    "4 10\n1 2 3 7\n", "3 5\n1 1 1\n", "10 100\n1 2 3 4 5 6 7 8 9 10\n",
    "5 0\n4 2 7 1 9\n", "4 11\n2 4 6 8\n", "6 12\n1 2 3 4 5 6\n",
    "8 20\n1 2 3 4 5 6 7 8\n", "3 3\n3 3 3\n",
    "15 15\n1 1 1 1 1 1 1 1 1 1 1 1 1 1 1\n", "5 1\n1 2 3 4 5\n",
    "10 55\n1 2 3 4 5 6 7 8 9 10\n",
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "subset-sum-count",
    "title": "Count Subsets by Sum",
    "difficulty": "medium",
    "category": "dynamic-programming",
    "tags": ["dp", "knapsack", "counting"],
    "statement": [
        {"type": "p", "md": "A risk engine counts the number of ways to pick a subset of trades whose notional sums to exactly a target — the combinatorial core of exposure bucketing. Given $n$ values and a target, count subsets (including possibly the empty one) whose elements sum to the target, modulo $10^9+7$."},
    ],
    "inputFormat": "First line: $n$ and $target$ ($1 \\le n \\le 200$, $0 \\le target \\le 20{,}000$). Second line: $n$ positive integers $a_i$ ($1 \\le a_i \\le target$).",
    "outputFormat": "The number of subsets summing to $target$, modulo $10^9 + 7$.",
    "constraints": ["$1 \\le n \\le 200$", "$0 \\le target \\le 20000$", "each $1 \\le a_i \\le target$"],
    "examples": [
        {"input": "4 10\n1 2 3 7\n", "output": "2\n", "explanation": "{3,7} and {1,2,7}."},
        {"input": "3 5\n1 1 1\n", "output": "0\n", "explanation": "Impossible with three ones."},
    ],
    "hints": ["dp[s] = number of subsets seen so far with sum s; process items one at a time.", "Iterate sums DOWNWARD so each item is used at most once (0/1 knapsack direction)."],
    "editorial": [
        {"type": "p", "md": "Classic 0/1 knapsack counting. State: after processing the first $i$ items, $dp[s]$ = number of subsets with sum $s$. Transition per item $v$: $dp[s] += dp[s-v]$, iterated for $s$ from $target$ down to $v$ — downward so the $dp[s-v]$ being read is from the *previous* item's row (each item used once). The answer is $dp[target] \\bmod 10^9+7$."},
        {"type": "p", "md": "The modulus is there because counts grow exponentially (200 ones summing to 200 has $\\binom{200}{200}$-style magnitude). The empty subset is naturally counted by $dp[0]=1$: with target 0 the answer is 1, which the test set checks. Complexity $O(n \\cdot target)$ = 4M operations worst case."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n; long long T; scanf(\"%d %lld\",&n,&T);\n vector<long long> dp(T+1,0); dp[0]=1; const long long MOD=1000000007LL;\n for(int i=0;i<n;i++){ long long v; scanf(\"%lld\",&v);\n  for(long long s=T; s>=v; s--){ dp[s]=(dp[s]+dp[s-v])%MOD; } }\n printf(\"%lld\\n\", dp[T]); return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 25,
})

# ============ 4. run-length-encode ============
ref = r'''
import sys
s = sys.stdin.read().strip()
out = []
i = 0
while i < len(s):
    j = i
    while j < len(s) and s[j] == s[i]: j += 1
    out.append(f"{s[i]}{j-i}")
    i = j
print(" ".join(out))
'''
tests = []
cases = [
    "aaabbbccza\n", "abc\n", "aaaaa\n", "a\n",
    "aabb\n", "zzzzzzzzzz\n", "ababab\n",
    "aaabbbcccddddd\n", "xyxxx\n", "qqqrr\n",
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "run-length-encode",
    "title": "Run-Length Encoding",
    "difficulty": "easy",
    "category": "arrays-strings",
    "tags": ["strings", "two-pointers", "encoding"],
    "statement": [
        {"type": "p", "md": "Tick data compresses well because prices repeat: the simplest scheme is run-length encoding, replacing each maximal run of a repeated character with the character and its count. Encode a string as `char count` pairs, space-separated."},
    ],
    "inputFormat": "A single line string $s$ of lowercase letters, $1 \\le |s| \\le 10^6$.",
    "outputFormat": "Space-separated `char count` tokens for each maximal run, in order.",
    "constraints": ["$1 \\le |s| \\le 10^6$", "lowercase letters only", "read the whole line (it may not end with a newline)"],
    "examples": [{"input": "aaabbbccza\n", "output": "a3 b3 c2 z1 a1\n", "explanation": "Runs: aaa, bbb, cc, z, a — runs are maximal, so the two a-runs stay separate."}],
    "hints": ["Two indices: i at the start of a run, j advanced while the character matches.", "A run of length 1 still emits `c1`."],
    "editorial": [
        {"type": "p", "md": "Single left-to-right scan with two pointers: `i` anchors the current run, `j` walks to the end of it, emit `(s[i], j-i)`, set `i = j`. O(n) time, O(number of runs) output. The specification details that separate correct from almost-correct: length-1 runs still print, and identical runs separated by anything else are distinct (maximality)."},
        {"type": "p", "md": "Why this problem earns its place next to Huffman and delta encoding in a quant curriculum: time-series compression is a daily reality at tick granularity (billions of messages/day), and RLE-delta hybrids (run lengths of repeated deltas) are what real tick stores approximate. The skill being drilled is exact, careful scanning — the same discipline P&L parsers need."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){ string s; getline(cin, s);\n string out; size_t i=0;\n while(i<s.size()){ size_t j=i; while(j<s.size() && s[j]==s[i]) j++;\n  if(!out.empty()) out+=' ';\n  out += s[i]; out += to_string(j-i); i=j; }\n cout<<out<<\"\\n\"; return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 10,
})

# ============ 5. matrix-rotate ============
ref = r'''
import sys
data = sys.stdin.read().split()
n = int(data[0])
g = [data[1+i*n:1+(i+1)*n] for i in range(n)]
res = [[g[n-1-j][i] for j in range(n)] for i in range(n)]
print("\n".join(" ".join(row) for row in res))
'''
tests = []
cases = [
    "3\n1 2 3\n4 5 6\n7 8 9\n", "1\n5\n", "2\na b\nc d\n",
    "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n",
    "2\n1 2\n3 4\n", "5\n1 2 3 4 5\n6 7 8 9 10\n11 12 13 14 15\n16 17 18 19 20\n21 22 23 24 25\n",
    "3\nx y z\np q r\nm n o\n", "1\n42\n", "3\n-1 -2 -3\n-4 -5 -6\n-7 -8 -9\n",
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "matrix-rotate",
    "title": "Rotate a Grid 90 Degrees",
    "difficulty": "easy",
    "category": "arrays-strings",
    "tags": ["matrices", "index-mapping"],
    "statement": [
        {"type": "p", "md": "A correlation heat-map export needs to be rotated 90° clockwise for a report layout. Rotate the $n \\times n$ grid: the top row becomes the right column, the left column becomes the top row."},
    ],
    "inputFormat": "First line: $n$ ($1 \\le n \\le 1000$). Then $n$ rows of $n$ tokens.",
    "outputFormat": "The rotated grid, $n$ rows of $n$ tokens.",
    "constraints": ["$1 \\le n \\le 1000$", "tokens are alphanumeric or integers"],
    "examples": [{"input": "3\n1 2 3\n4 5 6\n7 8 9\n", "output": "7 4 1\n8 5 2\n9 6 3\n", "explanation": "First row (1 2 3) becomes the last column; read column 1 bottom-up (7 4 1) to get the new first row."}],
    "hints": ["Derive the index map: new[i][j] = old[n-1-j][i].", "Verify with the 2x2 case by hand before coding the general n."],
    "editorial": [
        {"type": "p", "md": "The whole problem is one index relation: after a clockwise rotation, the element at old position $(r, c)$ lands at new $(c, n-1-r)$ — equivalently `new[i][j] = old[n-1-j][i]`. Derive it (don't memorise) from where the corners go: top-left (0,0) must become top-right (0, n-1)."},
        {"type": "p", "md": "The in-place variant (four-way cycle swaps, layer by layer) matters in C++ when $n$ is large and you cannot afford a second grid — a memory-habits question more than an algorithms one. In interviews, expect the follow-up: rotate counter-clockwise (reverse the relation), or rotate $k$ times (compose, don't loop)."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n; cin>>n;\n vector<vector<string>> g(n, vector<string>(n));\n for(auto&row:g) for(auto&x:row) cin>>x;\n for(int i=0;i<n;i++){ for(int j=0;j<n;j++)\n   cout<<g[n-1-j][i]<<(j+1==n?'\\n':' '); }\n return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 10,
})

# ============ 6. options-strategy-pnl ============
ref = r'''
import sys
data = sys.stdin.read().split()
t = int(data[0])
idx = 1
legs = []
for _ in range(t):
    typ, side, k, qty, prem = data[idx], data[idx+1], float(data[idx+2]), int(data[idx+3]), float(data[idx+4]); idx += 5
    legs.append((typ, side, k, qty, prem))
q = int(data[idx]); idx += 1
for _ in range(q):
    S = float(data[idx]); idx += 1
    total = 0.0
    for typ, side, k, qty, prem in legs:
        intrinsic = max(0.0, S - k) if typ == "C" else max(0.0, k - S)
        sign = 1 if side == "BUY" else -1
        total += sign * (intrinsic - prem) * qty
    print(f"{total:.2f}")
'''
tests = []
cases = [
    "2\nC BUY 100 1 3.50\nC SELL 110 1 1.20\n3\n100 105 120\n",
    "1\nP BUY 50 2 1.75\n4\n45 50 55 40\n",
    "2\nC BUY 100 1 3.50\nP BUY 100 1 3.20\n4\n90 100 110 120\n",
    "1\nC SELL 105 3 2.10\n3\n90 105 120\n",
    "3\nC BUY 90 1 11.00\nC SELL 100 1 4.00\nC SELL 110 2 1.50\n4\n85 95 105 115\n",
    "2\nP BUY 40 1 0.80\nP SELL 35 1 0.35\n3\n30 35 45\n",
    "1\nC BUY 25 10 0.25\n3\n24 25 30\n",
    "4\nC BUY 100 1 5.00\nC SELL 110 1 2.00\nP BUY 100 1 4.00\nP SELL 90 1 1.50\n4\n85 95 105 115\n",
    "2\nC BUY 50 1 2.00\nP SELL 50 1 1.00\n2\n50 60\n",
]
for c in cases:
    tests.append({"input": c, "expected": run_py(ref, c), "hidden": len(tests) > 1})
write_problem({
    "slug": "options-strategy-pnl",
    "title": "Option Strategy P&L at Expiry",
    "difficulty": "medium",
    "category": "quant-finance",
    "tags": ["options", "payoffs", "arithmetic"],
    "statement": [
        {"type": "p", "md": "An expiry report needs the P&L of multi-leg option strategies at hypothetical terminal prices. Each leg is a call (`C`) or put (`P`), bought (`BUY`) or sold (`SELL`), with strike, quantity and the premium paid/received per contract."},
        {"type": "p", "md": "At expiry with terminal price $S$: a call's intrinsic value is $\\max(0, S - K)$, a put's is $\\max(0, K - S)$. A leg's P&L is $\\pm(\\text{intrinsic} - \\text{premium}) \\times \\text{qty}$, positive for buys, negative for sells. The strategy P&L is the sum over legs."},
    ],
    "inputFormat": "First line: number of legs $t$ ($1 \\le t \\le 10$). Then $t$ lines: `TYPE SIDE K QTY PREMIUM` — TYPE is `C` or `P`, SIDE is `BUY` or `SELL`, K and PREMIUM are decimals, QTY an integer. Then a line with $q$ ($1 \\le q \\le 1000$), then $q$ terminal prices, one per line.",
    "outputFormat": "For each terminal price, the total strategy P&L, printed with exactly 2 decimal places.",
    "constraints": ["$0 < K, S \\le 10^6$", "$1 \\le \\text{QTY} \\le 1000$", "$0 \\le \\text{PREMIUM} \\le 10^5$"],
    "examples": [{"input": "2\nC BUY 100 1 3.50\nC SELL 110 1 1.20\n3\n100 105 120\n", "output": "-2.30\n2.70\n7.70\n", "explanation": "Bull call spread: at S=100 both legs expire worthless (−3.50 + 1.20 = −2.30); at S=120 the long call pays 20 (net 16.50) and the short call loses 10 (net −8.80)."}],
    "hints": ["Leg P&L: sign × (intrinsic − premium) × qty — get the sign convention right before summing.", "A spread's max profit/loss emerges from the arithmetic; verify your numbers on the 2-leg example by hand."],
    "editorial": [
        {"type": "p", "md": "Straight-line payoff arithmetic, done carefully. The evaluator: for each queried price, loop legs, compute intrinsic by option type, apply the buy/sell sign to `(intrinsic − premium) × qty`, accumulate, print to 2 decimals. There is no recursion and no data structure — the test is exactness with signs, max(0,·) boundaries (at-the-money and below for calls, above for puts) and formatting."},
        {"type": "p", "md": "Financially, this computation *is* the payoff diagram of the strategy lesson sampled at points: a bull call spread (buy low strike, sell high) caps both profit and loss; a straddle (buy call + buy put, same strike) profits from movement. When your code is right, the printed numbers trace those shapes — a built-in sanity check worth using."},
    ],
    "solutions": {"python": ref.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int t; cin>>t;\n vector<tuple<char,char,double,long long,double>> legs(t);\n for(auto&[ty,sd,k,q,p]:legs) cin>>ty>>sd>>k>>q>>p;\n int Q; cin>>Q; cout<<fixed<<setprecision(2);\n while(Q--){ double S; cin>>S; double total=0;\n  for(auto&[ty,sd,k,q,p]:legs){\n   double intr = (ty=='C') ? max(0.0, S-k) : max(0.0, k-S);\n   double sign = (sd=='B') ? 1.0 : -1.0;\n   total += sign*(intr-p)*(double)q; }\n  printf(\"%.2f\\n\", total); }\n return 0;}"},
    "tests": tests,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 25,
})

print('\n6 more problems added.')
