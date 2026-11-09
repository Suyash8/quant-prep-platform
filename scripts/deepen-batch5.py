#!/usr/bin/env python3
"""Batch 5: deepen 10 lessons (trading systems, python interop, cpp, db)."""
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

# ---------- 1. tsmd-matching-strategy ----------
path, d = load('tsmd-matching-strategy.json')
insert_after_last(d['blocks'], [
    B("A strategy wrapped around a matching engine is a set of promises about *when you are willing to be wrong*. Every design in this space — reactive, market-making, predictive — is a different allocation of that willingness. The matching layer itself is deterministic; all the intelligence (and all the risk) lives in what you do between order book updates and the orders you emit. This lesson connects those decisions to the engine mechanics you already know: queue position, price priority, and the fact that your order, once resting, is an option written to everyone else."),
    TABLE(["Strategy pattern", "Why the engine allows it", "Where the profit comes from", "Dominant risk"], [
        ["Reactive (take liquidity)", "immediacy is always available at the touch", "capturing predicted short-horizon moves", "paying spread + impact when wrong"],
        ["Market making (provide)", "resting orders earn the spread when filled", "spread capture over many round trips", "adverse selection + inventory drift"],
        ["Predictive (position-taking)", "engine is indifferent to your reasons", "forecast edge held to horizon", "model error at portfolio scale"],
        ["Arbitrage (cross-venue)", "two engines, one economic instrument", "price differences net of costs", "leg risk: one side fills, the other doesn't"],
    ]),
    STEPS("Why each pattern is the way it is (engineering reasons, not taste)", [
        "**Reactive** strategies live and die on tick-to-trade latency because the alpha decays in microseconds-to-seconds. The engine's price priority means *someone* is first — latency decides who.",
        "**Market making** profits from the spread but only if fills are balanced; the engine's time priority means your resting order only gets filled when the market comes to you — which is precisely when the market may know more (adverse selection). Queue position and quote-skew management are the craft.",
        "**Arbitrage** is where matching-engine determinism pays the bills: both legs are simple, and the strategy is a race — the first to detect the dislocation and get both orders in wins, everyone else holds a naked leg. The unmatched-leg state machine is the critical engineering.",
        "Note what is common: every pattern must specify behaviour for the states *cancelled*, *partially filled*, and *rejected* — the engine will produce all three, and a strategy that only handles FILLED is a strategy that will hold phantom inventory.",
    ]),
    CALLOUT("pitfall", "The backtest illusion of queue priority", "Backtests routinely assume your resting order fills whenever price trades through your level. In reality, hundreds of orders rest ahead of you, and fills at your price often go to someone else. Simulating queue position honestly (fill only when traded volume exceeds the queue ahead of you) routinely turns a 'profitable' maker strategy into a breakeven one. This is the single most common gap between maker backtests and live results."),
])
save(path, d); print('  ✓ tsmd-matching-strategy')

