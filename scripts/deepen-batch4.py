#!/usr/bin/env python3
"""Batch 4: deepen 10 lessons (cpp, fixed income, risk, backtesting, swe)."""
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

# ---------- 1. cpp-unique-ptr ----------
path, d = load('cpp-unique-ptr.json')
insert_after_last(d['blocks'], [
    B("`unique_ptr` is not a convenience — it is a *proof technique* encoded in the type system. Owning the object through a move-only type means ownership has a single, statically-checkable path from construction to destruction. When a `unique_ptr` compiles, you have proven there is exactly one owner at every program point; leaks and double-frees stop being runtime events and become compile errors in someone else's code. That is the whole pitch, and it is why modern style guides say \"no naked `new`\"."),
    CODE("cpp", "#include <memory>\n#include <cstdio>\n\nstruct Book { double px; explicit Book(double p) : px(p) { puts(\"book built\"); }\n               ~Book() { puts(\"book gone\"); } };\n\nstd::unique_ptr<Book> quote_factory(double px) {\n    auto b = std::make_unique<Book>(px);   // single allocation, exception-safe\n    return b;                              // NRVO / move: ownership leaves the function\n}\n\nint main() {\n    auto h = quote_factory(101.25);        // h now owns the Book\n    // auto h2 = h;                       // COMPILE ERROR: copy is deleted\n    auto h2 = std::move(h);               // ownership transferred; h is now null\n    if (!h) puts(\"h is empty after move\");\n    printf(\"px = %.2f\\n\", h2->px);\n    return 0;                             // h2 goes out of scope: destructor runs here\n}", "Ownership as proof: one owner at all times, destruction at scope exit, copy deleted."),
    B("The three habits that make this second nature. **Factory functions return by value** — the compiler turns it into a move (or elides it entirely); returning a raw pointer from a factory is how ownership ambiguity starts. **`make_unique` over `new`** — one allocation instead of two, and immune to the leak-on-exception window between `new` and the constructor of the smart pointer. **Parameters say what they mean**: a function taking `unique_ptr<T>` by value *consumes* the object; taking `T&` merely borrows; taking `T*` is a maybe-null borrow. Reading a signature should tell you the ownership story without a comment."),
    CALLOUT("pitfall", "The silent killer: unique_ptr across threads", "Passing a `unique_ptr` to another thread by reference-to-local (or capturing it by reference in a lambda) destroys the single-owner proof — two threads now race on the same owning pointer. The correct moves: pass by value (the move transfers ownership into the receiving thread), or share deliberately with `shared_ptr` (and accept its atomic-refcount cost). A data race on ownership is the worst kind because it often *works* in tests."),
])
save(path, d); print('  ✓ cpp-unique-ptr')

# ---------- 2. fi-rate-sensitivity ----------
path, d = load('fi-rate-sensitivity.json')
insert_after_last(d['blocks'], [
    B("A single duration number assumes the whole curve moves in parallel — and the whole curve never moves in parallel. Real curve changes decompose into level, slope and curvature (what principal-component analysis of historical yield changes finds, in that order of importance). Rate-sensitivity models answer the question: *which parts of the curve does my book care about?* — and they range from the pragmatic (key-rate durations) to the structural (factor models and full term-structure models)."),
    TABLE(["Approach", "What it assumes", "Inputs", "Where it is used"], [
        ["Parallel duration", "one yield number moves", "modified duration", "quick desk approximations"],
        ["Key-rate durations", "specified curve points move independently", "KRDs per tenor", "hedging bond portfolios against curve twists"],
        ["Factor / PCA model", "level, slope, curvature factors", "historical covariances", "risk reports, scenario generation"],
        ["Term-structure model (Vasicek, HJM)", "rate dynamics with drift + vol", "calibrated parameters", "derivatives pricing, stochastic hedging"],
    ]),
    STEPS("Key-rate durations, computed on the 3-year 4% par bond", [
        "The bond (from the duration lesson): coupons $4, 4, 104$, yield 4%, price exactly 100.",
        "Bump *only* the 1-year zero rate by 1bp and reprice: the price falls to 99.9963 — sensitivity $\\approx 0.0370$ per 100. That is $KRD_{1y} = 0.037$: the bond's exposure to the short end alone.",
        "Bump only the 2-year point: $KRD_{2y} = 0.071$. Bump only the 3-year point: $KRD_{3y} = 2.667$ — almost all the risk lives where the big cash flow sits.",
        "Sanity check that always holds: $KRD_1 + KRD_2 + KRD_3 = 0.037 + 0.071 + 2.667 = 2.775$ — exactly the modified duration. Key-rate durations *partition* the parallel number by curve segment; their sum must reproduce it.",
        "The hedging consequence: to neutralise this bond against a 2s-vs-3s steepener you need an instrument whose $KRD_3 - KRD_2$ profile cancels yours — a single duration-matched hedge leaves the twist risk fully open.",
    ]),
    CALLOUT("quant", "The classic exam trap", "\"Which bond has the higher duration: a 10-year zero or a 10-year 5% coupon, both at 6% yield?\" The zero — coupons pull cash flows (and therefore weighted average time) earlier, so anything with coupons has *less* duration than the zero of the same maturity. Extend to curve risk: the zero has all its KRD stacked at 10 years; the coupon bond spreads it across the curve. Same maturity, different curve bets."),
])
save(path, d); print('  ✓ fi-rate-sensitivity')

