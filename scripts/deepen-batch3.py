#!/usr/bin/env python3
"""Batch 3: deepen 10 lessons (portfolio, numpy, algorithms, microstructure)."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, 'content', 'lessons')

def load(fname):
    for mod in os.listdir(LDIR):
        p = os.path.join(LDIR, mod, fname)
        if os.path.exists(p):
            return p, json.load(open(p))
    raise FileNotFoundError(fname)

def save(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def insert_after_last(blocks, new_blocks, types=('code', 'math')):
    idx = None
    for i, b in enumerate(blocks):
        if b.get('type') in types:
            idx = i
    if idx is None:
        idx = min(3, len(blocks) - 1)
    blocks[idx+1:idx+1] = new_blocks

B = lambda md: {"type": "p", "md": md}
STEPS = lambda title, items: {"type": "steps", "title": title, "items": items}
CALLOUT = lambda v, t, md: {"type": "callout", "variant": v, "title": t, "md": md}
TABLE = lambda h, rows: {"type": "table", "headers": h, "rows": rows}
CODE = lambda lang, code, cap=None: {"type": "code", "lang": lang, "code": code, **({"caption": cap} if cap else {})}

# ---------- 1. pf-performance-ratios ----------
path, d = load('pf-performance-ratios.json')
insert_after_last(d['blocks'], [
    B("Each ratio in this lesson is a single idea — *reward per unit of a specific pain* — and the specific pain is what distinguishes them. Sharpe divides by total volatility: it penalises upside and downside alike. Sortino divides by downside only, which is what investors actually dislike. The information ratio divides by *active* risk and answers a different question entirely: not \"is this portfolio good?\" but \"is this manager good at deviating from the benchmark?\""),
    STEPS("All three ratios, one 8-day sample (hypothetical daily returns)", [
        "Strategy daily returns: $[2.0, 1.5, -1.0, 2.4, 0.8, -0.6, 1.8, 1.1]\\%$; benchmark: $[1.2, 1.0, 0.4, 1.4, 0.6, 0.2, 1.3, 0.9]\\%$.",
        "Mean $= 1.00\\%$/day, standard deviation $= 1.22\\%$. Sharpe (rf = 0, annualised by $\\sqrt{252}$): $\\frac{1.00}{1.22}\\sqrt{252} \\approx 13.0$ — the annualisation makes daily numbers look spectacular, which is exactly why you must check the horizon before comparing any two Sharpes.",
        "Only two days were negative ($-1.0, -0.6$): downside deviation $= \\sqrt{(1.0^2 + 0.6^2)/8} = 0.41\\%$. Sortino $= \\frac{1.00}{0.41}\\sqrt{252} \\approx 38.5$. The Sortino > Sharpe gap widens as returns skew positive — a rough skewness indicator you get for free.",
        "Active returns (strategy − benchmark) average $0.12\\%$/day with tracking error $0.82\\%$: information ratio $= \\frac{0.12}{0.82}\\sqrt{252} \\approx 2.42$. An IR above 1 sustained over years is elite; most active managers live near 0.5.",
        "Sanity note: 8 observations make every number here a coin flip. The arithmetic is the lesson, not the values.",
    ]),
    TABLE(["Ratio", "Numerator", "Denominator (the pain)", "Question it answers"], [
        ["Sharpe", "excess return", "total volatility", "compensation for all risk taken"],
        ["Sortino", "excess return", "downside deviation", "compensation for bad volatility only"],
        ["Information", "active return", "tracking error", "skill per unit of benchmark deviation"],
        ["Calmar", "total return", "max drawdown", "recovery pain ratio (annual)"],
    ]),
    CALLOUT("pitfall", "The denominator can be gamed", "Sharpe rises if you add assets with positively-skewed, rare-crash payoffs (short vol, carry): the volatility denominator barely sees the tail. This is why \"high Sharpe\" strategies blow up — the ratio measured the visible pain, not the real pain. Sortino, Calmar and stress tests exist to look where Sharpe cannot."),
])
save(path, d); print('  ✓ pf-performance-ratios')

# ---------- 2. spy-numpy ----------
path, d = load('spy-numpy.json')
insert_after_last(d['blocks'], [
    B("NumPy's whole value proposition is one sentence: **move the loop into C**. A Python `for` loop pays interpreter overhead on every iteration; a NumPy operation describes the whole array operation once and runs a compiled kernel over the data. The practical consequences — vectorise, avoid per-element Python, watch temporary allocations — all fall out of that one design fact."),
    STEPS("Broadcasting, worked until it is obvious", [
        "The `(3, 4)` array below is prices for 3 instruments over 4 days. Subtracting a `(4,)` row vector works: NumPy *stretches* the 1-D array across all 3 rows — that is broadcasting.",
        "Rule, in full: compare shapes **right to left**; dimensions are compatible when equal, or when one of them is 1 (which stretches). `(3,4)` minus `(4,)` → align right: 4 vs 4 ✓, missing dimension treated as 1 → stretch.",
        "The classic failure: `(3,4)` minus a `(3,)` *column* of per-instrument means. Right-align: 4 vs 3 ✗ — error. Fix by reshaping to `(3,1)`: right-align 4 vs 1 → stretch, 3 vs 3 ✓.",
        "This one reshape (`means[:, None]` or `means.reshape(-1, 1)`) is the single most common NumPy move in quantitative code: centre a panel of returns by instrument.",
    ]),
    CODE("python", "import numpy as np\n\nprices = np.array([\n    [100.0, 100.5, 101.2, 100.8],   # instrument A\n    [50.20, 50.30, 50.10, 50.25],   # instrument B\n    [200.0, 199.5, 200.4, 201.0],   # instrument C\n])\n\n# row-wise operations via broadcasting: (3,4) / (4,) -> OK\nday_ret = prices[1:] / prices[:-1] - 1.0\n\n# per-instrument mean, centred: needs the (3,1) reshape\nmeans = prices.mean(axis=1)                # shape (3,)\ncentred = prices - means[:, None]          # (3,4) - (3,1) -> (3,4)\n\nprint(day_ret.shape, centred.shape)        # (2,4) (3,4)\nprint(np.abs(day_ret).max())               # worst single-day move"),
    B("Two habits worth forming early. **Think in shapes first**: before writing any NumPy expression, write down the shape of every operand — most bugs are shape bugs, and the fix is usually a `.T`, a `[:, None]` or an `axis=` argument. **Watch temporaries**: `a * b + c` allocates a temporary for `a * b`; in a tight loop over big arrays, `np.multiply(a, b, out=buf)` avoids the allocation and can matter in production paths."),
    CALLOUT("info", "dtypes are part of the contract", "A NumPy array is homogeneous: one dtype for everything. Integer division surprises (`np.array([1,2])/2` gives floats), integer overflow is silent in fixed-width ints, and mixing float32 and float64 upcasts silently. Quant work: default to float64 for research; choose float32 only when memory or bandwidth forces it — the numerical-stability lesson shows exactly what that costs."),
])
save(path, d); print('  ✓ spy-numpy')

# ---------- 3. spy-numpy-linalg ----------
path, d = load('spy-numpy-linalg.json')
insert_after_last(d['blocks'], [
    B("The bridge from \"knowing linear algebra\" to \"using it\" is small but decisive: real problems hand you data, not matrices. A covariance matrix from returns, a design matrix from factors, a system from an arbitrage relationship — and the linalg routines are the same three operations every time: solve, decompose, project."),
    CODE("python", "import numpy as np\n\n# 4 assets, 6 daily returns (hypothetical)\nrets = np.array([\n    [ 0.020,  0.015, -0.010,  0.024],\n    [ 0.008, -0.006,  0.018,  0.011],\n    [ 0.012,  0.010,  0.004,  0.014],\n    [-0.004,  0.006, -0.008,  0.002],\n    [ 0.016,  0.012,  0.010,  0.018],\n    [ 0.010,  0.008,  0.002,  0.012],\n])\n\nC = np.cov(rets, rowvar=False)      # 4x4 covariance (columns are assets)\neigvals = np.linalg.eigvalsh(C)     # Hermitian solver: sorted ascending\nprint('eigenvalues:', np.round(eigvals, 8))\nprint('smallest eig (-> conditioning):', eigvals[0])\nprint('PD?', eigvals[0] > 0)\n\n# smallest eigenvalue vs largest = condition indicator\nprint('conditioning:', eigvals[-1] / max(eigvals[0], 1e-18))\n\n# solve C w = 1 for equal-risk weights, then normalise\nones = np.ones(4)\nw = np.linalg.solve(C, ones)\nw /= w.sum()\nprint('equal-risk weights:', np.round(w, 4))"),
    B("Read the output like a practitioner. The eigenvalues of a covariance matrix are the variances along the principal axes; the *smallest* one is the early-warning channel — near zero means some portfolio of the assets has almost no variance, i.e. the assets are nearly linearly dependent (often a duplicated or synthetic instrument sneaking into the panel). `eigvalsh` is the right call for symmetric matrices: faster and numerically better behaved than the general `eigvals`. And `solve` (LU with pivoting) is both faster and more accurate than inverting: `inv(C) @ ones` computes a full inverse you do not need."),
    CALLOUT("pitfall", "np.random knows the difference", "Sampling multivariate normals with `np.random.multivariate_normal(mean, C)` requires C to be positive semi-definite; a C estimated from fewer observations than assets is almost surely not (its rank is capped by the sample count). Fix by shrinking toward a diagonal or factor-structuring the matrix — do not reach for `np.linalg.pinv` as a silent patch; it will happily return a matrix that hides the rank deficiency instead of exposing it."),
])
save(path, d); print('  ✓ spy-numpy-linalg')

# ---------- 4. calc2-improper-probability ----------
path, d = load('calc2-improper-probability.json')
insert_after_last(d['blocks'], [
    B("An improper integral is the moment calculus stops being bookkeeping and starts making promises: the area under a curve over an *infinite* interval exists only if the tail decays fast enough. Probability leans on this constantly — every density must integrate to exactly 1 over $(-\\infty, \\infty)$, and every expectation, variance and tail probability is an improper integral wearing a statistics costume."),
    STEPS("Does the tail pay its way? Three integrals, three verdicts", [
        "$\\int_1^\\infty \\frac{1}{x^2}\\,dx = \\left[-\\frac{1}{x}\\right]_1^\\infty = 0 - (-1) = 1$. Converges. Power $p > 1$ always does — the tail area is finite.",
        "$\\int_1^\\infty \\frac{1}{x}\\,dx = \\left[\\ln x\\right]_1^\\infty = \\infty$. Diverges, *logarithmically slowly*. This is the trap: numerically, partial sums grow so slowly that a finite experiment will convince you it converges. It does not.",
        "$\\int_1^\\infty \\frac{1}{x^{p}}\\,dx$ converges iff $p > 1$; $\\int_0^1 \\frac{1}{x^{p}}\\,dx$ converges iff $p < 1$. Same function family, opposite verdicts at opposite ends — the infinite side and the singular side test different behaviour.",
    ]),
    B("Now the probability connection, with the exponential distribution as the honest example. Density $f(t) = \\lambda e^{-\\lambda t}$ for $t \\ge 0$: check normalisation — $\\int_0^\\infty \\lambda e^{-\\lambda t} dt = [-e^{-\\lambda t}]_0^\\infty = 1$ ✓. Mean: $\\int_0^\\infty t \\lambda e^{-\\lambda t} dt = 1/\\lambda$. Both are improper integrals, both converge because the exponential decays faster than any power — which is precisely why exponential tails make models tractable and power-law tails (Pareto, some return distributions) make risk models treacherous: moments of order $\\ge$ the tail index simply do not exist."),
    CALLOUT("quant", "Fat tails = divergent integrals in disguise", "When a risk manager says \"variance is infinite under a power law with index 3\", the precise statement is: $\\int x^2 f(x)\\,dx$ diverges. Sample variance from finite data still prints a number — it is estimating something that does not exist, and it under-estimates tail risk by construction. This is the mathematical heart of why 2008-style events keep \"surprising\" models built on thin-tailed assumptions."),
])
save(path, d); print('  ✓ calc2-improper-probability')

# ---------- 5. alg-shortest-paths-mst ----------
path, d = load('alg-shortest-paths-mst.json')
insert_after_last(d['blocks'], [
    B("Dijkstra's algorithm is greedy, and the reason the greed is *safe* is the heart of the lesson: when you pop the closest unfinalised vertex, no shorter path to it can exist, because any alternative would have to pass through an already-popped (closer) vertex first. Negative weights break exactly this argument — an unprocessed edge could still lower a cost — which is why Bellman-Ford exists: it trades Dijkstra's urgency for the willingness to re-relax edges, at $O(VE)$ instead of $O((V+E)\\log V)$."),
    STEPS("Dijkstra, traced by hand on a settlement-network graph", [
        "Edges: A→B (4), A→C (2), C→B (1), B→D (5), C→D (8). Start at A; distances $d = \\{A:0, B:\\infty, C:\\infty, D:\\infty\\}$.",
        "Pop A (0). Relax its edges: $d(B) = \\min(\\infty, 4) = 4$, $d(C) = 2$. Frontier: C(2), B(4).",
        "Pop C (2) — smallest tentative. Relax: $d(B) = \\min(4, 2+1) = 3$ (improved via C!), $d(D) = 2+8 = 10$. Frontier: B(3), D(10).",
        "Pop B (3). Relax: $d(D) = \\min(10, 3+5) = 8$. Frontier: D(8).",
        "Pop D (8). Done: $d = \\{A:0, B:3, C:2, D:8\\}$. The interesting step was 3→4: the greedy pop of C *before* B is what let the cheaper A→C→B route win. Note D's path uses B, not the direct C→D edge.",
    ]),
    TABLE(["Algorithm", "Handles negatives", "Complexity", "Finds", "Classic use"], [
        ["Dijkstra + heap", "no", "$O((V+E)\\log V)$", "single-source shortest paths", "network routing, latency maps"],
        ["Bellman-Ford", "yes (detects cycles)", "$O(VE)$", "single-source + negative-cycle flag", "arb constraints, currency graphs"],
        ["Floyd-Warshall", "yes (no neg cycles)", "$O(V^3)$", "all pairs", "small dense graphs"],
        ["Kruskal (MST)", "n/a (undirected)", "$O(E\\log E)$", "minimum spanning tree", "cheap connectivity"],
    ]),
    B("Kruskal's MST builds a tree by greedily taking the cheapest edge that connects two *different* components — union-find does the bookkeeping — and the same safety argument style applies: an edge between already-connected components would create a cycle, and some edge on that cycle is at least as expensive. MSTs show up in quant infrastructure exactly where cost matters and distance does not: cheapest network to connect venues, clustering correlations, or building a sparse approximation of a dense market graph."),
])
save(path, d); print('  ✓ alg-shortest-paths-mst')

# ---------- 6. mic-order-books ----------
path, d = load('mic-order-books.json')
insert_after_last(d['blocks'], [
    B("An order book is a data structure before it is a market concept: two sorted price levels (bids descending, asks ascending), each holding a queue of quantities. Every interesting market-microstructure quantity — spread, depth, imbalance, mid — is a one-liner over that structure, and every interesting microstructure *behaviour* is about how the book updates when information arrives."),
    STEPS("Reading a book, level by level", [
        "Asks (sell side, ascending): $100.02 \\times 900$, $100.03 \\times 1500$, $100.05 \\times 700$. Bids (buy side, descending): $99.98 \\times 1200$, $99.97 \\times 800$, $99.96 \\times 2500$.",
        "**Mid** $= (100.02 + 99.98)/2 = 100.00$. **Spread** $= 100.02 - 99.98 = 0.04$ = 4 cents = 4bp of notional. The mid is an estimate; the spread is a fact.",
        "**Depth within 5 cents of mid**: bid side $1200 + 800 + 2500 = 4500$; ask side $900 + 1500 = 2400$ (the 100.05 level is 3 cents away — include per your definition; here 100.05 is 5 cents from mid so counts only under the looser definition). Depth is what size actually costs, and the two sides differ.",
        "**Imbalance** $= \\frac{4500 - 2400}{4500 + 2400} \\approx +0.30$: 30% more resting buy interest. A classic (noisy, gameable) short-horizon signal.",
        "Now a 300-lot market sell arrives: it eats 300 of the 1200 at $99.98$ (book thins at the touch, spread unchanged). A 1500-lot market sell would eat all of $99.98$ and 300 of $99.97$ — the touch *moves* to $99.97$, and the new spread widens to 5 cents. Size and spread are linked through depth.",
    ]),
    CALLOUT("quant", "The book is an equilibrium, not a wall", "Naive intuition says big depth = support. But limit orders are free to cancel: the displayed book is a standing offer to *maybe* trade, withdrawn the moment it becomes toxic. Depth you can actually trade through is always smaller than depth you can see — which is the whole motivation for market-impact models and for execution algos that spread size over time."),
])
save(path, d); print('  ✓ mic-order-books')

# ---------- 7. ds-arrays-lists ----------
path, d = load('ds-arrays-lists.json')
insert_after_last(d['blocks'], [
    B("Arrays and linked lists are the first real engineering trade-off in the data-structures course: **contiguity vs flexibility**. An array buys you $O(1)$ random access and cache-friendly traversal because elements live side by side in memory; it pays with expensive middle insertion and a fixed capacity. A linked list buys $O(1)$ insertion/removal anywhere you already hold a pointer; it pays with no random access, per-node allocation overhead, and terrible cache behaviour because every hop chases a pointer somewhere new in memory."),
    TABLE(["Operation", "Dynamic array", "Linked list", "Who wins"], [
        ["Access i-th element", "$O(1)$", "$O(n)$", "array, decisively"],
        ["Insert/remove at end", "amortised $O(1)$", "$O(1)$", "tie"],
        ["Insert/remove at front", "$O(n)$", "$O(1)$", "list"],
        ["Insert in middle (pointer held)", "$O(n)$ shift", "$O(1)$ relink", "list"],
        ["Memory overhead", "growth slack ~2x", "pointer per node", "array"],
        ["Traversal speed (real hardware)", "sequential, prefetches", "pointer-chasing, cache misses", "array, often 10x+"],
    ]),
    B("The bottom row deserves emphasis because Big-O cannot see it. A modern CPU takes ~4 cycles to serve an L1 hit and ~200+ cycles for a main-memory miss. Traversing an array of 1M doubles streams sequentially — the prefetcher has the next cache line before you ask. Traversing 1M linked nodes touches scattered memory: each node is a potential miss, so the *constant factor* swamps the complexity. This is why `std::vector` beats `std::list` in C++ benchmarks even for workloads lists theoretically win, and it is why market-data and backtesting code stores ticks in flat arrays (often with an arena/pool for any dynamic pieces)."),
    STEPS("Amortised growth, worked: why push_back is O(1) amortised", [
        "A dynamic array of capacity 4 doubles when full: 4 → 8 → 16 → 32. Pushing 32 elements triggers 3 reallocations (at sizes 4, 8, 16), copying $4+8+16 = 28$ elements total.",
        "Total work for 32 pushes = 32 cheap writes + 28 copies = 60 operations ≈ 2 per push — *regardless of n*. Doubling makes the copies a geometric series that sums to O(n) over n pushes, hence O(1) amortised.",
        "Why doubling and not +1 growth? Growing by a constant adds $1+2+3+\\cdots+n = O(n^2)$ total copies — 1000 pushes cost ~500k copies. The growth factor is the difference between a usable and an unusable container. (Shrink policy matters too: halving on half-empty *without hysteresis* makes an insert/delete pattern at the boundary oscillate between O(n) copies.)",
    ]),
])
save(path, d); print('  ✓ ds-arrays-lists')

# ---------- 8. pf-mean-variance-capm ----------
path, d = load('pf-mean-variance-capm.json')
insert_after_last(d['blocks'], [
    B("Mean-variance optimisation and CAPM are two claims about the same formula. Markowitz: for *any* weights, portfolio variance is $w^\\top \\Sigma w$, and diversification is the free lunch hidden in the cross terms. CAPM: *if* everyone optimises this way with homogeneous beliefs, the market portfolio is the tangency portfolio and every asset's expected excess return must satisfy $E[R_i] - r_f = \\beta_i (E[R_m] - r_f)$. One is an engineering recipe; the other is an equilibrium theorem. Confusing them is how people demand too much of beta."),
    STEPS("The diversification arithmetic, worked", [
        "Two assets: $\\sigma_A = 20\\%$, $\\sigma_B = 10\\%$, correlation $\\rho = 0.3$. Weights 60/40.",
        "Variance: $(0.6 \\times 0.20)^2 + (0.4 \\times 0.10)^2 + 2(0.6)(0.4)(0.3)(0.20)(0.10) = 0.0144 + 0.0016 + 0.00288 = 0.01888$.",
        "$\\sigma_p = \\sqrt{0.01888} = 13.74\\%$. Compare the weighted-average risk $0.6 \\times 20 + 0.4 \\times 10 = 16\\%$ — diversification removed 2.26 points of volatility *at no cost in expected return*. That saving is entirely the covariance term.",
        "If $\\rho = 1$: $\\sigma_p = 16\\%$ exactly — no benefit. Correlation is the dial: at $\\rho = 0.3$ the blend is materially safer than its parts; at $\\rho = 1$ it is just a weighted average.",
        "Minimum-variance weight on A: $w^* = \\frac{\\sigma_B^2 - \\rho\\sigma_A\\sigma_B}{\\sigma_A^2 + \\sigma_B^2 - 2\\rho\\sigma_A\\sigma_B} = \\frac{0.01 - 0.006}{0.05 - 0.012} = 0.105$. At 10.5% in A the portfolio vol bottoms at $9.79\\%$ — below *either* asset. Note $w^*$ ignores expected returns entirely; it is a pure risk construction.",
    ]),
    STEPS("Beta, computed from data", [
        "Six periods of asset and market returns (hypothetical): asset $[3, -2, 5, 1, -1, 4]\\%$, market $[2, -3, 4, 2, -2, 3]\\%$.",
        "$\\mathrm{Cov}(R_i, R_m) = 0.00076$, $\\mathrm{Var}(R_m) = 0.00080$.",
        "$\\beta = 0.00076 / 0.00080 = 0.95$: the asset carries about 95% of the market's systematic risk. Alpha (Jensen's) then asks whether the *residual* return after $\\beta \\cdot$ market is positive — regression intercept territory.",
        "Beta is a regression coefficient, with everything that implies: it is estimated, it drifts with the regime, and it is only as good as the sample. A 6-point estimate has a confidence interval wide enough to include both \"defensive\" and \"aggressive\".",
    ]),
    CALLOUT("pitfall", "Sigma estimated from history is the weak link", "MVO is exquisitely sensitive to the covariance matrix, and sample covariances carry estimation error that the optimiser dutifully exploits — concentrating weight in whatever happened to look low-risk last quarter. This is the *error-maximisation* critique. Practical fixes: shrinkage estimators, factor-structured covariances, constraints as regularisation. The formula is exact; the inputs never are."),
])
save(path, d); print('  ✓ pf-mean-variance-capm')

# ---------- 9. mic-adverse-selection ----------
path, d = load('mic-adverse-selection.json')
insert_after_last(d['blocks'], [
    B("Adverse selection is the reason market making is a skill rather than a rebate collection scheme. The core asymmetry: the counterparty who *chooses* to trade with you is more likely to know something than the one who arrives at random. Your limit order is an option you have written to the market — free for informed flow to exercise when the price is about to move away from you. Everything in modern microstructure (spread levels, queue strategies, order-flow toxicity measures) is a response to this one mechanism."),
    STEPS("A market maker's ledger, made concrete", [
        "You quote 100.00 bid / 100.04 ask (2 cent half-spread), 500 lots a side, all day. Naive accounting: each round trip earns the 4-cent spread, times volume — a money printer.",
        "Now suppose 30% of your fills are *informed*: they hit your bid only when fair value is about to drop 20 cents. On those fills you do not earn +2 cents; you lose $20 - 2 = 18$ cents per share relative to the post-move mid.",
        "Break-even condition: uninformed fills must subsidise informed ones. If $\\pi$ = fraction informed, $s$ = half-spread, $m$ = average adverse move: $\\pi(m - s) \\le (1-\\pi)s$. With $\\pi = 0.3$, $m = 20$ cents: $0.3 \\times 18 = 5.4$ cents of loss vs $0.7 \\times 2 = 1.4$ cents of earned spread — you are losing 4 cents a share on average. **No spread that a liquid market would tolerate fixes this**; the fix is measuring and *avoiding* toxic flow.",
        "Hence the real tools: order-flow toxicity measures (VPIN-style), quote fading when toxicity spikes, skewing quotes on one-sided book pressure, and in the limit — withdrawing. The measured cost of adverse selection *is* the fee a market maker charges for providing liquidity; the quoted spread is that fee plus operating costs plus a margin for the risk of being wrong about the toxicity estimate.",
    ]),
    CALLOUT("quant", "Why this is an interview staple", "\"You are making a market and a sharp client keeps lifting your offer — what do you do?\" The expected ladder: widen or fade when the flow is one-sided → check whether the info is news-driven or flow-driven → adjust inventory skew → finally, step aside. Each rung is a quantitative judgement about *why* the counterparty is trading, which is adverse selection operationalised. Trade-classification rules (Lee-Ready and successors) exist because exchanges do not label fills \"informed\" — you infer it from who crossed the spread."),
])
save(path, d); print('  ✓ mic-adverse-selection')

# ---------- 10. alg-dynamic-programming ----------
path, d = load('alg-dynamic-programming.json')
insert_after_last(d['blocks'], [
    B("Dynamic programming is not a technique so much as a *recognition*: some problems have overlapping subproblems and optimal substructure, and when both hold, caching the subproblem answers turns exponential brute force into polynomial exactness. The skill is entirely in the recognition — spotting that a search space revisits the same states — and the discipline of writing the recurrence *before* any code."),
    STEPS("Coin change [1, 4, 5], amount 13 — the greedy trap, then the DP", [
        "Greedy (largest first): $5 + 5 + 1 + 1 + 1 = 13$ — five coins. Feels right, is wrong.",
        "Recurrence: $dp[a] = 1 + \\min_{c \\in \\{1,4,5\\}, c \\le a} dp[a - c]$, with $dp[0] = 0$. One line, and the whole problem.",
        "Fill the table left to right: $dp[1..13] = [1, 2, 3, 1, 1, 2, 3, 2, 2, 2, 3, 3, 3]$. Check a few: $dp[4] = 1$ (one 4-coin), $dp[8] = 2$ (4+4), $dp[13] = 3$.",
        "Answer: 3 coins ($4 + 4 + 5$). Greedy's five-coin answer came from committing to a 5 at step one — an irrevocable local choice that no global optimum contains. **Greedy never revisits; DP tries everything and remembers.**",
        "Complexity: $O(n \\cdot |coins|)$ time, $O(n)$ space. The same recurrence with a parent pointer table reconstructs *which* coins, not just how many.",
    ]),
    B("The second canonical example — longest increasing subsequence on $[3, 1, 4, 1, 5, 9, 2, 6]$ — shows the other DP shape. Recurrence: $L[i] = 1 + \\max_{j < i, a_j < a_i} L[j]$. Filling gives $L = [1, 1, 2, 1, 3, 4, 2, 4]$: the LIS has length 4 (e.g. $3, 4, 5, 9$ or $1, 4, 5, 6$). $O(n^2)$ as written; the $O(n \\log n)$ variant (patience sorting with binary search) is the standard interview follow-up, and LIS itself is the pattern behind diff tools and volatility-regime sequence analysis."),
    TABLE("When DP applies — the two-part test", [
        ["Property", "Meaning", "Quick check"],
        ["Optimal substructure", "optimal solution contains optimal solutions to subproblems", "can you combine two optimal sub-answers into an optimal answer?"],
        ["Overlapping subproblems", "the naive recursion revisits the same states", "draw the recursion tree: do branches repeat?"],
    ]),
    CALLOUT("quant", "Where DP lives in finance", "Optimal execution (the classic trading trajectory / liquidation problems), vega-neutral hedge rebalancing over discrete dates, and the exercise boundary of American options are all DP in the wild: a value today is a max/min over what you can do today plus the (cached) value of the state you land in. When you see \"multi-stage decision under uncertainty with a Markov state\", think Bellman equation — DP is just Bellman with the stochastic parts stripped."),
])
save(path, d); print('  ✓ alg-dynamic-programming')

print('\nBatch 3 complete.')