# ---------- 2. py-cpp-interop ----------
path, d = load('py-cpp-interop.json')
insert_after_last(d['blocks'], [
    B("The two-language stack is not an admission of weakness on either side — it is a deliberate division of labour. Python is where research lives: flexible, readable, immediate. C++ is where production lives: fast, deterministic, type-checked at compile time. The interop layer is where a quant shop's architecture is really decided, because whatever crosses the boundary pays a *crossing cost* — nanoseconds to microseconds per call, plus the cognitive cost of maintaining two type systems and two build systems."),
    TABLE(["Binding", "Call overhead (order of magnitude)", "Build complexity", "When it wins"], [
        ["ctypes (C ABI)", "~1 µs", "low (extern \"C\", no wrappers)", "one-off calls to a compiled kernel"],
        ["pybind11 (C++ → Python)", "~0.3–1 µs", "moderate (headers + CMake)", "rich C++ APIs with STL types"],
        ["Cython (Python-like → C)", "~0.1–0.3 µs", "moderate (.pyx + setup)", "hot numeric kernels in Python syntax"],
        ["NumPy array buffers", "per-transfer, not per-call", "part of the above", "the answer to almost everything: batch, don't call"],
    ]),
    CODE("cpp", "// pricer.cpp - the C++ side of a pybind11 binding\n#include <pybind11/pybind11.h>\n#include <pybind11/numpy.h>\n#include <cmath>\nnamespace py = pybind11;\n\n// Takes NumPy arrays in, returns a new NumPy array: ONE boundary crossing for N options\npy::array_t<double> price_calls(py::array_t<double> S, py::array_t<double> K,\n                                 double r, double sigma, double T) {\n    auto Sb = S.unchecked<1>(), Kb = K.unchecked<1>();\n    const size_t n = Sb.size();\n    py::array_t<double> out(n);\n    auto ob = out.mutable_unchecked<1>();\n    const double sqrtT = std::sqrt(T);\n    for (size_t i = 0; i < n; ++i) {\n        const double d1 = (std::log(Sb(i)/Kb(i)) + (r + 0.5*sigma*sigma)*T) / (sigma*sqrtT);\n        const double d2 = d1 - sigma*sqrtT;\n        // erf-based N(d) (see the numerical lesson for why this form)\n        auto N = [](double x){ return 0.5*std::erfc(-x / std::sqrt(2.0)); };\n        ob(i) = Sb(i)*N(d1) - Kb(i)*std::exp(-r*T)*N(d2);\n    }\n    return out;\n}\n\nPYBIND11_MODULE(pricer, m) {\n    m.def(\"price_calls\", &price_calls, \"Batch Black-Scholes calls\");\n}", "One crossing for the whole batch — the cardinal rule of interop performance."),
    B("The performance law that governs all of this: **cross the boundary once per batch, never once per item**. A pybind11 call that receives a NumPy array, does all the work in C++, and returns one array, has effectively zero per-element overhead. The same functions exposed element-at-a-time (or called in a Python loop) pay the crossing cost n times and can end up slower than pure NumPy. When you profile a mixed Python/C++ system, the flame graph almost always shows the boundary as a fat bar — the fix is raising the granularity, not tuning the binding."),
    CALLOUT("pitfall", "GIL, releases and object lifetimes", "Three recurring failure modes: (1) pybind11 holds the GIL during your C++ by default — release it with `py::gil_scoped_release` for long computations or you serialise every Python thread waiting on you; (2) returning raw pointers to Python-managed memory is a lifetime bug — arrays own data, borrowed references do not; (3) exceptions must cross the boundary as Python exceptions (pybind11 translates automatically; hand-rolled C ABI does not and will segfault instead)."),
])
save(path, d); print('  ✓ py-cpp-interop')

# ---------- 3. tsmd-oms-positions ----------
path, d = load('tsmd-oms-positions.json')
insert_after_last(d['blocks'], [
    B("Position keeping is event sourcing whether or not you call it that: the position is not a field you update, it is the *sum of a stream* — every execution, every correction, every corporate action — applied in order. This reframing explains everything about OMS design: why you persist the events (the position is derivable), why ordering is a correctness property not a nicety (sums are order-dependent once corrections exist), and why reconciliation exists (two independent event streams — yours and the venue's — will drift, and the drift must be found, not assumed away)."),
    STEPS("A position's life, traced through real messages", [
        "09:30:01.100 — `NEWORDER` 500 BUY. Position: 0. Working orders: +500 (this is *exposure*, not position — a distinction your risk system must maintain).",
        "09:30:01.250 — `EXEC` 300 @ 100.02. Position: +300. Working: 200. Realised: 0. Average cost: 100.02.",
        "09:30:02.000 — `EXEC` 200 @ 100.03. Position: +500. Working: 0. Average cost: $(300 \\times 100.02 + 200 \\times 100.03)/500 = 100.024$.",
        "09:30:05.000 — `CORRECTION`: the second fill was 100.00, not 100.03 (busted and re-reported). Position: still +500 (quantity unchanged) but average cost is now $(300 \\times 100.02 + 200 \\times 100.00)/500 = 100.012$, and every downstream P&L number that already printed is wrong until restated. Corrections are why you keep the events.",
        "09:31:00 — `CORPORATE ACTION`: 2-for-1 split. Position: +1000, cost basis adjusted, all limit prices in working orders cancelled and re-entered by the venue. The position stream just got a non-trade event, and your schema must have had a place for it.",
        "End of day — venue statement: +1000. Your books: +1000. ✓ Reconciled. Tomorrow it will be something else; that is the norm, not the exception.",
    ]),
    TABLE(["Concept", "What it is", "When it changes"], [
        ["Working order", "exposure, not yet a trade", "on send, cancel, reject, partial fill"],
        ["Position", "net executed quantity per instrument", "on execution or correction only"],
        ["Average cost", "weighted price of the open position", "on every buy/sell that changes the position"],
        ["Realised P&L", "closed-portion profit vs average cost", "on reducing trades"],
        ["Unrealised P&L", "mark-to-market of the open position", "on every price tick (this is why it is noisy)"],
    ]),
    CALLOUT("pitfall", "The four sources of position truth, and none of them agree", "Your OMS thinks you are +500. The drop-copy feed says +502 (two fills still in flight to you). The clearing firm says +498 (a bust you have not processed). Risk is computing on +500. All four are 'correct' at different latency horizons — the system's job is not to prevent the disagreement but to bound it, flag it, and reconcile before it compounds. Design for eventual agreement, not instantaneous equality."),
])
save(path, d); print('  ✓ tsmd-oms-positions')