# ---------- 3. risk-es-stress ----------
path, d = load('risk-es-stress.json')
insert_after_last(d['blocks'], [
    B("Expected shortfall exists because VaR answers the wrong question. VaR(95%) says: on 19 days out of 20, you lose less than X. It says *nothing* about the size of the loss on that 20th day — and a risk measure that is blind to exactly the days it exists for is a strange foundation. ES(95%) asks the follow-up: *given that we are in the bad 5% of outcomes, what is the average loss?* It costs more to compute (you need the tail, not a quantile) and it is what regulators moved to after 2008 for precisely that reason."),
    STEPS("VaR vs ES on 20 hypothetical trading days", [
        "Daily P&L percentages, worst first: $-2.5, -2.1, -1.8, -1.6, -1.5, -1.2, \\ldots$ (15 better days omitted).",
        "**VaR90** = the 10th-percentile loss = 2.1%. \"On 90% of days we lose no more than 2.1%.\" The 2.5% disaster day is invisible to this number.",
        "**ES90** = mean of the worst 10% (worst 2 days): $(-2.5 - 2.1)/2 = -2.3\\%$. ES > VaR always, and the gap *is* the tail information.",
        "On a 10 million book: VaR90 says \"210k\", ES90 says \"230k on average once you are already in the bad decade of days\". The 40-point difference is the cheapest tail-risk education you will ever get.",
        "Estimation honesty: with 20 points, the 95% tail contains *one* observation — ES95 is literally your single worst day. Reliable ES estimates need hundreds of tail observations, which is why practitioners bootstrap, fit parametric tails, or use filtered historical simulation instead of naive rolling windows.",
    ]),
    B("Stress testing complements both measures by refusing to use the historical distribution at all. A stress scenario is a *specified* shock — equities −25%, credit spreads +300bp, correlation → 1 — applied to today's book. Its value is that it can include events absent from your sample (the point of the exercise) and expose non-linearities that percentile statistics hide: the book that loses 2% in a −5% equity day may lose 9% in a −25% day once hedges saturate and gamma flips. VaR extrapolates your past; stress tests interrogate your imagination. desks that survived 2008 ran both."),
    CALLOUT("pitfall", "ES is still a distribution-dependent number", "Switching from VaR to ES does not fix estimation risk — it amplifies sensitivity to it, because the tail is the least-sampled region. An ES computed from 250 days of calm data is a calm-weather ES. Combine it with stress scenarios and backtesting (does the 95% measure actually breach ~5% of the time?) or it is decoration."),
])
save(path, d); print('  ✓ risk-es-stress')

