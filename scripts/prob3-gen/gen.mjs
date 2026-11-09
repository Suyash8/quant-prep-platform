#!/usr/bin/env node
/**
 * PROB-3 content author: writes 8 coding-problem JSON files to content/problems/.
 * Verifies for every test that the Python and C++ reference solutions produce
 * byte-identical output, and hand-asserts known answers on small tests.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/z/my-project';
const OUT = path.join(ROOT, 'content', 'problems');
const TMP = path.join(ROOT, 'scripts', 'prob3-gen', 'tmp');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// ---------- block helpers ----------
const p = (md) => ({ type: 'p', md });
const h2 = (text) => ({ type: 'h2', text });
const math = (tex, caption) => ({ type: 'math', tex, ...(caption ? { caption } : {}) });
const list = (items) => ({ type: 'list', ordered: false, items });
const callout = (variant, title, md) => ({ type: 'callout', variant, title, md });
const code = (lang, c, caption) => ({ type: 'code', lang, code: c, ...(caption ? { caption } : {}) });

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

function run(cmd, args, input, what) {
  const r = spawnSync(cmd, args, { input, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${what}: exit ${r.status}\n${r.stderr}`);
  return r.stdout;
}

function compileCpp(srcFile, exeFile) {
  const r = spawnSync('g++', ['-O2', '-std=c++17', '-o', exeFile, srcFile], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`g++ failed for ${srcFile}:\n${r.stderr}`);
}

// Exact-rational check for simple-vs-compound (BigInt). Confirms the printed 2dp
// value equals the nearest-to-exact cent and that no rounding tie is nearby.
function compoundExactCheck(input, printed) {
  const [Ps, rs, ts] = input.trim().split(/\s+/);
  const Pn = BigInt(Ps);
  const rc = BigInt(Math.round(parseFloat(rs) * 100)); // hundredths of a percent
  const tt = BigInt(ts);
  const R = 10000n + rc;
  const D = 10000n ** tt; // 10000^t
  const comp = Pn * R ** tt; // compound * D
  const simp = Pn * rc * tt * (D / 10000n); // simple * D
  const diff = comp - simp;
  if (diff < 0n) throw new Error(`compound: negative diff for ${input.trim()}`);
  const scaled = diff * 100n; // value * D
  const frac = scaled % D;
  const dist = frac * 2n > D ? frac * 2n - D : D - frac * 2n; // distance to a .xx5 tie
  if (dist <= (2n * D) / 1000000n) throw new Error(`compound: test too close to a rounding tie: ${input.trim()}`);
  const cents = Number((scaled * 2n + D) / (2n * D)); // nearest rounding (unique, not a tie)
  const [whole, fracStr = ''] = printed.trim().split('.');
  const printedCents = BigInt(whole) * 100n + BigInt((fracStr + '00').slice(0, 2));
  if (BigInt(cents) !== printedCents) {
    throw new Error(`compound: exact ${cents} cents vs printed ${printedCents} cents for ${input.trim()}`);
  }
}

// ---------- reference solutions ----------
const PY_PNL = `import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    cents = 0
    i = 1
    for _ in range(n):
        side = data[i]
        q = int(data[i + 1])
        whole, frac = data[i + 2].split('.')
        price_cents = int(whole) * 100 + int(frac)
        i += 3
        if side == 'B':
            cents -= q * price_cents
        else:
            cents += q * price_cents
    sign = '-' if cents < 0 else ''
    a = abs(cents)
    sys.stdout.write(f"{sign}{a // 100}.{a % 100:02d}\\n")

main()
`;

const CPP_PNL = `#include <cstdio>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long cents = 0;
    char side[4], price[32];
    for (int i = 0; i < n; i++) {
        long long q;
        if (scanf("%s %lld %s", side, &q, price) != 3) return 0;
        long long whole = 0, frac = 0;
        int j = 0;
        for (; price[j] && price[j] != '.'; j++) whole = whole * 10 + (price[j] - '0');
        if (price[j] == '.') {
            j++;
            for (int d = 0; d < 2 && price[j]; d++, j++) frac = frac * 10 + (price[j] - '0');
        }
        long long v = q * (whole * 100 + frac);
        if (side[0] == 'B') cents -= v;
        else cents += v;
    }
    long long a = cents < 0 ? -cents : cents;
    printf("%s%lld.%02lld\\n", cents < 0 ? "-" : "", a / 100, a % 100);
    return 0;
}
`;

const PY_KADANE = `import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    a = [int(x) for x in data[1:1 + n]]
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    print(best)

main()
`;

const CPP_KADANE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    long long best = a[0], cur = a[0];
    for (int i = 1; i < n; i++) {
        cur = max(a[i], cur + a[i]);
        best = max(best, cur);
    }
    printf("%lld\\n", best);
    return 0;
}
`;

const PY_TWOSUM = `import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    target = int(data[1])
    a = [int(x) for x in data[2:2 + n]]
    seen = {}
    count = 0
    for x in a:
        count += seen.get(target - x, 0)
        seen[x] = seen.get(x, 0) + 1
    print(count)

main()
`;

const CPP_TWOSUM = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    unordered_map<long long, long long> seen;
    seen.reserve(2 * (size_t)n);
    long long count = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        auto it = seen.find(target - x);
        if (it != seen.end()) count += it->second;
        ++seen[x];
    }
    printf("%lld\\n", count);
    return 0;
}
`;

const PY_MAVG = `import sys

def fmt(s, k):
    t = (200 * s + k) // (2 * k)  # round-half-up of s/k to hundredths
    return f"{t // 100}.{t % 100:02d}"

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    k = int(data[1])
    a = [int(x) for x in data[2:2 + n]]
    s = sum(a[:k])
    out = [fmt(s, k)]
    for i in range(k, n):
        s += a[i] - a[i - k]
        out.append(fmt(s, k))
    sys.stdout.write("\\n".join(out) + "\\n")

main()
`;

const CPP_MAVG = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    auto emit = [&](long long s) {
        long long t = (200 * s + k) / (2 * k); // round-half-up of s/k to hundredths
        printf("%lld.%02lld\\n", t / 100, t % 100);
    };
    emit(s);
    for (int i = k; i < n; i++) {
        s += a[i] - a[i - k];
        emit(s);
    }
    return 0;
}
`;

const PY_BSEARCH = `import sys
from bisect import bisect_left

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    a = [int(x) for x in data[1:1 + n]]
    m = int(data[1 + n])
    out = []
    for j in range(m):
        q = int(data[2 + n + j])
        i = bisect_left(a, q)
        out.append(str(i if i < n else -1))
    sys.stdout.write("\\n".join(out) + "\\n")

main()
`;

const CPP_BSEARCH = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    int m;
    if (scanf("%d", &m) != 1) return 0;
    for (int i = 0; i < m; i++) {
        long long q;
        scanf("%lld", &q);
        int idx = int(lower_bound(a.begin(), a.end(), q) - a.begin());
        if (idx == n) printf("-1\\n");
        else printf("%d\\n", idx);
    }
    return 0;
}
`;

const PY_DICE = `import sys
from math import gcd

def main():
    n = int(sys.stdin.buffer.read().decode().split()[0])
    p, q = 7 * n, 2
    g = gcd(p, q)
    p //= g
    q //= g
    print(p if q == 1 else f"{p}/{q}")

main()
`;

const CPP_DICE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long p = 7 * n, q = 2;
    long long g = __gcd(p, q);
    p /= g;
    q /= g;
    if (q == 1) printf("%lld\\n", p);
    else printf("%lld/%lld\\n", p, q);
    return 0;
}
`;

const PY_COMPOUND = `import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    P = float(data[0])
    r = float(data[1])
    t = int(data[2])
    factor = 1.0 + r / 100.0
    compound = P
    for _ in range(t):          # repeated multiplication, exactly t times
        compound = compound * factor
    simple = P * (r / 100.0) * t
    diff = compound - simple
    if diff < 0:
        diff = -diff
    print(f"{diff:.2f}")

main()
`;

const CPP_COMPOUND = `#include <cstdio>

int main() {
    double P, r;
    long long t;
    if (scanf("%lf %lf %lld", &P, &r, &t) != 3) return 0;
    double factor = 1.0 + r / 100.0;
    double compound = P;
    for (long long i = 0; i < t; i++) compound = compound * factor; // repeated multiplication
    double simple = P * (r / 100.0) * (double)t;
    double diff = compound - simple;
    if (diff < 0) diff = -diff;
    printf("%.2f\\n", diff);
    return 0;
}
`;

const PY_COIN = `import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    coins = [int(x) for x in data[1:1 + n]]
    amount = int(data[1 + n])
    INF = amount + 1
    dp = [INF] * (amount + 1)
    dp[0] = 0
    for c in coins:
        if c < 1 or c > amount:
            continue
        for x in range(c, amount + 1):
            if dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    print(dp[amount] if dp[amount] <= amount else -1)

main()
`;

const CPP_COIN = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    vector<int> coins(n);
    for (auto &c : coins) scanf("%d", &c);
    int amount;
    scanf("%d", &amount);
    const int INF = amount + 1;
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int c : coins) {
        if (c < 1 || c > amount) continue;
        for (int x = c; x <= amount; x++)
            if (dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
    }
    printf("%d\\n", dp[amount] <= amount ? dp[amount] : -1);
    return 0;
}
`;

// ---------- problem specs ----------
const problems = [];

// 1. pnl-calc --------------------------------------------------------------
{
  const stressLines = [];
  for (let i = 0; i < 20000; i++) stressLines.push(i % 2 === 0 ? 'B 3 12.34' : 'S 3 12.35');
  problems.push({
    slug: 'pnl-calc',
    title: 'Round-Trip PnL from a Trade Blotter',
    difficulty: 'easy',
    category: 'arrays-strings',
    tags: ['simulation', 'fixed-point-arithmetic', 'parsing'],
    estMinutes: 15,
    statement: [
      p("A trading desk hands you a one-day blotter for a **single instrument**: $N$ fills, each tagged `B` (buy) or `S` (sell) with a quantity and an execution price carrying exactly two decimal places. The trader opens the day flat, never goes short, and closes flat — every unit bought is eventually sold — so the day's realized PnL is simply total sale proceeds minus total purchase cost:"),
      math('\\text{PnL} = \\sum_{\\text{sell fills}} q \\cdot p \\; - \\; \\sum_{\\text{buy fills}} q \\cdot p'),
      p("The catch is **money arithmetic**. A price like `10.10` is not represented exactly in binary floating point, and summing tens of thousands of products as floats can drift the final cent. The pattern used by real back-office systems is to convert each price to **integer cents** once, accumulate everything in integers, and only format a decimal string at the very end."),
      callout('quant', 'Cents, not floats', "As a double, `0.01` is really 0.01000000000000000020816… — harmless for one trade, dangerous when compounded over a whole blotter. Integer cents make money arithmetic exact and language-independent."),
      p("Print the total PnL in dollars with exactly two decimals, with a leading minus sign for a losing day."),
    ],
    inputFormat: "Line 1: integer $N$ — the number of fills.\nLines 2 to $N+1$: `B q p` or `S q p` — side, integer quantity $q$, price $p$ with **exactly two decimal digits**.",
    outputFormat: "One line: the day's total PnL with exactly two decimal places (for example `12.00`, `-29.00` or `0.00`).",
    constraints: [
      "1 <= N <= 100000",
      "1 <= q <= 10000",
      "0.01 <= p <= 1000.00, always written with exactly two decimal digits",
      "The running position never goes negative and ends at exactly 0",
      "Total money movement fits in a signed 64-bit integer",
    ],
    examples: [
      "Buys cost 10 x 100.50 + 5 x 101.25 = 1511.25; sells fetch 12 x 102.00 + 3 x 99.75 = 1523.25; PnL = 1523.25 - 1511.25 = 12.00.",
      "Buys cost 5 x 50.00 + 5 x 60.00 = 550.00; sells fetch 10 x 52.10 = 521.00; PnL = 521.00 - 550.00 = -29.00.",
    ],
    hints: [
      "Convert each price to integer cents by parsing the string: `w.dd` becomes `w * 100 + dd`.",
      "Keep one signed integer accumulator in cents; subtract buys, add sells.",
      "Format from the integer at the end: dollars = abs(cents) // 100, remainder = abs(cents) % 100 zero-padded to two digits.",
    ],
    editorial: [
      h2('Approach'),
      p("Because the trader starts flat, never goes short, and ends flat, every bought unit is sold exactly once. Cash-wise each `B q p` line pays out $q \\cdot p$ and each `S q p` line takes in $q \\cdot p$, so the net cash change over the day — the realized PnL — is the signed sum of the fill values."),
      math('\\text{PnL} = \\sum_{\\text{sells}} q \\cdot p \\; - \\; \\sum_{\\text{buys}} q \\cdot p'),
      p("Parse each price as the decimal string it is: `w.dd` maps to integer cents `w * 100 + dd`. Multiply by quantity, accumulate into one signed 64-bit counter, and convert to a `dollars.cents` string only when printing. With the given limits the accumulator's magnitude stays near $10^{14}$ cents — far inside 64-bit range."),
      callout('pitfall', 'Two classic bugs', "Accumulating `qty * price` as doubles can be off by a cent after many fills; and rounding a float at print time can turn a `x.xx5` value into the wrong cent. Doing everything in integer cents kills both bugs at once."),
      p("**Complexity.** $O(N)$ time, $O(1)$ extra memory."),
    ],
    py: PY_PNL,
    cpp: CPP_PNL,
    tests: [
      { input: '4\nB 10 100.50\nB 5 101.25\nS 12 102.00\nS 3 99.75\n', verify: '12.00\n' },
      { input: '3\nB 5 50.00\nB 5 60.00\nS 10 52.10\n', verify: '-29.00\n' },
      { input: '2\nB 1 1.00\nS 1 1.00\n', verify: '0.00\n' },
      { input: '6\nB 2 10.00\nS 1 11.00\nB 1 9.50\nS 2 10.20\nB 3 10.00\nS 3 9.90\n', verify: '1.60\n' },
      { input: '5\nB 10 55.55\nB 10 55.55\nB 10 55.55\nS 20 50.00\nS 10 45.00\n', verify: '-216.50\n' },
      { input: '6\nB 10000 1000.00\nS 10000 1001.00\nB 10000 999.99\nS 10000 999.98\nB 1 0.01\nS 1 0.01\n', verify: '9900.00\n' },
      { input: '4\nB 1 0.01\nS 1 0.01\nB 12345 7.89\nS 12345 7.90\n', verify: '123.45\n' },
      { input: `20000\n${stressLines.join('\n')}\n`, verify: '300.00\n' },
    ],
  });
}

// 2. max-subarray-sum ------------------------------------------------------
{
  const rnd = lcg(20240603);
  const stressVals = [];
  for (let i = 0; i < 100000; i++) stressVals.push(String(Math.floor(rnd() * 2e9 + 1) - 1e9));
  problems.push({
    slug: 'max-subarray-sum',
    title: 'Best Streak of a P&L Series',
    difficulty: 'easy',
    category: 'arrays-strings',
    tags: ['kadane', 'dynamic-programming', 'one-pass'],
    estMinutes: 15,
    statement: [
      p("A strategy produced a daily P&L series $a_1, \\dots, a_n$ (negative entries are losing days). Risk asks for the **best contiguous streak**: the non-empty consecutive window whose summed P&L is largest. A losing day in the middle can still belong to the best streak — contiguity matters, reordering does not."),
      math('\\max_{1 \\le l \\le r \\le n} \\; \\sum_{i=l}^{r} a_i'),
      p("This is the classic **maximum subarray** problem. Kadane's algorithm scans once, keeping the best sum of a window that *ends* at the current element: either extend the previous window by one day or restart fresh at today's P&L — whichever is bigger."),
      code('python', 'cur = a[0]\nbest = a[0]\nfor x in a[1:]:\n    cur = max(x, cur + x)   # extend the streak, or restart at x\n    best = max(best, cur)', 'Kadane in three lines'),
      callout('pitfall', 'All-negative series', "Initializing `best = 0` silently answers 0 for a series that loses money every day. The best streak must be non-empty, so for an all-negative series the true answer is the single least-bad day — a negative number."),
    ],
    inputFormat: "Line 1: integer $n$.\nLine 2: $n$ integers $a_1 \\dots a_n$.",
    outputFormat: "One line: the maximum subarray sum — a single integer, possibly negative.",
    constraints: [
      "1 <= n <= 100000",
      "-10^9 <= a_i <= 10^9",
      "The answer fits in a signed 64-bit integer",
    ],
    examples: [
      "The window [4, -1, 2, 1] sums to 6 — the largest achievable contiguous sum.",
      "Every entry is negative, so the best streak is the single least-bad day, -3.",
    ],
    hints: [
      "Define `cur` = best sum of a window ending at the current index; update with `cur = max(x, cur + x)`.",
      "Initialize both `best` and `cur` with `a[0]`, not with 0.",
      "One pass, O(n) time, O(1) memory — no prefix sums or divide-and-conquer needed.",
    ],
    editorial: [
      h2('Approach — Kadane'),
      p("Let $cur_i$ be the maximum sum of a subarray that **ends** at index $i$. Either the window is just $\\{a_i\\}$, or it extends the best window ending at $i-1$:"),
      math('cur_i = \\max\\bigl(a_i,\\; cur_{i-1} + a_i\\bigr), \\qquad \\text{answer} = \\max_i cur_i'),
      p("If $cur_{i-1} < 0$ it can only drag the streak down, so restarting is optimal; otherwise extending is at least as good. The recurrence is evaluated in a single scan and the answer is the running maximum over all $cur_i$."),
      p("**Why correct:** by induction $cur_i$ is exactly the best suffix-sum at $i$, and every subarray ends somewhere, so the maximum over $cur_i$ covers all candidates."),
      p("**Complexity.** $O(n)$ time, $O(1)$ extra space. Watch the accumulation bound: with $|a_i| \\le 10^9$ and $n \\le 10^5$, sums reach $10^{14}$ — use 64-bit integers in C++."),
    ],
    py: PY_KADANE,
    cpp: CPP_KADANE,
    tests: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4\n', verify: '6\n' },
      { input: '3\n-8 -3 -6\n', verify: '-3\n' },
      { input: '1\n5\n', verify: '5\n' },
      { input: '1\n-7\n', verify: '-7\n' },
      { input: '10\n1 2 3 4 5 6 7 8 9 10\n', verify: '55\n' },
      { input: '6\n0 0 3 -3 0 0\n', verify: '3\n' },
      { input: '3\n1000000000 -1000000000 1000000000\n', verify: '1000000000\n' },
      { input: '5\n-1 5 -2 5 -1\n', verify: '8\n' },
      { input: `100000\n${stressVals.join(' ')}\n` },
    ],
  });
}

// 3. two-sum-count ---------------------------------------------------------
{
  problems.push({
    slug: 'two-sum-count',
    title: 'Order Pairs Summing to a Block Size',
    difficulty: 'easy',
    category: 'hashing',
    tags: ['hash-map', 'counting', 'duplicates'],
    estMinutes: 18,
    statement: [
      p("An execution algorithm reviews a day's child-order sizes $a_1, \\dots, a_n$ and counts how many **unordered pairs of distinct orders** had sizes summing to exactly the target block size $T$. Pairs are counted by position: two orders of equal size still form a valid pair, and each index pair $(i, j)$ with $i < j$ counts once."),
      math('\\#\\{(i,j) \\;:\\; i < j, \\; a_i + a_j = T\\}'),
      p("With $n$ up to $10^5$, the $O(n^2)$ double loop is too slow at the top end. A single pass with a hash map of *previously seen* values answers each element in $O(1)$ expected time: when you encounter $x$, every earlier occurrence of $T - x$ forms exactly one pair with it."),
      callout('info', 'Count before you insert', "Adding `seen[T - x]` **before** inserting `x` guarantees $i < j$ (an element never pairs with itself) and counts each unordered pair exactly once — duplicates and the $a_i = T/2$ case fall out automatically."),
    ],
    inputFormat: "Line 1: integers $n$ and $T$.\nLine 2: $n$ integers $a_1 \\dots a_n$.",
    outputFormat: "One line: the number of qualifying pairs. It can exceed the 32-bit range — use a 64-bit type in C++.",
    constraints: [
      "1 <= n <= 100000",
      "-10^9 <= a_i <= 10^9",
      "-10^9 <= T <= 10^9",
      "The answer fits in a signed 64-bit integer",
    ],
    examples: [
      "Pairs (1, 5) and (2, 4) sum to 6 — two pairs.",
      "All six 2s pair with each other: C(6, 2) = 15 index pairs.",
    ],
    hints: [
      "Stream through the array; for each x add the number of previously seen values equal to T - x.",
      "Update the map after counting, so x never pairs with itself.",
      "With 100000 equal values the answer is about 5 x 10^9 — it does not fit in a 32-bit int.",
    ],
    editorial: [
      h2('Approach — one-pass hash map'),
      p("Iterate left to right maintaining a map `seen` from value to its occurrence count among $a_1, \\dots, a_{i-1}$. At index $i$ the number of new pairs ending at $i$ is exactly `seen[T - a_i]`; add it, then record $a_i$ in the map:"),
      math('\\text{answer} = \\sum_{i=1}^{n} \\;\\#\\{j < i : a_j = T - a_i\\}'),
      p("Every pair $(i, j)$ with $i < j$ is counted exactly once — at step $j$ — and no element can pair with itself because the count is read before insertion. Duplicate values, negative values, and the even-$T$ case are all handled without special-casing."),
      callout('quant', 'Counting at scale', "The same look-back hash pattern powers real-time screens such as 'how many pairs of today\'s fills net to the parent size' — it turns an $O(n^2)$ comparison into $O(n)$ expected work."),
      p("**Complexity.** $O(n)$ expected time with a hash map; $O(n)$ memory. In C++ accumulate into `long long`."),
    ],
    py: PY_TWOSUM,
    cpp: CPP_TWOSUM,
    tests: [
      { input: '5 6\n1 2 3 4 5\n', verify: '2\n' },
      { input: '6 4\n2 2 2 2 2 2\n', verify: '15\n' },
      { input: '3 100\n1 2 3\n', verify: '0\n' },
      { input: '5 0\n-1 1 2 -2 0\n', verify: '2\n' },
      { input: '8 5\n1 4 2 3 2 3 5 0\n', verify: '6\n' },
      { input: '7 -3\n-1 -2 -3 -4 0 -1 -2\n', verify: '5\n' },
      { input: '4 7\n3 4 3 4\n', verify: '4\n' },
      { input: `100000 0\n${'0 '.repeat(99999)}0\n`, verify: '4999950000\n' },
    ],
  });
}

// 4. moving-average --------------------------------------------------------
{
  const stressPrices = [];
  for (let i = 0; i < 100000; i++) stressPrices.push(String(((i * 7) % 97) + 1));
  problems.push({
    slug: 'moving-average',
    title: 'K-Day Moving Average',
    difficulty: 'easy',
    category: 'arrays-strings',
    tags: ['sliding-window', 'integer-arithmetic', 'rounding'],
    estMinutes: 18,
    statement: [
      p("A charting tool draws the $k$-day **moving average** of an integer price series $p_1, \\dots, p_n$: for every window of $k$ consecutive prices it plots the window mean. Emit all $n - k + 1$ window averages, each rounded to two decimals with the standard **round-half-up** rule — a tie like `1.125` rounds up to `1.13`."),
      p("Keep a running window sum: entering a window adds the new price and leaving subtracts the oldest, so each step costs $O(1)$ instead of re-summing $k$ values. Round **exactly**, in integer arithmetic: with window sum $s$, the value in hundredths is"),
      math('\\text{cents} = \\left\\lfloor \\frac{200\\,s + k}{2k} \\right\\rfloor = \\operatorname{round}_{\\text{half-up}}\\!\\left(\\frac{100\\,s}{k}\\right)'),
      p("Print each window as a decimal with the fractional part zero-padded to two digits."),
      callout('pitfall', 'Floating ties', "Computing `s / k` as a double and formatting it can misround tie cases: for $s = 9$, $k = 8$ the exact value is 1.125, but the nearest double is 1.1250000000000000444…, and a naive pipeline may print `1.12` or `1.13` depending on the library. The integer formula above is deterministic and library-independent."),
    ],
    inputFormat: "Line 1: integers $n$ and $k$ with $1 \\le k \\le n$.\nLine 2: $n$ integers $p_1 \\dots p_n$.",
    outputFormat: "$n - k + 1$ lines: the average of each window in order (the first window is prices $1..k$), each with exactly two decimals.",
    constraints: [
      "1 <= k <= n <= 100000",
      "0 <= p_i <= 10^6",
      "Running window sums fit in a signed 64-bit integer",
    ],
    examples: [
      "Windows (1,2,3), (2,3,4), (3,4,5) average to 2.00, 3.00 and 4.00.",
      "(10+11)/2 = 10.50 and (11+15)/2 = 13.00.",
    ],
    hints: [
      "Sliding window: initialize s = sum of the first k prices, then s += p[i] - p[i-k] as it slides.",
      "Round with integers only: t = (200*s + k) // (2*k); print t//100 and t%100 zero-padded to two digits.",
      "There are exactly n - k + 1 windows — with k = n there is a single line.",
    ],
    editorial: [
      h2('Approach — sliding window sum + exact rounding'),
      p("Maintain $s$, the sum of the current window. The first window costs $O(k)$; each subsequent update is $s \\mathrel{+}= p_i - p_{i-k}$. Every printed value is $s/k$ rounded to two decimals."),
      p("Rounding $s/k$ to hundredths with **round-half-up** is exact in integers: multiply by 200 and add $k$ (which is half of $2k$) before floor-dividing by $2k$:"),
      math('t = \\left\\lfloor \\dfrac{200s + k}{2k} \\right\\rfloor, \\qquad \\text{output} = (t \\;\\text{div}\\; 100) + \".\" + (t \\bmod 100 \\text{, zero-padded})'),
      p("Check the tie $s = 9$, $k = 8$: the numerator is $200 \\cdot 9 + 8 = 1808$ and $1808 / 16 = 113$ exactly, so $t = 113$ and the output is `1.13` — precisely the half-up rounding of $1.125$. The formula bumps up exactly when the remainder reaches the half point."),
      p("**Complexity.** $O(n)$ time, $O(1)$ extra memory beyond the input. Sums reach $10^{11}$ and the rounding numerator $2 \\times 10^{13}$ — both fit comfortably in signed 64-bit."),
    ],
    py: PY_MAVG,
    cpp: CPP_MAVG,
    tests: [
      { input: '5 3\n1 2 3 4 5\n', verify: '2.00\n3.00\n4.00\n' },
      { input: '3 2\n10 11 15\n', verify: '10.50\n13.00\n' },
      { input: '8 8\n1 1 1 1 1 1 1 2\n', verify: '1.13\n' },
      { input: '8 8\n1 1 1 1 1 1 1 4\n', verify: '1.38\n' },
      { input: '4 4\n1 2 3 4\n', verify: '2.50\n' },
      { input: '6 4\n2 4 6 8 10 12\n', verify: '5.00\n7.00\n9.00\n' },
      { input: '3 3\n1 1 2\n', verify: '1.33\n' },
      { input: '5 1\n1 2 3 4 5\n', verify: '1.00\n2.00\n3.00\n4.00\n5.00\n' },
      { input: `100000 5000\n${stressPrices.join(' ')}\n` },
    ],
  });
}

// 5. binary-search-price ---------------------------------------------------
{
  const n = 100000;
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(String(2 * i));
  const qs = [];
  for (let j = 0; j < 1000; j++) qs.push(String((j * 137) % 200001));
  problems.push({
    slug: 'binary-search-price',
    title: 'First Price at Least the Query',
    difficulty: 'easy',
    category: 'binary-search',
    tags: ['lower-bound', 'binary-search', 'order-book'],
    estMinutes: 15,
    statement: [
      p("A price ladder is quoted as a **sorted array** of $n$ prices in non-decreasing order. For each query price $q$, the router needs the **first entry at least $q$** — the cheapest rung that would still fill a buy limit at $q$ — reported as a 0-based index. If every rung is strictly below $q$, print `-1`."),
      p("This is the standard **lower bound** binary search. Maintain the half-open invariant: everything strictly left of `lo` is `< q`, everything at `hi` or beyond is `>= q`; the pointers converge on the boundary."),
      code('python', 'lo, hi = 0, n            # search within [lo, hi)\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if a[mid] >= q:\n        hi = mid         # a[mid] qualifies: answer is mid or to its left\n    else:\n        lo = mid + 1     # a[mid] too small: answer is to its right\n# lo is the first index with a[lo] >= q, or n if no rung qualifies', 'Lower-bound loop with the half-open invariant'),
      callout('info', 'The only edge case', "`lo == n` after the loop means every element is below $q$ — report `-1`. Python's `bisect_left` and C++'s `lower_bound` implement exactly this search."),
    ],
    inputFormat: "Line 1: integer $n$.\nLine 2: $n$ integers in non-decreasing order.\nLine 3: integer $m$.\nLine 4: $m$ query values $q_1 \\dots q_m$.",
    outputFormat: "$m$ lines: for each query, the 0-based index of the first element $\\ge q$, or `-1`.",
    constraints: [
      "1 <= n, m <= 200000",
      "-10^9 <= a_i, q_j <= 10^9",
      "The array is given in non-decreasing order",
    ],
    examples: [
      "First element >= 4 is a[1] = 4; >= 5 is a[3] = 7; 11 exceeds every rung so -1; 1 is below every rung so index 0; >= 10 is a[4] = 10 so index 4.",
      "A single rung 5: q = 5 hits index 0, q = 6 exceeds the ladder so -1, q = 4 lands on index 0.",
    ],
    hints: [
      "bisect_left (Python) / lower_bound (C++) return the first index with value >= q directly.",
      "If the returned index equals n, every element is smaller — print -1.",
      "Duplicated values are why this is lower bound, not upper bound: the first occurrence counts.",
    ],
    editorial: [
      h2('Approach — lower bound'),
      p("For each query we want the smallest index $i$ with $a_i \\ge q$. Binary search on the predicate $P(i) = (a_i \\ge q)$, which is monotone (false, …, false, true, …, true) because the array is sorted:"),
      math('i^* = \\min \\{ i : a_i \\ge q \\}, \\qquad \\text{output} = \\begin{cases} i^* & i^* < n \\\\ -1 & i^* = n \\end{cases}'),
      p("The half-open loop keeps the invariant *the answer lies in `[lo, hi]`*: on `a[mid] >= q` the boundary cannot be to the right of `mid`; otherwise it cannot be at `mid` or to the left. That costs $O(\\log n)$ comparisons per query and $O(1)$ memory."),
      p("**Complexity.** $O(m \\log n)$ for the queries plus $O(n)$ to read the array — easily within limits for $n, m \\le 2 \\cdot 10^5$."),
      callout('quant', 'Where this shows up', "Lower bound over a sorted price vector is the primitive behind price-level lookup in order books, yield-curve interpolation anchors, and barrier-level checks."),
    ],
    py: PY_BSEARCH,
    cpp: CPP_BSEARCH,
    tests: [
      { input: '5\n2 4 4 7 10\n5\n4 5 11 1 10\n', verify: '1\n3\n-1\n0\n4\n' },
      { input: '1\n5\n3\n5 6 4\n', verify: '0\n-1\n0\n' },
      { input: '4\n3 3 3 3\n3\n3 2 4\n', verify: '0\n0\n-1\n' },
      { input: '6\n1 3 5 7 9 11\n6\n0 1 2 8 11 12\n', verify: '0\n0\n1\n4\n5\n-1\n' },
      { input: '7\n1 2 2 2 2 2 3\n3\n2 3 1\n', verify: '1\n6\n0\n' },
      { input: '5\n-10 -5 0 5 10\n5\n-10 -7 5 10 11\n', verify: '0\n1\n3\n4\n-1\n' },
      { input: '1\n1000000000\n1\n1000000000\n', verify: '0\n' },
      { input: `${n}\n${arr.join(' ')}\n1000\n${qs.join(' ')}\n` },
    ],
  });
}

// 6. dice-expected-value ---------------------------------------------------
{
  problems.push({
    slug: 'dice-expected-value',
    title: 'Expected Sum of n Dice, Exactly',
    difficulty: 'easy',
    category: 'probability',
    tags: ['linearity-of-expectation', 'fractions', 'gcd'],
    estMinutes: 12,
    statement: [
      p("You roll $n$ independent fair six-sided dice and sum the pips. Instead of simulating, compute the **expected sum exactly** and print it as a reduced fraction."),
      math('\\mathbb{E}[X_i] = \\frac{1+2+3+4+5+6}{6} = \\frac{7}{2} \\quad\\Longrightarrow\\quad \\mathbb{E}\\!\\left[\\textstyle\\sum_{i=1}^{n} X_i\\right] = \\frac{7n}{2}'),
      p("Linearity of expectation does the work in one line — no independence needed, though it is given anyway. Reduce $\\frac{7n}{2}$ with the gcd: when $n$ is **even** the expectation is an integer and must be printed without a denominator; when $n$ is **odd** print `p/q`."),
      callout('quant', 'Fractions over floats', "On trading floors expectations are quoted as exact fractions or basis points, not decimals — `35/2` and `17.50` carry different information when you later compare or multiply them. Exact rational output also makes automated checking unambiguous."),
    ],
    inputFormat: "One line: integer $n$, the number of dice.",
    outputFormat: "One line: the expected sum as a reduced fraction `p/q` (with $\\gcd(p, q) = 1$, $q > 0$), or just `p` when the reduced denominator is 1.",
    constraints: [
      "1 <= n <= 60",
      "The expected value is 7n/2 — small integers; the difficulty is the exact output format, not overflow",
    ],
    examples: [
      "One die: E = 7/2, already reduced.",
      "Two dice: E = 7 x 2 / 2 = 7, an integer printed without a denominator.",
    ],
    hints: [
      "E = 7n/2; write it as the fraction (7n)/2 and reduce with gcd(7n, 2).",
      "If n is even the gcd is 2 and the denominator becomes 1 — print the integer alone.",
      "No floating point: the answer is a fraction, not a decimal.",
    ],
    editorial: [
      h2('Approach — linearity of expectation'),
      p("Let $X_i$ be the pips of die $i$. Each face contributes $\\frac{1+2+\\dots+6}{6} = \\frac{21}{6} = \\frac{7}{2}$, so by linearity (which needs no independence):"),
      math('\\mathbb{E}\\Bigl[\\sum X_i\\Bigr] = \\sum \\mathbb{E}[X_i] = n \\cdot \\frac{7}{2} = \\frac{7n}{2}'),
      p("Print the reduced form: compute $g = \\gcd(7n, 2)$, output $7n/g$ when $2/g = 1$, otherwise `p/q`. For even $n$, $g = 2$ and the result is the integer $7n/2$; for odd $n$ it is the fraction $7n/2$. With $n \\le 60$ the arithmetic is trivial, but going through the gcd makes the code honest for any numerator/denominator pair."),
      p("**Complexity.** $O(1)$ time and memory — a gcd on numbers of at most a few hundred."),
    ],
    py: PY_DICE,
    cpp: CPP_DICE,
    tests: [
      { input: '1\n', verify: '7/2\n' },
      { input: '2\n', verify: '7\n' },
      { input: '3\n', verify: '21/2\n' },
      { input: '4\n', verify: '14\n' },
      { input: '5\n', verify: '35/2\n' },
      { input: '6\n', verify: '21\n' },
      { input: '7\n', verify: '49/2\n' },
      { input: '10\n', verify: '35\n' },
      { input: '59\n', verify: '413/2\n' },
      { input: '60\n', verify: '210\n' },
    ],
  });
}

// 7. simple-vs-compound ----------------------------------------------------
{
  problems.push({
    slug: 'simple-vs-compound',
    title: 'Simple vs Compound Interest Gap',
    difficulty: 'easy',
    category: 'mathematics',
    tags: ['interest', 'floating-point', 'determinism'],
    estMinutes: 20,
    statement: [
      p("A deposit of principal $P$ (whole dollars) earns an annual rate of $r$ percent. Under **simple** interest the account earns $P \\cdot r/100$ each year on the original principal; under **compound** interest the rate applies to the running balance. After $t$ years the balances are"),
      math('S_{\\text{simple}} = P \\cdot \\frac{r\\,t}{100} \\qquad\\qquad S_{\\text{comp}} = P \\left(1 + \\frac{r}{100}\\right)^{t}'),
      p("Print $|S_{\\text{comp}} - S_{\\text{simple}}|$ rounded to two decimals. By Bernoulli's inequality $(1+x)^t \\ge 1 + tx$ for $x \\ge 0$, the compound balance is never behind — but the gap is a difference of two large, close numbers, so it must be computed carefully."),
      callout('warn', 'Deterministic floating point', "Compute the compound balance by **repeated multiplication**: start from `comp = P` and multiply by `(1 + r/100)` exactly `t` times, in a loop. Do not use `pow` or a logarithm identity — library exponentiation can round differently between languages, and this problem's expected output assumes the loop. The reference Python and C++ solutions use the identical operation order."),
      p("The rate $r$ carries exactly two decimals (for example `5.25`); pass it through your language's decimal-to-double parser as-is."),
    ],
    inputFormat: "One line: $P$ (integer dollars), $r$ (a decimal with exactly two digits), $t$ (integer years), separated by spaces.",
    outputFormat: "One line: the absolute gap $|S_{\\text{comp}} - S_{\\text{simple}}|$ with exactly two decimals.",
    constraints: [
      "1 <= P <= 10^6 (integer)",
      "0.01 <= r <= 15.00, written with exactly two decimal digits",
      "1 <= t <= 30",
      "The exact answer is never within 10^-4 of a .xx5 rounding tie, so any correct computation agrees on the printed cent",
    ],
    examples: [
      "Compound 1000 x 1.05^10 = 1628.8946... vs simple 1000 x 5 x 10 / 100 = 500.00; the gap is 1128.89.",
      "Compound 5000 x 1.10^3 = 6655.00 vs simple 5000 x 10 x 3 / 100 = 1500.00; the gap is 5155.00.",
    ],
    hints: [
      "Simple interest is one multiplication; compound interest is the loop comp = P; repeat t times: comp *= (1 + r/100).",
      "Take the absolute difference at the end — compound should be larger, but floating point rewards a defensive abs().",
      "Match the reference operation order exactly: factor = 1.0 + r/100.0 computed once, then multiplied t times.",
    ],
    editorial: [
      h2('Approach'),
      p("Both balances follow from the definitions. Simple interest adds the same coupon $P \\cdot r/100$ for each of $t$ years; compound interest multiplies the balance by the growth factor $(1 + r/100)$ each year:"),
      math('S_{\\text{comp}} - S_{\\text{simple}} = P\\left[\\left(1 + \\tfrac{r}{100}\\right)^{t} - 1 - \\tfrac{rt}{100}\\right] \\;\\ge\\; 0'),
      p("The gap is exactly the *interest on interest*. For the implementation, determinism matters more than cleverness: build the factor `1.0 + r/100.0` once, then multiply it into a running product $t$ times. IEEE-754 arithmetic is deterministic for a fixed operation order, so Python and C++ produce bit-identical doubles, and both correctly-rounded 2-decimal conversions print the same string."),
      callout('pitfall', 'Do not pow()', "`pow(1 + r/100, t)` may use a different internal algorithm (exp/log or repeated squaring) than the loop and can land one ulp away — enough to flip the printed cent when the true value sits near a rounding boundary. The problem guarantees test values are far from ties, so the loop's result is robust."),
      p("**Complexity.** $O(t)$ time, $O(1)$ memory."),
    ],
    py: PY_COMPOUND,
    cpp: CPP_COMPOUND,
    check: compoundExactCheck,
    tests: [
      { input: '1000 5.00 10\n', verify: '1128.89\n' },
      { input: '5000 10.00 3\n', verify: '5155.00\n' },
      { input: '1 1.00 1\n', verify: '1.00\n' },
      { input: '100 0.01 1\n', verify: '100.00\n' },
      { input: '2500 3.75 7\n' },
      { input: '1000000 15.00 30\n' },
      { input: '999999 12.34 25\n' },
      { input: '12345 7.89 12\n' },
      { input: '100000 8.50 20\n' },
      { input: '1 15.00 30\n' },
    ],
  });
}

// 8. coin-change-min -------------------------------------------------------
{
  problems.push({
    slug: 'coin-change-min',
    title: 'Minimum Coins for an Amount',
    difficulty: 'medium',
    category: 'dynamic-programming',
    tags: ['dp', 'unbounded-knapsack', 'bottom-up'],
    estMinutes: 30,
    statement: [
      p("Given $n$ coin denominations (each usable an **unlimited** number of times) and a target amount, pay exactly the amount using the **fewest coins**, or report `-1` if it is impossible."),
      p("Greedy fails in general: with coins `{1, 5, 11}` and amount `15`, grabbing the biggest coin first yields `11+1+1+1+1` — five coins — while `5+5+5` needs only three. The reliable tool is dynamic programming over amounts."),
      math('dp[x] = \\min_{c \\in \\text{coins},\\ c \\le x} \\bigl(dp[x - c] + 1\\bigr), \\qquad dp[0] = 0'),
      p("`dp[x]` is the fewest coins that make exactly $x$. Because a coin may be reused, iterating $x$ in **increasing** order (rather than the 0/1-knapsack decreasing order) is what makes reuse legal. If `dp[amount]` is never improved from its initial infinity, the amount is unpayable."),
      callout('pitfall', 'Sentinel discipline', "Initialize `dp[x]` to `amount + 1` — a value strictly larger than any attainable count — so the final check `dp[amount] <= amount` separates reachable from unreachable states. Initializing with `INT_MAX` and adding 1 overflows; and forgetting `dp[0] = 0` breaks every recurrence."),
    ],
    inputFormat: "Line 1: integer $n$, the number of denominations.\nLine 2: $n$ integers — the coin values (not necessarily distinct).\nLine 3: integer `amount`.",
    outputFormat: "One line: the minimum number of coins, or `-1` if the amount cannot be formed.",
    constraints: [
      "1 <= n <= 20",
      "1 <= coin value <= 10^4",
      "0 <= amount <= 10^4",
      "amount = 0 requires 0 coins",
    ],
    examples: [
      "11 = 5 + 5 + 1 — three coins is optimal.",
      "Only 2s are available and 3 is odd, so it is unpayable.",
    ],
    hints: [
      "Bottom-up over amounts: dp[0] = 0, and for each x try every coin c <= x: dp[x] = min(dp[x], dp[x-c] + 1).",
      "Iterate x upward, not downward — upward allows the same coin to be used repeatedly.",
      "Impossible means dp[amount] was never updated from its infinity sentinel; print -1, never the sentinel.",
    ],
    editorial: [
      h2('Approach — unbounded coin change, bottom-up'),
      p("Define $dp[x]$ = minimum coins summing to exactly $x$, with $dp[0] = 0$ and $dp[x] = \\infty$ initially. Each state looks one coin back: if the last coin used was $c$, the remaining amount $x - c$ must itself be formed optimally:"),
      math('dp[x] = \\min_{c \\le x} \\; dp[x - c] + 1'),
      p("Filling $x$ in increasing order is essential: it lets $dp[x - c]$ already include further copies of $c$, which is exactly the *unbounded* (reuse allowed) knapsack. A coin larger than the amount is simply skipped. Duplicate denominations are harmless — the second pass finds no improvement."),
      p("**Why not greedy:** for non-canonical coin systems biggest-first is not optimal (see the `{1, 5, 11}`, amount 15 example in the statement); DP tries every last-coin choice, so it is correct by construction."),
      p("**Complexity.** $O(n \\cdot \\text{amount})$ time — here at most $20 \\times 10^4 = 2 \\cdot 10^5$ state-coin pairs — and $O(\\text{amount})$ memory."),
    ],
    py: PY_COIN,
    cpp: CPP_COIN,
    tests: [
      { input: '3\n1 2 5\n11\n', verify: '3\n' },
      { input: '1\n2\n3\n', verify: '-1\n' },
      { input: '1\n1\n0\n', verify: '0\n' },
      { input: '3\n1 3 4\n6\n', verify: '2\n' },
      { input: '3\n2 5 10\n27\n', verify: '4\n' },
      { input: '4\n186 419 83 408\n6249\n', verify: '20\n' },
      { input: '3\n5 5 5\n13\n', verify: '-1\n' },
      { input: '7\n1 2 5 10 20 50 100\n10000\n', verify: '100\n' },
      { input: '2\n7 14\n21\n', verify: '2\n' },
      { input: '2\n3 7\n11\n', verify: '-1\n' },
    ],
  });
}

// ---------- build, verify, write ----------
let allOk = true;
for (const spec of problems) {
  const pyFile = path.join(TMP, `${spec.slug}.py`);
  const cppFile = path.join(TMP, `${spec.slug}.cpp`);
  fs.writeFileSync(pyFile, spec.py);
  fs.writeFileSync(cppFile, spec.cpp);
  compileCpp(cppFile, path.join(TMP, `${spec.slug}.bin`));

  const tests = spec.tests.map((t, i) => {
    const outPy = run('python3', [pyFile], t.input, `${spec.slug} test#${i} python`);
    const outCpp = run(path.join(TMP, `${spec.slug}.bin`), [], t.input, `${spec.slug} test#${i} cpp`);
    if (outPy !== outCpp) {
      allOk = false;
      throw new Error(`${spec.slug} test#${i}: python/cpp mismatch\npy=${JSON.stringify(outPy)}\ncpp=${JSON.stringify(outCpp)}`);
    }
    if (/\r|[ \t]+\n/.test(outPy)) {
      allOk = false;
      throw new Error(`${spec.slug} test#${i}: output has CR or trailing spaces`);
    }
    if (t.verify !== undefined && outPy !== t.verify) {
      allOk = false;
      throw new Error(`${spec.slug} test#${i}: expected ${JSON.stringify(t.verify)} got ${JSON.stringify(outPy)}`);
    }
    if (spec.check) spec.check(t.input, outPy);
    return { input: t.input, expected: outPy, hidden: i >= 2 };
  });

  const examples = spec.examples.map((explanation, i) => ({
    input: tests[i].input,
    output: tests[i].expected,
    explanation,
  }));

  const doc = {
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    category: spec.category,
    tags: spec.tags,
    statement: spec.statement,
    inputFormat: spec.inputFormat,
    outputFormat: spec.outputFormat,
    constraints: spec.constraints,
    examples,
    hints: spec.hints,
    editorial: spec.editorial,
    solutions: { python: spec.py, cpp: spec.cpp },
    tests,
    timeLimitMs: 4000,
    memoryLimitMb: 256,
    estMinutes: spec.estMinutes,
  };
  const file = path.join(OUT, `${spec.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.log(`OK ${spec.slug}: ${tests.length} tests verified (python == cpp${spec.check ? ', exact-rational check' : ''})`);
}
if (!allOk) process.exit(1);
console.log(`\nWrote ${problems.length} problem files to ${OUT}`);