# ---------- 4. spy-visualisation ----------
path, d = load('spy-visualisation.json')
insert_after_last(d['blocks'], [
    B("The purpose of a quant chart is not to look good — it is to make a *claim checkable*. Every mark on the paper asserts something about data (\"the distribution is skewed\", \"the drawdowns cluster\"), and the reader's job is to falsify it. That standard decides most design choices for you: axes that start at meaningful values, sample sizes shown, uncertainty drawn, and no dual axes hiding a scale change."),
    TABLE(["Claim being checked", "Chart that checks it", "Common dishonest/frustrating variant"], [
        ["Are these two return series related?", "scatter with correlation + regression line", "two lines on dual axes"],
        ["Is the distribution fat-tailed?", "histogram with normal overlay (log-y)", "raw histogram, linear axes"],
        ["Is the strategy's drawdown survivable?", "equity curve with drawdown subplot", "equity curve alone, log-scale hidden"],
        ["Is the fit overfit?", "train/validation curves vs complexity", "only the final fit shown"],
        ["Where does the time go?", "horizontal bar, sorted", "pie chart"],
        ["Latency distribution?", "histogram/ECDF with p99 marked", "bar of the mean"],
    ]),
    CODE("python", "import matplotlib.pyplot as plt\nimport numpy as np\n\n# the honest equity curve: performance + drawdown + stats, one figure\nrng = np.random.default_rng(7)\nrets = rng.normal(0.0004, 0.010, 500)\nequity = np.cumprod(1 + rets)\npeak = np.maximum.accumulate(equity)\ndd = equity / peak - 1\n\nfig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 6), sharex=True,\n                                height_ratios=[3, 1], constrained_layout=True)\nax1.plot(equity, lw=1.2)\nax1.set_title(f'n=500, total={(equity[-1]-1):.1%}, '\n              f'worst DD={dd.min():.1%}')\nax1.set_ylabel('equity (start = 1)')\nax2.fill_between(range(len(dd)), dd, 0, alpha=0.5)\nax2.set_ylabel('drawdown')\nax2.set_xlabel('trading day')", "The two-panel equity/drawdown figure — the desk-standard view that answers the survivability question directly."),
    B("Jupyter habits that separate research artefacts from notebooks that rot: name and parameterise every figure (a chart you cannot regenerate is a rumour); keep the generation code next to the output; and when a chart drives a decision, freeze it with the data hash and the git commit. Six months later, the question is never \"was this chart pretty\" but \"exactly which data, which code, which assumptions produced this\" — and only the disciplined notebook can answer."),
    CALLOUT("info", "Defaults that mislead, and their one-line fixes", "Matplotlib defaults are honest but bland; three tweaks cover most quant needs: `constrained_layout=True` (no overlapping labels), log scales for anything multiplicative (equity curves, latencies — a straight line is then 'constant growth rate', which is the claim you care about), and marking the statistics you quote (the p99 line on the latency histogram) so the chart and the text can never silently diverge."),
])
save(path, d); print('  ✓ spy-visualisation')