# ---------- 4. swe-design-patterns ----------
path, d = load('swe-design-patterns.json')
insert_after_last(d['blocks'], [
    B("Patterns are vocabulary, not goals. Their value is that a name — \"strategy\", \"observer\", \"adapter\" — compresses a design decision into one word your team already understands, and their danger is that pattern-driven design produces architecture astronautics: four abstract classes to print a number. The professional filter is always the same: **what variation does this pattern buy me, and do I actually need that variation?**"),
    STEPS("The Strategy pattern, in a pricing-engine context", [
        "The variation you need: multiple pricing models (binomial tree, Black-Scholes, Monte Carlo) selected at runtime by instrument type.",
        "Wrong turn: a `price()` function with a `switch (model)` over enum values, duplicated at every call site — every new model edits every switch.",
        "Strategy: an abstract interface `Pricer { double price(const Option&) const; }`, one concrete class per model, and the *caller depends only on the interface*. Adding a model becomes adding a file, not editing a web of switches.",
        "The cost you accepted: one virtual call per pricing (a pointer chase the CPU cannot inline) and one more layer to read. For a hot loop pricing a million options, that cost is real — and the fix is *not* to abandon the pattern but to hoist the dispatch out of the inner loop, or to use CRTP/templates for static polymorphism where the model is known at compile time.",
        "The general lesson: patterns trade runtime indirection (or compile-time complexity) for changeability. The trade is good exactly when the variation is real, and waste when it is speculative.",
    ]),
    TABLE(["Pattern", "The variation it buys", "Typical quant-systems use", "Overuse smell"], [
        ["Strategy", "algorithm selected at runtime", "pricing models, execution algos", "two implementations chosen by a config flag"],
        ["Observer", "many consumers of one event stream", "market data fan-out to strategies, risk, logging", "replacing a simple function call"],
        ["Adapter", "incompatible interface bridged", "wrapping a vendor API behind your types", "wrapping your own code"],
        ["Factory", "construction delegated, caller agnostic", "deserialising messages into typed orders", "one product, one factory"],
        ["Template method", "fixed skeleton, variable steps", "backtest harness: setup → run → report", "skeleton with one variable step"],
    ]),
    CALLOUT("info", "SOLID, honestly stated", "Single responsibility, open-closed, Liskov, interface segregation, dependency inversion — five heuristics that all reduce to: *depend on abstractions, keep responsibilities separable, and do not promise more than you honour*. They are heuristics, not laws; a 30-line script obeying all five is worse than a 30-line script that ignores them. The time to reach for them is when change hurts — that pain, not a checklist, is the signal."),
])
save(path, d); print('  ✓ swe-design-patterns')

# ---------- 5. risk-taxonomy ----------
path, d = load('risk-taxonomy.json')
insert_after_last(d['blocks'], [
    B("Risk taxonomies are not academic furniture — they are the table of contents of a risk system. Every category implies a *different measurement machinery*, a different owner, and a different cadence: market risk is measured continuously from positions and prices; credit risk from counterparty exposures and probabilities; operational risk from incident data and process maps; model risk from validation and benchmarking. When a loss happens, the taxonomy tells you which machinery failed — and when a *new* risk appears (crypto custody? an LLM in the pricing path?), the first argument is always \"which bucket does this belong in, and does that bucket have machinery?\""),
    TABLE(["Risk class", "Measured by", "Classic quant metric", "Typical owner"], [
        ["Market", "positions + price/scenario paths", "VaR, ES, greeks, stress P&L", "front-office risk"],
        ["Credit", "counterparty exposure + PD/LGD", "CVA, PFE, exposure at default", "credit risk"],
        ["Liquidity (funding)", "cash-flow schedule vs available funding", "survival horizon, funding gap", "treasury"],
        ["Liquidity (asset)", "market depth + liquidation cost", "liquidation cost, spread duration", "execution/desk"],
        ["Operational", "processes, incidents, controls", "loss frequency × severity, KRIs", "ops risk"],
        ["Model", "model inventory + validation", "benchmark error, P&L attribution", "model validation"],
    ]),
    B("Two cross-cutting truths make the taxonomy honest. **Risks interact**: the 2008 lesson was market risk becoming funding-liquidity risk becoming credit risk in a chain no per-bucket limit caught — which is why firm-level stress scenarios span buckets. **The most dangerous risks are the ones not in the taxonomy**: Knight Capital's 2012 loss ($440M in 45 minutes) was operational — a dead trading-activate flag on a reused order type — not market risk. The systems you will build in this curriculum are mostly operational-risk mitigation: reconciliation, kill switches, deployment safety, position checks. The code is where operational risk lives and dies."),
    CALLOUT("quant", "Interview framing: \"name the risks in this trade\"", "Given \"buy an illiquid bond, finance it overnight in repo, hedge rates with a future,\" the expected ladder: market risk (rate moves on the bond) → funding liquidity (repo rolls daily; a spike strands you) → asset liquidity (the bond cannot be sold at mid when you need to) → basis risk between bond and future → counterparty/credit on the repo counterparty. Walking that ladder calmly, one bucket at a time, is precisely the competence the question tests."),
])
save(path, d); print('  ✓ risk-taxonomy')

