#!/usr/bin/env python3
"""Add 6 new practice problems, with machine-verified tests."""
import json, os, subprocess, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, 'content', 'problems')

def run_py(code, stdin):
    r = subprocess.run(['python3', '-c', code], input=stdin, capture_output=True, text=True, timeout=15)
    if r.returncode != 0:
        raise RuntimeError(f"ref failed: {r.stderr[:300]}")
    return r.stdout

def write_problem(d):
    p = os.path.join(PDIR, d['slug'] + '.json')
    with open(p, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"  ✓ {d['slug']} ({len(d['tests'])} tests)")

# ============ 1. anagram-groups ============
ref1 = r'''
import sys
from collections import defaultdict
lines = sys.stdin.read().split()
n = int(lines[0])
groups = defaultdict(list)
for w in lines[1:1+n]:
    groups[''.join(sorted(w))].append(w)
print(len(groups))
for k in sorted(groups, key=lambda k: (-len(groups[k]), groups[k][0])):
    print(' '.join(sorted(groups[k])))
'''
tests1 = []
cases1 = [
    "8\nlisten silent enlist google inlets banana google banana\n",
    "1\na\n",
    "3\nabc bca cab\n",
    "5\nxyz zyx aaa aaa xyz\n",
    "4\nstop tops pots spot\n",
    "6\nrate tare rat tar era are\n",
    "2\nab ba\n",
    "10\nqf fq qa aq qq ff qa qq fq qf\n",
    "12\ncat act tac dog god odg pig gpi igp cat act tac\n",
    "0\n\n",
]
for c in cases1:
    tests1.append({"input": c, "expected": run_py(ref1, c), "hidden": len(tests1) > 1})
write_problem({
    "slug": "anagram-groups",
    "title": "Anagram Groups",
    "difficulty": "easy",
    "category": "hashing",
    "tags": ["hashing", "strings", "sorting"],
    "statement": [
        {"type": "p", "md": "A trading system normalises instrument identifiers by treating two tickers as equivalent if one is an anagram (rearrangement) of the other — an old convention for alias detection. Given $n$ tickers, group them into anagram families."},
        {"type": "p", "md": "Two strings are anagrams if sorting their characters produces identical strings. A group is a maximal set of mutually-anagrammatic tickers."},
    ],
    "inputFormat": "The first line contains $n$ ($0 \\le n \\le 10^5$). The second line contains $n$ space-separated tickers, each 1–20 lowercase letters.",
    "outputFormat": "First line: the number of groups $g$. Then $g$ lines, each the tickers of one group in alphabetical order. Groups are printed in order of decreasing size; ties broken by the alphabetically first member.",
    "constraints": ["$1 \\le n \\le 10^5$", "total input under 2 MB", "tickers are unique as given"],
    "examples": [{"input": "8\nlisten silent enlist google inlets banana google banana\n", "output": "3\nbanana banana\nenlist inlets listen silent\ngoogle google\n", "explanation": "Three families. Duplicated tickers (banana, google) appear in their family."}],
    "hints": ["Sorting each string gives a canonical key.", "A hash map from sorted-key to list does the grouping in O(n·L log L)."],
    "editorial": [
        {"type": "p", "md": "Canonical form: sort the characters of each ticker. Two tickers are anagrams **iff** their sorted forms are equal, so the sorted form is a perfect hash key. Bucket all tickers by sorted form, then order the buckets by (size desc, first member asc) and print each bucket sorted."},
        {"type": "p", "md": "Complexity: $O(n \\cdot L \\log L)$ for keys plus $O(g \\log g + \\sum |group| \\log |group|)$ for output ordering. For 20-letter tickers this is far below the limits."},
    ],
    "solutions": {"python": ref1.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n; if(!(cin>>n)) return 0; map<string, multiset<string>> g; string w;\n for(int i=0;i<n;i++){cin>>w; string k=w; sort(k.begin(),k.end()); g[k].insert(w);}\n vector<pair<int,string>> order; for(auto&[k,s]:g) order.push_back({-(int)s.size(), *s.begin()});\n sort(order.begin(), order.end());\n cout<<g.size()<<\"\\n\";\n // need per-group lines in requested order: rebuild mapping\n map<string, vector<string>> bykey; for(auto&[k,s]:g){for(const auto&x:s) bykey[k].push_back(x);}\n for(auto&[sz,fst]:order){ string k=fst; sort(k.begin(),k.end()); auto&v=bykey[k];\n  for(size_t i=0;i<v.size();i++) cout<<v[i]<<\" \\n\"[i+1==v.size()]; }\n return 0;}"},
    "tests": tests1,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 20,
})