# ---------- 5. lr-constraints ----------
path, d = load('lr-constraints.json')
insert_after_last(d['blocks'], [
    B("Constraint problems are the mathematics of *scheduling reality*: limited desks, mutual exclusions, orderings. The reasoning skill is a two-step dance: (1) find what is *forced* — the constraint that leaves only one choice — apply it, and (2) propagate the consequence to every other variable, which often creates the next forcing. Repeat until solved or stuck. Interviewers call the hard ones \"brainteasers\"; they are all this same dance at different speeds."),
    STEPS("A worked seating problem, danced properly", [
        "Five desks A–E in a row. Rules: A is not at an end; B is immediately left of C; D and E are not adjacent; A is somewhere right of B. Question: which desk is in the middle?",
        "Nothing is forced yet, so branch on the most constrained variable: B–C is a fused block (B immediately left of C). The block plus three singles fill five slots: block positions are slots (1,2), (2,3), (3,4), (4,5).",
        "A must be right of B, so A sits after the block. If the block is at (4,5), A has no slot — dead. If block at (3,4), A is at 5 — an end, violating rule 1 — dead. So the block is at (1,2) or (2,3).",
        "Try block (2,3): A can be 4 or 5. If A=5, then D,E fill 1,4 — adjacent? No, 1 and 4 — works. If A=4, D,E fill 1,5 — fine too. Two arrangements — the middle is C (slot 3) in both.",
        "Try block (1,2): A ∈ {3,4,5}; D,E fill the rest, must be non-adjacent: if A=3, D,E in {4,5} — adjacent, dead. If A=4, D,E in {3,5} — non-adjacent ✓. If A=5, D,E in {3,4} — adjacent, dead. Middle is A.",
        "Both branch families survive — the problem as stated has two solutions with different middles. *A well-posed interview version adds one more constraint.* For your own practice: notice what just happened — systematic case analysis found the ambiguity in under two minutes, where intuition would have guessed one family and stopped.",
    ]),
    B("The counting side of the same skill: arrangements with constraints are counted by *complementary counting* (count everything, subtract the violations) or by *slot-by-slot products* (how many choices at each position, respecting what is used). Example: how many 4-digit PINs have no repeated digit? $10 \\times 9 \\times 8 \\times 7 = 5040$ — the product shrinks as digits are consumed. How many *do* have a repeat? $10^4 - 5040 = 4960$ — subtraction, because direct counting of 'at least one repeat' is a mess of overlapping cases."),
    CALLOUT("quant", "Where this is not a puzzle", "Clearing schedules (which netting sets settle when, given collateral locks), backtest windows (which strategies can share a data cache), and team scheduling all reduce to constraint reasoning. And the propagate-until-forced discipline is exactly constraint propagation — the algorithm your calendar software runs, formalised."),
])
save(path, d); print('  ✓ lr-constraints')

# ---------- 6. db-joins-aggregations ----------
path, d = load('db-joins-aggregations.json')
insert_after_last(d['blocks'], [
    B("Joins and aggregations are the whole query language in practice: joins assemble the business question's data into one table, aggregations reduce it to the answer. Everything else — window functions, CTEs, indexes — exists to make those two steps fast or readable. The way to fluency is not memorising syntax; it is keeping a mental model of the *shape* of the intermediate table at every step, which is exactly what you practise when you write queries step by step instead of one heroic expression."),
    CODE("sql", "-- Trades, executions, instruments: three tables, one question.\n-- \"Average fill size and slippage per symbol, last hour, biggest first\"\n\nWITH recent_execs AS (\n    SELECT e.exec_id, e.trade_id, e.qty, e.price,\n           i.symbol,\n           t.intended_price\n    FROM executions e\n    JOIN trades      t ON e.trade_id  = t.id\n    JOIN instruments i ON t.symbol_id = i.id\n    WHERE e.ts >= now() - interval '1 hour'\n)\nSELECT symbol,\n       COUNT(*)            AS fills,\n       AVG(qty)            AS avg_fill,\n       AVG(price - intended_price) / intended_price * 10000 AS slippage_bps\nFROM recent_execs\nGROUP BY symbol\nHAVING COUNT(*) >= 5\nORDER BY slippage_bps DESC;", "CTE for shape, join for assembly, GROUP BY for reduction, HAVING for post-aggregation filtering."),
    B("Read that query as a pipeline, because that is what it is. The CTE assembles one clean row per execution (joins). The outer query collapses it to one row per symbol (aggregation), filters groups (HAVING — note it must be HAVING, not WHERE, because the filter references an aggregate), and orders by the interesting metric. Two details separate professionals from tutorial-graduates: WHERE filters *rows before* grouping, HAVING filters *groups after*; and every join should have an explicit ON with keys you can name — a cartesian product at tick volume is how databases get taken down politely."),
    TABLE(["Need", "Window function", "Why not plain GROUP BY"], [
        ["running P&L / cumulative volume", "`SUM(x) OVER (ORDER BY ts)`", "GROUP BY collapses rows; windows keep them"],
        ["per-symbol running total", "`SUM(x) OVER (PARTITION BY symbol ORDER BY ts)`", "one pass, all symbols"],
        ["rank venues by fill rate", "`RANK() OVER (ORDER BY fill_rate DESC)`", "ranking needs the rows to coexist"],
        ["compare each row to its group's average", "`x - AVG(x) OVER (PARTITION BY g)`", "the deviation survives"],
        ["previous/next price (returns!)", "`price / LAG(price) OVER (ORDER BY ts) - 1`", "shift-in-SQL; the pandas `shift(1)` of lesson fame"],
    ]),
    CALLOUT("pitfall", "The join fan-out that quietly corrupts analytics", "Joining executions to a table with duplicate keys multiplies rows: 100 executions × 3 duplicate reference rows = 300 (and every SUM is tripled). It does not error — it silently lies. Two defences: check key uniqueness before joining (`GROUP BY key HAVING COUNT(*) > 1`), and sanity-check row counts across the join (`SELECT COUNT(*)` on each side and after). Reconciliation thinking applies to queries too."),
])
save(path, d); print('  ✓ db-joins-aggregations')