# ---------- 6. psm-framework ----------
path, d = load('psm-framework.json')
insert_after_last(d['blocks'], [
    B("A problem-solving framework earns its keep only under pressure — in an interview, or on a production incident at 09:31 with P&L bleeding. Its job is not to make you smarter; it is to stop you from burning your first five minutes on the wrong layer of the problem. The discipline it imposes is sequencing: understand before plan, plan before execute, and always leave a verification step, because an unverified answer is a guess wearing a suit."),
    STEPS("The framework applied to a real interview question", [
        "**Question: \"The same order id appears twice in our fill stream. Debug.\"** Understand before anything: what does \"appears twice\" mean — duplicate message, or two distinct executions with the same id? Where was it noticed (recon report? position mismatch?) and is the system still receiving them?",
        "Restate the problem in one sentence with constraints: *\"A fill message with id X is processed twice, producing a double-counted position, and we need to know whether the fault is upstream (vendor sent twice), in our transport (at-least-once delivery), or in our processing (no idempotency).\"* The three hypotheses are now visible.",
        "Plan the cheapest discriminating test: check the raw feed capture — was the message physically received twice? That single check splits the hypothesis space in half before you read a line of application code.",
        "Execute with instrumentation: log hashes of message ids at ingress, queue-consumer and persistence layers. The layer where the count doubles is the culprit layer.",
        "Verify and generalise: after the fix, reconcile positions against the exchange drop-copy; then ask the framework-closing question — *what family of bug is this?* (at-least-once delivery without idempotent consumption) — and audit sibling paths for the same pattern.",
    ]),
    B("Notice what the framework did and did not do. It did not supply domain knowledge — you still needed to know what at-least-once delivery and idempotent consumers are. It supplied *ordering*: hypothesis before diagnosis, diagnosis before fix, fix before generalisation. In interviews this reads as seniority; in incidents it reads as calm. Both are the same skill: refusing to act on an unformed problem."),
    CALLOUT("info", "Why drills beat frameworks", "The framework is slow the first dozen times and invisible afterwards — like arithmetic becoming mental math. That is why this curriculum drills unfamiliar problems against the clock: the goal is not to remember the ten steps, it is to *become someone who automatically restates the problem before touching code*. Frameworks are training wheels; the balance is the skill."),
])
save(path, d); print('  ✓ psm-framework')

# ---------- 7. bt-data-biases ----------
path, d = load('bt-data-biases.json')
insert_after_last(d['blocks'], [
    B("Every backtest runs on a dataset that was *assembled by some process*, and that process leaves fingerprints on the numbers. Survivorship bias is the most famous fingerprint, but it has siblings — look-ahead in corporate actions, rebalancing-timing mismatches, and the quiet catastrophe of adjusted-price series used for volume-aware strategies. The skill is not memorising the list; it is interrogating any dataset with the question: *what would have to be true about the world in 2015 for this row to be in my 2015 file?*"),
    STEPS("Survivorship, quantified on illustrative index churn", [
        "Liquid indices remove and replace members constantly — historically on the order of 4–5% of names per year (mergers, delistings, demotions).",
        "Compounding that churn: $(1 - 0.045)^{20} \\approx 0.40$ — roughly 60% of today's index members were absent 20 years ago.",
        "A backtest on *today's constituents' history* therefore tests a portfolio that, in reality, nobody could have held: you are long only the companies that survived selection. The losers — the ones that got removed for cause — are silently excluded from your sample.",
        "The fix is point-in-time membership data, and the reason it is expensive is that someone had to archive the index files as they were published. That archive is precisely what distinguishes professional research data from scraped tickers.",
    ]),
    TABLE(["Bias", "What contaminates the data", "Backtest symptom", "Fix"], [
        ["Survivorship", "only alive names present", "equity strategies look better than live", "point-in-time membership"],
        ["Look-ahead (corp. actions)", "adjusted prices embed future info", "dividend strategies \"predict\" announcements", "event files with announce dates"],
        ["Rebalancing timing", "signal and execution at same close", "small-cap reversals magically profitable", "execute next bar / add latency"],
        ["Data snooping", "many strategy variants, one reported", "great backtest, dead live", "hold-out periods, pre-registration"],
    ]),
    CALLOUT("pitfall", "Adjusted prices are a modelling choice, not raw data", "Back-adjusted futures series and split-adjusted equities *rewrite history* so percentages stay continuous — which is right for return computation and wrong for anything that touched actual price levels (limit orders, margin, volume-weighted participation). Know which series your vendor gave you, and recompute the raw prices when level-dependent logic matters. Mixing the two is one of the most common silent errors in research code."),
])
save(path, d); print('  ✓ bt-data-biases')