# ============ 2. spiral-matrix ============
ref2 = r'''
import sys
data = sys.stdin.read().split()
n, m = int(data[0]), int(data[1])
vals = data[2:2+n*m]
grid = [vals[i*m:(i+1)*m] for i in range(n)]
out = []
top, bottom, left, right = 0, n-1, 0, m-1
while top <= bottom and left <= right:
    for j in range(left, right+1): out.append(grid[top][j])
    top += 1
    for i in range(top, bottom+1): out.append(grid[i][right])
    right -= 1
    if top <= bottom:
        for j in range(right, left-1, -1): out.append(grid[bottom][j])
        bottom -= 1
    if left <= right:
        for i in range(bottom, top-1, -1): out.append(grid[i][left])
        left += 1
print(' '.join(out))
'''
tests2 = []
cases2 = ["3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n", "1 1\n7\n", "1 5\n1 2 3 4 5\n",
          "5 1\n1\n2\n3\n4\n5\n", "2 2\n1 2\n3 4\n", "4 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n",
          "2 3\n1 2 3\n4 5 6\n", "3 3\n1 2 3\n4 5 6\n7 8 9\n",
          "1 3\n9 8 7\n", "3 5\n1 2 3 4 5\n6 7 8 9 10\n11 12 13 14 15\n"]
for c in cases2:
    tests2.append({"input": c, "expected": run_py(ref2, c), "hidden": len(tests2) > 1})
write_problem({
    "slug": "spiral-matrix",
    "title": "Spiral Traversal",
    "difficulty": "easy",
    "category": "arrays-strings",
    "tags": ["arrays", "simulation", "boundary-handling"],
    "statement": [
        {"type": "p", "md": "A risk report lays out a grid of instrument codes and wants them read in spiral order: start at the top-left, go right along the top row, down the right column, left along the bottom row, up the left column, then spiral inward until every cell is visited."},
    ],
    "inputFormat": "First line: $n$ and $m$ ($1 \\le n, m \\le 500$). Then $n$ lines of $m$ tokens — the grid, row by row.",
    "outputFormat": "All $n \\times m$ tokens in spiral order on one line, space-separated.",
    "constraints": ["$1 \\le n, m \\le 500$", "tokens are alphanumeric, at most 10 chars"],
    "examples": [{"input": "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n", "output": "1 2 3 4 8 12 11 10 9 5 6 7\n", "explanation": "Right along row 1, down column 4, left along row 3, up column 1, then right along row 2."}],
    "hints": ["Maintain four boundaries: top, bottom, left, right.", "After each side, shrink the corresponding boundary and re-check the loop condition — single-row and single-column remnants are where bugs live."],
    "editorial": [
        {"type": "p", "md": "The four-boundary method: keep `top`, `bottom`, `left`, `right` indices and loop while the region is non-empty. Each pass walks one full ring (four sides) and shrinks the boundaries inward. The two inner `if` checks (after walking right-then-down and left-then-up) prevent double-visiting when a single row or column remains."},
        {"type": "p", "md": "The edge cases that break naive implementations are exactly the 1×m, n×1 and single-cell remnants — which is why the test set includes them explicitly."},
    ],
    "solutions": {"python": ref2.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n,m; cin>>n>>m;\n vector<string> g(n*m); for(auto&x:g) cin>>x;\n vector<string> out; int top=0,bottom=n-1,left=0,right=m-1;\n while(top<=bottom&&left<=right){\n  for(int j=left;j<=right;j++) out.push_back(g[top*m+j]);\n  top++;\n  for(int i=top;i<=bottom;i++) out.push_back(g[i*m+right]);\n  right--;\n  if(top<=bottom){ for(int j=right;j>=left;j--) out.push_back(g[bottom*m+j]); bottom--; }\n  if(left<=right){ for(int i=bottom;i>=top;i--) out.push_back(g[i*m+left]); left++; }\n }\n for(size_t i=0;i<out.size();i++) cout<<out[i]<<\" \\n\"[i+1==out.size()];\n return 0;}"},
    "tests": tests2,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 15,
})