# ---------- 7. cpp-structs-enums-namespaces ----------
path, d = load('cpp-structs-enums-namespaces.json')
insert_after_last(d['blocks'], [
    B("User-defined types are how a codebase stops arguing. When `Side`, `OrderId` and `Price` are distinct types — not `int`, `int` and `double` wearing comments — the compiler enforces the vocabulary the desk already uses. This is the difference between type systems as bureaucracy and type systems as free unit tests: every accidental swap of an order id and a quantity becomes a compile error instead of a 3am page."),
    CODE("cpp", "#include <cstdint>\n#include <cstdio>\n#include <string>\n\nnamespace md {                       // namespacing = ownership boundary\n\nenum class Side : uint8_t { Buy, Sell };   // scoped enum: no implicit int leaks\n\nstruct OrderId {\n    uint64_t value;\n    explicit OrderId(uint64_t v) : value(v) {}\n};\n\nstruct Price {\n    int64_t ticks;                    // price as integer ticks: the fix for 0.1+0.2 != 0.3\n    explicit Price(int64_t t) : ticks(t) {}\n    double as_double(int tick_size_decimals) const {\n        double scale = 1; for (int i = 0; i < tick_size_decimals; ++i) scale *= 10;\n        return ticks / scale;\n    }\n};\n\n}  // namespace md\n\nint main() {\n    md::Side s = md::Side::Buy;\n    // md::Side s2 = 1;                 // COMPILE ERROR: no implicit conversion — the point\n    md::OrderId id{42};\n    // int x = id.value + 100;         // compiles but is visibly wrong to the reader\n    md::Price p{100025};               // 100.025 at 3 decimals\n    printf(\"side=%s price=%.3f\\n\",\n           s == md::Side::Buy ? \"BUY\" : \"SELL\", p.as_double(3));\n}", "Strong types: distinct vocabularies for concepts the desk keeps distinct."),
    B("Three design rules worth internalising. **Scoped enums (`enum class`) always** — plain enums leak their enumerators into the enclosing scope and convert to integers implicitly, which is two bugs per keystroke saved. **Constructors of strong types get `explicit`** — it stops `f(42)` from silently becoming an `OrderId`, and makes the intended construction `OrderId{42}` visible at the call site. **Namespaces mirror ownership, not taxonomies** — `md::` (market data), `oms::` (order management), `risk::` boundaries are where build-time dependencies can be cut; a namespace named `utils::` is where good intentions go to die."),
    CALLOUT("quant", "Why price is an integer in the example", "Money and prices as `double` accumulate binary representation error (the numerical-stability lesson at micro scale). The professional pattern is integer ticks + a per-instrument decimal scale, exactly as the example shows — with the conversion to double confined to display and analytics boundaries. When you see `int64_t ticks` in a codebase, that team has been burned before; when you see `double price` in an order path, they will be."),
])
save(path, d); print('  ✓ cpp-structs-enums-namespaces')