# ---------- 8. ll-latency-budgets ----------
path, d = load('ll-latency-budgets.json')
insert_after_last(d['blocks'], [
    B("A latency budget is an accounting document: the target tick-to-trade time, decomposed into every component that spends time, each with an owner and a measured cost. Its discipline is the same as any budget — components must *sum* to the total, every number must be *measured* not guessed, and any overrun must be *paid for* somewhere. Teams that skip the budget discover latency the way individuals discover debt: all at once, in a crisis."),
    STEPS("A realistic budget, wire-to-wire (illustrative, exchange colo)", [
        "**Wire + switch hop**: 800 ns. Photon in fibre plus one switch — this is physics; you cannot optimise it, only shorten the path.",
        "**NIC + driver**: 2,500 ns. Interrupt coalescing is a *choice* here: batching raises throughput and p50 but wrecks p99 — a budget line, not a free lunch.",
        "**Kernel network stack**: 3,200 ns in a standard stack. This is the line that kernel-bypass (DPDK, Solarflare/OpenOnload, AF_XDP) exists to delete — but each bypass moves work into your process and your responsibility.",
        "**Decode + strategy + risk checks + order build**: 8,000 ns. The only line that is *yours* end-to-end: the strategy logic, pre-trade risk (position limits, rate limits, self-trade checks) and FIX/OUCH serialisation.",
        "**Total**: ~14.5 µs tick-to-trade. Comfortably fast for most strategies; HFT market makers target single-digit microseconds and pay for it in every line above. The budget makes the *next* decision obvious: the strategy block is 55% of the total, so micro-optimising the kernel stack first would be misallocation.",
    ]),
    CALLOUT("pitfall", "Averages lie about the tail", "A budget satisfied at the mean and blown at p99 is blown — the exchange prices your slow orders, not your average ones. Every line in the budget needs a percentile attached (\"p99 strategy time ≤ 4 µs\"), and periodic GC pauses, page faults and cache misses are exactly the events that live between p99 and max. Measure the distribution, budget the percentile you care about."),
])
save(path, d); print('  ✓ ll-latency-budgets')