# ============ 3. kelly-fraction ============
ref3 = r'''
import sys
data = sys.stdin.read().split()
t = int(data[0])
idx = 1
for _ in range(t):
    p = float(data[idx]); b = float(data[idx+1]); idx += 2
    q = 1 - p
    f = (b*p - q)/b
    print(f"{max(0.0, f):.4f}")
'''
tests3 = []
cases3 = ["3\n0.60 1.0\n0.50 2.0\n0.40 1.5\n", "1\n0.50 1.0\n", "2\n1.00 3.0\n0.00 2.0\n",
          "4\n0.55 1.0\n0.55 2.0\n0.30 4.0\n0.90 0.1\n", "1\n0.99 100.0\n",
          "5\n0.51 1.0\n0.52 1.0\n0.53 1.0\n0.54 1.0\n0.55 1.0\n",
          "3\n0.25 3.0\n0.75 0.5\n0.60 0.4\n", "1\n0.50 0.5\n",
          "6\n0.10 9.0\n0.20 4.5\n0.30 3.0\n0.40 2.25\n0.50 1.8\n0.60 1.5\n"]
for c in cases3:
    tests3.append({"input": c, "expected": run_py(ref3, c), "hidden": len(tests3) > 1})
write_problem({
    "slug": "kelly-fraction",
    "title": "Kelly Bet Size",
    "difficulty": "easy",
    "category": "probability",
    "tags": ["probability", "arithmetic", "quant-finance"],
    "statement": [
        {"type": "p", "md": "The Kelly criterion gives the fraction of bankroll to bet on a favourable wager: a bet wins $b$ dollars per dollar staked with probability $p$, and loses the stake with probability $q = 1-p$. The growth-optimal fraction is"},
        {"type": "math", "tex": "f^{*} = \\frac{bp - q}{b} = p - \\frac{q}{b}"},
        {"type": "p", "md": "When the edge is negative the formula returns a negative number; in that case the correct action is to bet nothing, so report $0$. Compute the Kelly fraction for each query."},
    ],
    "inputFormat": "First line: $t$ ($1 \\le t \\le 10^5$). Then $t$ lines with two numbers $p$ and $b$ ($0 \\le p \\le 1$, $0 < b \\le 1000$).",
    "outputFormat": "For each query, the Kelly fraction clamped below at zero, printed with exactly 4 decimal places.",
    "constraints": ["$1 \\le t \\le 10^5$", "$0 \\le p \\le 1$", "$0 < b \\le 1000$"],
    "examples": [{"input": "3\n0.60 1.0\n0.50 2.0\n0.40 1.5\n", "output": "0.2000\n0.2500\n0.0000\n", "explanation": "(0.6·1−0.4)/1 = 0.2. (0.5·2−0.5)/2 = 0.25. (0.4·1.5−0.6)/1.5 = 0 → clamped to 0."}],
    "hints": ["The clamp at zero is part of the specification, not an afterthought.", "Print with exactly four decimals — string formatting, not rounding by eye."],
    "editorial": [
        {"type": "p", "md": "Direct evaluation of $f^* = (bp - q)/b$ with a max(0, ·) clamp. The mathematical interest is in the reading: $f^*$ is the edge divided by the odds — numerator $bp - q$ is expected profit per unit staked, denominator $b$ normalises by the payoff. A 60/50 coin at even money says bet 20% of bankroll; the same coin at 2:1 says 25% — better prices raise size sublinearly, which is why practitioners bet *fractional* Kelly (half or quarter) to damp variance."},
    ],
    "solutions": {"python": ref3.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int t; scanf(\"%d\",&t);\n while(t--){ double p,b; scanf(\"%lf %lf\",&p,&b);\n  double q=1.0-p, f=(b*p-q)/b; if(f<0) f=0;\n  printf(\"%.4f\\n\", f);} return 0;}"},
    "tests": tests3,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 15,
})

# ============ 4. collision-risk ============
ref4 = r'''
import sys
data = sys.stdin.read().split()
n = int(data[0])
xs = list(map(int, data[1:1+n]))
vs = list(map(int, data[1+n:1+2*n]))
t = int(data[2*n+1])
collide = False
for i in range(n):
    for j in range(i+1, n):
        d0 = xs[j] - xs[i]
        dv = vs[i] - vs[j]
        if d0 * dv > 0:
            tau = d0 / dv
            if 0 < tau <= t:
                collide = True
print("COLLIDE" if collide else "SAFE")
'''
tests4 = []
cases4 = ["3\n0 5 10\n2 1 0\n6\n", "2\n0 10\n1 1\n100\n", "2\n0 10\n1 2\n5\n",
          "4\n0 3 6 9\n1 1 1 1\n100\n", "3\n10 0 20\n-1 1 -2\n10\n",
          "2\n0 100\n1 0\n99\n", "2\n0 100\n1 0\n100\n",
          "5\n0 2 4 6 8\n2 2 2 2 2\n5\n", "1\n7\n3\n9\n",
          "3\n0 4 8\n3 3 3\n2\n"]
for c in cases4:
    tests4.append({"input": c, "expected": run_py(ref4, c), "hidden": len(tests4) > 1})
write_problem({
    "slug": "collision-risk",
    "title": "Order Collision Risk",
    "difficulty": "medium",
    "category": "mathematics",
    "tags": ["simulation", "relative-motion", "systems-design"],
    "statement": [
        {"type": "p", "md": "A market simulation places $n$ agents on a number line; agent $i$ starts at position $x_i$ and moves with constant velocity $v_i$ (positive = rightward). The risk engine must flag whether **any two agents** ever occupy the same position at the same moment during the next $t$ time units."},
        {"type": "p", "md": "Positions are distinct at time zero. A collision is a meeting at a strictly positive time $\\tau \\le t$."},
    ],
    "inputFormat": "First line: $n$ ($1 \\le n \\le 2000$). Second line: $n$ integers $x_i$ ($|x_i| \\le 10^9$, distinct). Third line: $n$ integers $v_i$ ($|v_i| \\le 10^9$). Fourth line: $t$ ($1 \\le t \\le 10^9$).",
    "outputFormat": "`COLLIDE` if any pair meets at time $0 < \\tau \\le t$, otherwise `SAFE`.",
    "constraints": ["$1 \\le n \\le 2000$", "all arithmetic fits in double precision here", "$O(n^2)$ pair checks are intended"],
    "examples": [{"input": "3\n0 5 10\n2 1 0\n6\n", "output": "COLLIDE\n", "explanation": "Agents 1 and 2: gap 5 closes at rate 1 → meet at τ=5 ≤ 6."}],
    "hints": ["Relative motion: the gap between i and j changes at rate vi − vj.", "Meeting time τ = (xj − xi)/(vi − vj) — guard the sign and the zero-divisor before dividing.", "Exact boundary: τ = t counts as a collision; τ = 0 does not."],
    "editorial": [
        {"type": "p", "md": "Two agents meet when the initial gap $d_0 = x_j - x_i$ (for $i < j$ in index order — but any consistent orientation works) is closed by the relative speed $dv = v_i - v_j$. If $d_0 \\cdot dv > 0$ the gap is closing, and the meeting time is $\\tau = d_0 / dv$. Report a collision iff some pair has $0 < \\tau \\le t$."},
        {"type": "p", "md": "The product test $d_0 \\cdot dv > 0$ elegantly handles both orderings (faster behind slower, or the mirrored case). $O(n^2)$ at n=2000 is 2M cheap checks — no sorting needed. The sort-based $O(n \\log n)$ variant (neighbours in a sorted order can only collide by first becoming adjacent) is a nice extension but unnecessary at these bounds."},
    ],
    "solutions": {"python": ref4.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n; cin>>n;\n vector<long long> x(n), v(n);\n for(auto&a:x)cin>>a; for(auto&a:v)cin>>a;\n long long t; cin>>t;\n bool col=false;\n for(int i=0;i<n&&!col;i++)for(int j=i+1;j<n;j++){\n  double d0=(double)(x[j]-x[i]); double dv=(double)(v[i]-v[j]);\n  if(d0*dv>0){ double tau=d0/dv; if(tau>0&&tau<=(double)t){col=true;break;} }\n }\n cout<<(col?\"COLLIDE\":\"SAFE\")<<\"\\n\"; return 0;}"},
    "tests": tests4,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 25,
})

# ============ 5. bit-count-parity ============
ref5 = r'''
import sys
data = sys.stdin.read().split()
t = int(data[0])
idx = 1
for _ in range(t):
    x, y = int(data[idx]), int(data[idx+1]); idx += 2
    c = bin(x & y).count('1')
    print('EVEN' if c % 2 == 0 else 'ODD')
'''
tests5 = []
cases5 = ["4\n3 5\n7 7\n8 8\n255 255\n", "1\n0 0\n", "3\n1 1\n1 2\n2 2\n",
          "5\n1023 1\n1023 1024\n1000000 999999\n123456789 987654321\n4294967295 4294967295\n",
          "2\n6 6\n6 5\n", "6\n1 3\n2 3\n4 3\n8 3\n16 3\n32 3\n",
          "1\n1099511627775 1\n", "4\n0 7\n7 0\n5 5\n10 10\n",
          "8\n3 5\n5 3\n6 3\n12 10\n170 85\n255 0\n128 127\n1 2147483647\n"]
for c in cases5:
    tests5.append({"input": c, "expected": run_py(ref5, c), "hidden": len(tests5) > 1})
write_problem({
    "slug": "bit-count-parity",
    "title": "Bitmask Parity",
    "difficulty": "easy",
    "category": "fundamentals",
    "tags": ["bit-manipulation", "popcount"],
    "statement": [
        {"type": "p", "md": "A settlement system tags each trade with two 64-bit feature masks. A reconciliation rule flags a trade when the number of bits set in the **bitwise AND** of its two masks is odd. For each trade, report `ODD` if the AND's popcount is odd, `EVEN` otherwise."},
    ],
    "inputFormat": "First line: $t$ ($1 \\le t \\le 10^5$). Then $t$ lines with two integers $x$ and $y$ ($0 \\le x, y < 2^{63}$).",
    "outputFormat": "One line per trade: `ODD` or `EVEN`.",
    "constraints": ["values fit in unsigned 64-bit integers", "$1 \\le t \\le 10^5$"],
    "examples": [{"input": "4\n3 5\n7 7\n8 8\n255 255\n", "output": "ODD\nODD\nODD\nEVEN\n", "explanation": "3&5=1 (popcount 1, odd). 7&7=7 (3 bits, odd). 8&8=8 (1 bit, odd). 255&255=255 (8 bits, even)."}],
    "hints": ["x & y keeps a bit only where both have it.", "Popcount: Python bin(n).count('1'); C++20 __builtin_popcountll or std::popcount."],
    "editorial": [
        {"type": "p", "md": "Compute the AND, then the population count of the result. The popcount of `x & y` counts positions where both masks carry a set bit — the mathematical structure (popcount distributes over AND as a count of common bits) is what makes the rule well-defined and cheap: one AND plus one popcount per query, both single-instruction operations on modern hardware."},
        {"type": "p", "md": "This is the kind of small, precise primitive that interviewers use to check bit-fluency: no algorithm, just exactness with unsigned arithmetic and boundary values (zero, all-ones, disjoint masks)."},
    ],
    "solutions": {"python": ref5.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int t; scanf(\"%d\",&t);\n while(t--){ unsigned long long x,y; scanf(\"%llu %llu\",&x,&y);\n  int c=__builtin_popcountll(x&y);\n  puts(c%2?\"ODD\":\"EVEN\"); } return 0;}"},
    "tests": tests5,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 10,
})

# ============ 6. queue-serve ============
ref6 = r'''
import sys
from collections import deque
data = sys.stdin.read().split()
n, q = int(data[0]), int(data[1])
idx = 2
jobs = []
for i in range(n):
    pid, dur = data[idx], int(data[idx+1]); idx += 2
    jobs.append((pid, dur))
dq = deque((pid, dur) for pid, dur in jobs)
time = 0
out = []
while dq:
    pid, rem = dq.popleft()
    run = min(rem, q)
    time += run
    rem -= run
    if rem == 0:
        out.append(f"{pid} {time}")
    else:
        dq.append((pid, rem))
print('\n'.join(out))
'''
tests6 = []
cases6 = ["3 10\nA 25\nB 8\nC 12\n", "1 5\nX 3\n", "1 5\nX 5\n",
          "2 4\nA 9\nB 9\n", "4 2\nW 1\nX 2\nY 3\nZ 4\n",
          "3 1\nA 3\nB 1\nC 2\n", "5 3\nP 1\nQ 2\nR 3\nS 4\nT 5\n",
          "2 100\nA 50\nB 50\n", "1 1\nSOLO 1000000\n",
          "6 10\na 10\nb 20\nc 30\nd 5\ne 15\nf 7\n"]
for c in cases6:
    tests6.append({"input": c, "expected": run_py(ref6, c), "hidden": len(tests6) > 1})
write_problem({
    "slug": "queue-serve",
    "title": "Round-Robin Completion Times",
    "difficulty": "medium",
    "category": "systems-design",
    "tags": ["simulation", "queues", "scheduling"],
    "statement": [
        {"type": "p", "md": "A job scheduler serves $n$ jobs round-robin with quantum $q$: it takes the first job from the queue, runs it for at most $q$ time units, and if the job is not finished it goes to the **back** of the queue. New arrivals are not modelled — all jobs are queued in the given order at time zero. Report the wall-clock time at which each job completes."},
    ],
    "inputFormat": "First line: $n$ and $q$ ($1 \\le n \\le 10^5$, $1 \\le q \\le 10^9$). Then $n$ lines, each an identifier (alphanumeric) and the job's total duration $d_i$ ($1 \\le d_i \\le 10^9$).",
    "outputFormat": "For each job, in the order it **completes**, one line: identifier and completion time.",
    "constraints": ["$1 \\le n \\le 10^5$", "durations and quantum up to $10^9$ — use 64-bit totals"],
    "examples": [{"input": "3 10\nA 25\nB 8\nC 12\n", "output": "B 18\nC 40\nA 45\n", "explanation": "t=0-10 A (15 left), t=10-18 B done, t=18-28 C (2 left), t=28-38 A (5 left), t=38-40 C done, t=40-45 A done."}],
    "hints": ["A deque is the natural data structure — popleft, run, append if unfinished.", "Watch the output order: completion order, not input order."],
    "editorial": [
        {"type": "p", "md": "Straight simulation with a deque. Each pop runs `min(remaining, q)` units of virtual time; a finished job records the running clock. Total work is $\\sum \\lceil d_i/q \\rceil$ queue operations — fine for the given bounds, and the honest answer for a systems-design problem: model the scheduler exactly as specified rather than looking for a closed form (which exists but is easier to get subtly wrong when jobs share the tail of the last round)."},
        {"type": "p", "md": "The subtle requirement is the output order. Reading the example by hand before coding saves a wrong submission: B (short job) completes first at t=18 even though A started first."},
    ],
    "solutions": {"python": ref6.strip(), "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){long long n,q; cin>>n>>q;\n deque<pair<string,long long>> dq;\n for(long long i=0;i<n;i++){string p; long long d; cin>>p>>d; dq.push_back({p,d});}\n long long time=0; vector<pair<string,long long>> out;\n while(!dq.empty()){ auto[p,r]=dq.front(); dq.pop_front();\n  long long run=min(r,q); time+=run; r-=run;\n  if(r==0) out.push_back({p,time}); else dq.push_back({p,r}); }\n for(auto&[p,t]:out) cout<<p<<\" \"<<t<<\"\\n\"; return 0;}"},
    "tests": tests6,
    "timeLimitMs": 4000, "memoryLimitMb": 256, "estMinutes": 25,
})

print('\n6 problems added.')