# ---------- 8. cpp-testing-frameworks ----------
path, d = load('cpp-testing-frameworks.json')
insert_after_last(d['blocks'], [
    B("A test suite is a proof, written in the language the compiler already checks. Unit tests prove properties of components; integration tests prove the components compose; the CI pipeline proves the proofs run on every change. The craft is choosing *what* to prove: the boundary conditions, the invariants, and the regression list — because testing everything is impossible and testing nothing is a deployment strategy."),
    CODE("cpp", "// tests/test_pnl.cpp - GoogleTest, testing what actually breaks\n#include <gtest/gtest.h>\n#include \"pricer/pnl.hpp\"\n\nTEST(PnL, FlatPositionHasZeroPnL) {\n    Position p{0, 0.0};\n    EXPECT_DOUBLE_EQ(realised_pnl(p, 100.0), 0.0);\n}\n\nTEST(PnL, AverageCostUpdatesOnIncreasing) {\n    Position p;\n    p.apply_fill(+100, 50.0);\n    p.apply_fill(+100, 60.0);\n    EXPECT_DOUBLE_EQ(p.avg_cost, 55.0);      // weighted, not last-price\n}\n\nTEST(PnL, ReducingFlipRealisesCorrectly) {\n    Position p;\n    p.apply_fill(+100, 50.0);\n    p.apply_fill(-150, 60.0);                // flip to short\n    EXPECT_DOUBLE_EQ(p.realised, 1000.0);   // 100 * 10 profit\n    EXPECT_EQ(p.qty, -50);\n    EXPECT_DOUBLE_EQ(p.avg_cost, 60.0);      // new side priced at fill\n}\n\nTEST(PnL, NoFloatingDriftAcrossCycle) {\n    Position p;\n    for (int i = 0; i < 100000; ++i) p.apply_fill(+1, 0.1);\n    EXPECT_NEAR(p.qty * p.avg_cost, 10000.0, 1e-6);   // accumulation sanity\n}", "Test the invariants and the flip cases — those are where P&L bugs live."),
    B("The benchmark half of the framework matters as much as the correctness half, because latency regressions are bugs that tests cannot see. GoogleTest's sibling (`benchmark::`) measures what microseconds cost; the discipline is to *fix the environment* (pin the CPU governor, warm caches, report distributions not means — the percentile lesson made this exact point) and to alarm on percentile drift, not on noise. A CI that reports \"mean 4.2µs\" has told you almost nothing; one that reports \"p99 was 9µs, now 14µs\" has caught a real regression before production does."),
    CALLOUT("pitfall", "Tests that pass and prove nothing", "Three anti-patterns to hunt in reviews: (1) *tautologies* — `EXPECT_EQ(f(x), f(x))` or re-implementing the logic under test; (2) *fixture soup* — one giant setup used by every test, so no test can be understood alone and none test a clean state; (3) *float equality* — `EXPECT_EQ` on doubles fails on the last ulp; use EXPECT_NEAR with a tolerance tied to the magnitudes involved. A suite with any of these has coverage-shaped holes exactly where confidence is highest."),
])
save(path, d); print('  ✓ cpp-testing-frameworks')