# ---------- 9. bt-lookahead-costs ----------
path, d = load('bt-lookahead-costs.json')
insert_after_last(d['blocks'], [
    B("Look-ahead bias is the single most efficient way to manufacture a profitable backtest: use one piece of information from the future, and the strategy looks brilliant forever. Its cousin, the same-bar assumption (compute the signal from the 15:59:59 close and also trade at that close), is subtler and even more common — it hides inside innocent-looking indexing like `df['signal'] = df['close'] > df['close'].rolling(20).mean()` followed by `df['pnl'] = df['signal'] * df['ret']` where `ret` is the *same* bar's return."),
    STEPS("The one-line audit for same-bar leakage", [
        "Write the timeline explicitly: at 15:59:59 the bar closes; the signal needs the close; execution needs the signal. Execution therefore cannot happen at 15:59:59. The earliest honest execution is the next bar's open (plus your latency).",
        "The audit rule: **the return you book for bar $t$ must use prices from bar $t+1$ onwards.** In pandas: `signal.shift(1) * ret`, and if you trade the open, `ret` itself must be open-to-open, not close-to-close.",
        "Typical magnitudes (illustrative): an intraday reversal strategy leaking one close-to-open gap can gain 50–200bp of annual alpha from that leak alone — on a strategy whose real edge is zero. The gap between \"backtest Sharpe 1.8\" and \"live Sharpe −0.2\" is usually one `shift(1)`.",
        "Transaction costs enter the same audit: your fill assumption must include the spread you would actually cross, at the size you would actually trade, in the liquidity that existed *at that moment* — historical spread data exists precisely for this line of the budget.",
    ]),
    TABLE(["Leakage source", "Where it hides", "Symptom", "Honest version"], [
        ["Same-bar signal", "signal × same-bar return", "intraday strategies too good", "shift(1), next-bar open"],
        ["Close-based execution", "\"fill at close\"", "smooth equity curve", "next open / VWAP / arrival"],
        ["Future corporate actions", "adjusted prices", "event strategies predict events", "announce-date files"],
        ["Full-sample statistics", "z-scores using all-history mean", "regime strategies \"know\" the mean", "expanding/rolling windows only"],
        ["Best-case fills", "limit fills assumed at touch", "market-making prints money", "queue-position or conservative models"],
    ]),
    CALLOUT("quant", "Walk-forward as structural honesty", "The cure that also proves the medicine: re-run the entire pipeline (normalisation, calibration, everything) in a rolling walk-forward where each month's parameters come only from prior months. If performance collapses versus the full-sample backtest, the difference *was* leakage and snooping — quantified for free. The walk-forward number is the one honest estimate of live performance you can produce before going live."),
])
save(path, d); print('  ✓ bt-lookahead-costs')

# ---------- 10. cpp-tooling ----------
path, d = load('cpp-tooling.json')
insert_after_last(d['blocks'], [
    B("C++ tooling is a pipeline you must be able to reason about end-to-end, because the compiler is where half your performance comes from and all of your correctness guarantees originate. The pipeline: preprocessor → compiler proper (optimisation levels decide how hard it works) → linker (where the One-Definition Rule and visibility questions land) → and alongside it, the analysers: sanitisers and static analysis, which catch bug classes the compiler silently tolerates."),
    TABLE(["Tool", "Answers the question", "Catches", "Cost"], [
        ["-Wall -Wextra", "what looks suspicious?", "unused, sign issues, shadowing", "free — always on"],
        ["-fsanitize=address", "where is the memory bug?", "OOB, use-after-free, leaks", "~2x slower, shadows"],
        ["-fsanitize=undefined", "is UB actually happening?", "signed overflow, misaligned loads", "~1.5x slower"],
        ["clang-tidy", "what does style + bugs look like?", "bugprone patterns, modernize-*, performance-*", "static, needs config"],
        ["gprof / perf", "where does time go?", "hot functions, cache misses", "instrumentation/sampling"],
        ["-O2 vs -O0", "how hard does the compiler try?", "— (a choice, not a check)", "compile time, debuggability"],
    ]),
    CODE("bash", "# The debugging loop that finds real bugs fast:\ng++ -std=c++20 -g -O1 -fsanitize=address,undefined -o pricer_asan pricer.cpp\n./pricer_asan input.csv          # ASan prints the exact allocation stack of any OOB\n\n# Then optimise and benchmark the FIXED code:\ng++ -std=c++20 -O2 -march=native -o pricer pricer.cpp\nperf stat -e task-clock,cache-misses ./pricer input.csv", "Sanitise first, optimise second. Optimising buggy code optimises the bug."),
    B("The ordering discipline matters more than any individual flag. Debug with sanitisers at `-O1` (fast enough to run, faithful enough to diagnose). Benchmark only at `-O2`/`-O3` with `-march=native` on the target hardware, after the sanitisers are clean — because UB that \"works\" at `-O0` becomes the miscompiled loop you ship at `-O2`. And treat warnings as errors from day one (`-Werror`): a warning you learn to scroll past is a bug you have scheduled for later."),
    CALLOUT("pitfall", "\"It works at -O0\" is a UB confession", "The single most diagnostic sentence in C++ debugging. Optimisation exposes undefined behaviour — the compiler assumes UB never happens and optimises accordingly (dead-code elimination, reordering, vectorisation). If behaviour changes between -O0 and -O2, you do not have a compiler bug; you have UB, and the sanitisers will name it."),
])
save(path, d); print('  ✓ cpp-tooling')

print('\nBatch 4 complete.')