# ---------- 9. cpp-futures-async ----------
path, d = load('cpp-futures-async.json')
insert_after_last(d['blocks'], [
    B("Futures are promises with a receipt: `std::future<T>` is the handle for a value that does not exist yet, `std::promise`/`std::packaged_task` is the writing end, and the thread pool is the machinery deciding when the promise gets fulfilled. Their whole point is to decouple *expressing* parallelism (\"these three computations are independent\") from *managing* it (thread lifetimes, join points, exception transport) — the management being exactly the part everyone gets wrong when they write raw `std::thread` code."),
    CODE("cpp", "#include <future>\n#include <vector>\n#include <numeric>\n#include <cstdio>\n\n// Price three books concurrently, sum the results.\n// The pool is implicit (std::async with the launch policy), the join is the .get()s.\ndouble total_pnl(std::vector<double> book_a,\n                 std::vector<double> book_b,\n                 std::vector<double> book_c) {\n    auto sum = [](std::vector<double> v) {\n        return std::accumulate(v.begin(), v.end(), 0.0);\n    };\n    auto fa = std::async(std::launch::async, sum, std::move(book_a));\n    auto fb = std::async(std::launch::async, sum, std::move(book_b));\n    double c = sum(book_c);                      // do one on this thread\n    return fa.get() + fb.get() + c;              // .get() joins + rethrows\n}\n\nint main() {\n    printf(\"%.2f\\n\", total_pnl({1,2,3}, {4,5}, {-2}));   // 13.00\n}", "Three independent sums, two helper threads, one join — exceptions travel through .get()."),
    B("The details that futures quietly get right, and that hand-rolled threading gets wrong: **exception transport** — an exception in the worker is captured and rethrown at `.get()`, so errors are not silently swallowed; **join-on-destruction** — a `std::future` from `std::async` blocks in its destructor, eliminating the \"forgot to join\" class of bugs; and **one-shot semantics** — `get()` invalidates the future, which matches how results are actually consumed and prevents accidental double-reads. The remaining footgun is the launch policy: `std::launch::deferred` (the fallback when you do not specify) runs the work lazily *on the calling thread at get()* — parallelism that silently never happened. Say `std::launch::async` out loud or do not expect concurrency."),
    CALLOUT("pitfall", "Thread pools, tasks and the futures they break", "A real pool (or `std::async` on a loaded runtime) executes tasks on threads you do not own — which breaks code that assumes the executing thread (thread-local caches, affinity-pinned hot paths, lock hierarchies by thread id). Additionally, futures are one-shot and their `get()` blocks; when you need composable pipelines (continue-when-ready, not wait-until-done), you leave std::future for continuation-style libraries ( folly::Future, std::experimental ) or coroutines — the design lesson being: the standard future is a fine receipt and a poor dataflow engine."),
])
save(path, d); print('  ✓ cpp-futures-async')

# ---------- 10. ll-methodology ----------
path, d = load('ll-methodology.json')
insert_after_last(d['blocks'], [
    B("Benchmarking latency is measurement science, not stopwatch use. The three failure modes that invalidate most naive benchmarks — measuring the wrong thing (wall clock including setup), measuring on an uncontrollable system (CPU frequency scaling, other processes), and summarising with the wrong statistic (the mean, always the mean) — all have standard defences. Learn the defences once; every measurement you take afterwards becomes trustworthy."),
    STEPS("The methodology, as a checklist that fits on a sticky note", [
        "**Pin the environment**: performance governor set, turbo behaviour known (or disabled), the benchmark pinned to specific cores (`taskset`), background noise off. An unpinned benchmark is a weather report.",
        "**Warm up, then measure**: cold caches and lazy page faults belong to the first iterations; discard them. Measure steady state, and separately measure the cold case only if cold is the production scenario (it usually is not).",
        "**Collect the distribution, not the total**: every iteration is a sample of a distribution that is never normal (GC-like pauses, page faults, IRQ storms live in the tail). Save per-iteration latencies; report p50/p99/p99.9/max — never a lone mean. The PercentileExplorer lab makes the mean-vs-tail gap visceral.",
        "**Repeat to bound noise**: run the whole benchmark $k$ times and compare the *spread of the p99s* across runs. If run-to-run p99 varies by 30%, your measurement resolution is 30% — no optimisation smaller than that is detectable, and claiming one is astrology.",
        "**Compare like with like**: before/after on the same machine, same pinning, same warmup — and report the environment with the numbers. A latency claim without an environment description is not a result.",
    ]),
    TABLE(["Tool", "What it sees", "Blind spot"], [
        ["perf stat", "cache misses, IPC, branch misses (hardware counters)", "nothing per-iteration unless you sample"],
        ["perf record", "where cycles go (sampling profiler)", "biases toward long-running code"],
        ["custom rdtsc harness", "exact per-iteration latency", "you must handle frequency scaling yourself"],
        ["bpftrace/ftrace", "kernel events: syscalls, context switches, scheduling", "needs root, steep syntax"],
        ["std::chrono steady_clock", "portable monotonic time", "coarse (~20-30ns) vs rdtsc; fine for µs+"],
    ]),
    CALLOUT("pitfall", "The optimisation you cannot measure, twice", "The most expensive engineering sin in low latency: shipping an optimisation whose gain is smaller than measurement noise — it added complexity and bought nothing, and now nobody dares remove it. The sticky-note checklist exists to make your noise floor explicit so every change is either *proven* or *rejected*. That binary is the entire value of methodology."),
])
save(path, d); print('  ✓ ll-methodology')

print('\nBatch 5 complete.')
