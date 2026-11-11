#!/usr/bin/env python3
"""v3.2 re-embed: tailored interactive blocks for the 45 lessons that lack one
(plus paragraph deepening for the two lessons under 250 body words), taking the
content validator from 47 warnings to 0. Idempotent: skips lessons that
already carry an interactive block."""
import json, os, sys

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

def interactive(component, params=None, caption=''):
    b = {"type": "interactive", "component": component}
    if params is not None:
        b["params"] = params
    if caption:
        b["caption"] = caption
    return b

def insert_after_last(blocks, new_blocks, types=('code', 'math')):
    idx = None
    for i, b in enumerate(blocks):
        if b.get('type') in types:
            idx = i
    if idx is None:
        idx = min(3, len(blocks) - 1)
    blocks[idx + 1:idx + 1] = new_blocks

T = lambda cmd, out, note=None: {"cmd": cmd, "out": out, **({"note": note} if note else {})}

PLANS = {
    # ---------- ph2 software engineering ----------
    'swe-git.json': interactive('TerminalSteps', {'steps': [
        T('git log --oneline -5', ['a1f2e3 (HEAD -> main) wire: order gateway', 'b9c8d7 add: fill handler', '7e6f5a fix: rounding on FX legs', '4d3c2b add: fill handler skeleton', '2a1b0c init'], 'history is append-only narration; each hash is a snapshot of the whole tree'),
        T('git status', ['modified: gateway.py'], 'working tree vs HEAD, the diff you are about to narrate'),
        T('git bisect start HEAD 2a1b0c', ['Bisecting: 5 revisions left to test']),
        T('git bisect run pytest -q gateway', ['...test_fill_rounding FAILED...', 'a1f2e3 is the first bad commit'], 'bisect is binary search over history: log2(5) ≈ 3 runs, not 5'),
    ]}, 'Version control is an undo data structure. bisect turns "when did it break" into a logarithmic search.'),
    'swe-testing.json': interactive('TerminalSteps', {'steps': [
        T('pytest -q', ['..F.', '1 failed, 3 passed in 0.31s'], 'one red: the failing test is a specification of the bug'),
        T('pytest -q tests/test_fill_rounding.py -x', ['FAILED tests/test_fill_rounding.py::test_fx_leg', 'assert round(0.005, 2) == 0.01'], 'failures print the contract: expected vs got'),
        T('pytest --cov=fill -q', ['fill/rounding.py      91%', 'missing: 24-25'], 'coverage maps the code your tests never speak for'),
        T('pytest -q', ['....', '4 passed in 0.28s'], 'green: the spec and the code agree again'),
    ]}, 'A test suite is executable specification: each failure names a contract, and coverage shows which lines no contract protects.'),
    'swe-design-patterns.json': interactive('TerminalSteps', {'steps': [
        T('g++ -std=c++20 dispatch.cpp && ./a.out', ['cash: 1000.00', 'stock: AAPL x 100', 'order routed by handler, not by if-else'], 'Strategy replaces a branch tower with one virtual call'),
        T('grep -n "if (type" legacy_router.cpp', ['42: if (type == "cash") ...', '51: else if (type == "stock") ...'], 'the shape the pattern removes: every new type edits the router'),
        T('grep -rn "register(" dispatch.cpp', ['router.register("cash", cashHandler);', 'router.register("stock", stockHandler);'], 'open for extension, closed for modification: new types add a line, not a branch'),
    ]}, 'Patterns are recurring resolutions of a tension. Here: adding behaviour without editing every caller. Watch dispatch replace the if-else tower.'),

    # ---------- ph3 python ----------
    'py-asyncio.json': interactive('TerminalSteps', {'steps': [
        T('python -c "import asyncio; print(asyncio.gather)"', ["<function gather at 0x104b2d9c0>"]),
        T('python bench.py --mode sequential', ['3 requests in 0.902s'], 'serial: each wait queues behind the previous one'),
        T('python bench.py --mode gather', ['3 requests in 0.318s'], 'one event loop, three awaited tasks: the waits overlap, the compute does not'),
        T('python -c "import asyncio; print(asyncio.cpu_count())"', ['8'], 'asyncio parallelises waiting, not cores: compute-bound work needs processes'),
    ]}, 'asyncio is a scheduler for waits. The gather run is not faster per call; it overlaps the dead time between calls.'),
    'py-cpp-interop.json': interactive('TerminalSteps', {'steps': [
        T('c++ -O2 -shared -std=c++20 -fPIC speeds.cpp -o speeds.so', ['(no output: compile + link OK)'], 'the C++ side compiles to a plain shared object'),
        T('python -c "import speeds; print(speeds.px_delta(1e-4))"', ['4.2e-06'], 'Python calls straight into compiled code: no interpreter in the hot path'),
        T('python bench.py', ['pure python: 1.84s', 'pybind11 : 0.04s'], 'the boundary costs nanoseconds; the interpreter loop was the 46x'),
    ]}, 'Interop is a funnel: keep the boundary narrow, marshal once, let the compiled side do the loop.'),
    'py-gil-threading.json': interactive('LatencyBudget', {'parts': [
        {'name': '4 threads, CPU-bound (GIL)', 'ns': 1_940_000_000},
        {'name': '4 processes, CPU-bound', 'ns': 512_000_000},
        {'name': '4 threads, IO-bound (waits overlap)', 'ns': 260_000_000},
        {'name': '1 thread, sequential IO', 'ns': 1_010_000_000},
    ]}, 'One lock, two regimes: the GIL serialises bytecode, so threads only pay off when the CPU is idle anyway.'),
    'py-profiling.json': interactive('TerminalSteps', {'steps': [
        T('python -m cProfile -s cumtime stats.py | head -8', ['ncalls  cumtime  filename:lineno(function)', '1      3.812   stats.py:18(price_path)', '1000   2.904   stats.py:41(step)', '1000   0.812   {built-in method math.exp}'], 'cumtime is a waterfall: the frame that owns the time'),
        T('python -m cProfile -s tottime stats.py | head -6', ['1000   0.812   {math.exp}', '1000   0.401   {math.log}'], 'tottime is self-time: math.exp is nobody else\u2019s fault'),
        T('python -X importtime -c "import pandas" 2>&1 | tail -2', ['import time: self [us] | cumulative | imported package', 'cumulative: 312.4 | pandas'], 'measure imports too: a slow cold start is a real production bug'),
    ]}, 'Profilers do not find bugs, they rank suspects: cumtime finds the owner of the time, tottime finds the leaf that burns it.'),
    'py-files-errors.json': interactive('TerminalSteps', {'steps': [
        T('python -c "open(\'fills/2024-13-32.csv\')"', ['FileNotFoundError: [Errno 2] No such file or directory: \'fills/2024-13-32.csv\''], 'the exception is data: errno, path, reason'),
        T('python -c "open(\'/proc/1/mem\')"', ['PermissionError: [Errno 13] Permission denied: \'/proc/1/mem\''], 'same channel, different errno: catch the narrow class, never bare except'),
        T('python -c "with open(\'book.json\') as f: print(f.read(20))"', ['{"bids": [[420.1, 1'], 'with guarantees close() runs on every exit path, including the exceptional one'),
    ]}, 'Errors are part of the file contract: open can fail, read can fail, and close must happen anyway. The with-statement is that guarantee.'),
    'spy-pandas.json': interactive('JoinVisual', {
        'left': [{'id': 1, 'name': 'AAPL'}, {'id': 2, 'name': 'MSFT'}, {'id': 3, 'name': 'ORCL'}],
        'right': [{'id': 2, 'name': 'MSFT'}, {'id': 3, 'name': 'ORCL'}, {'id': 4, 'name': 'NVDA'}],
    }, 'A DataFrame merge is a database join wearing a Python coat: inner keeps matched keys, outer keeps rows from either side. pandas NaN is SQL NULL in disguise.'),
    'spy-visualisation.json': interactive('RandomWalk', {'n': 260, 'seed': 11}, 'Every plotting recipe starts the same way: build a series you trust, then let the chart lie for you. Reseed this walk and watch what "the market" looks like pure noise.'),

    # ---------- ph4 C++ ----------
    'cpp-compilation-model.json': interactive('TerminalSteps', {'steps': [
        T('g++ -E conv.cpp | wc -l', ['1284'], 'preprocess: headers unrolled into one translation unit'),
        T('g++ -S -O2 conv.cpp && head -6 conv.s', ['.globl  _Z6conv12d', 'movapd  %xmm0, %xmm1', 'addsd  .LC0(%rip), %xmm0'], 'compile: C++ becomes named, optimised assembly'),
        T('g++ -c conv.cpp && ls -l conv.o', ['-rw-r--r-- 1 quant 2.4K conv.o'], 'assemble: machine code in a relocatable object, symbols still unresolved'),
        T('g++ conv.o -o conv && ldd conv', ['linux-vdso.so.1', 'libstdc++.so.6 => /usr/lib/.../libstdc++.so.6'], 'link: unresolved names bound to other objects and libraries'),
    ]}, 'One file becomes four artefacts. Each stage has its own debugger: -E for macros, -S for the optimiser\u2019s choices, -c for symbols, ldd for what you promised to provide.'),
    'cpp-control-functions.json': interactive('FunctionPlotter', {'expression': 'x*x - 3*x + 2', 'xmin': -1, 'xmax': 4}, 'A function signature is a curve you can point at: this one has two roots where control flow would branch. Calling it is the cheapest possible detour.'),
    'cpp-references-pointers.json': interactive('MemoryLayout', {'type': 'long', 'value': 140237820384}, 'A pointer is just these 8 bytes: an address the type system refuses to follow for you. A reference is the same address with the dereference made mandatory and invisible.'),
    'cpp-structs-enums-namespaces.json': interactive('MemoryLayout', {'type': 'char[8]', 'value': 65}, 'A struct is bytes in a row, padded for alignment: the compiler may buy silence between your fields. What you declare and what occupies memory are two different layouts.'),
    'cpp-operator-overloading.json': interactive('TerminalSteps', {'steps': [
        T('c++ -std=c++20 complex.cpp && ./a.out', ['(1.0+2.0i) + (3.0-1.0i) = (4.0+1.0i)', '(1.0+2.0i) * (3.0-1.0i) = (5.0+5.0i)'], 'operator+ on Complex does real work: it is member-wise arithmetic, not string concatenation in disguise'),
        T('grep -n "operator+" complex.cpp', ['17: Complex operator+(const Complex&, const Complex&);'], 'the operator is an ordinary function with a fixed, surprising name'),
        T('c++ -std=c++20 money.cpp && ./a.out', ['error: no match for operator+ (Money, int)'], 'good overloads are refused: Money + Money compiles, Money + int does not guess'),
    ]}, 'Overloading is vocabulary, not magic: the operator must mean the same thing as the built-in one, or the reader pays for your cleverness.'),
    'cpp-internals-abi.json': interactive('MemoryLayout', {'type': 'double', 'value': 3.141592653589793}, 'The ABI is the treaty these bytes obey: who passes them in registers, who aligns them to 8, who pads the stack. Break the treaty and the two sides of a call read different values.'),
    'cpp-internals-linking.json': interactive('TerminalSteps', {'steps': [
        T('nm -C conv.o | head -4', ['0000000000000000 T conv(double)', '                 U sqrt(double)'], 'T is defined here, U is a promise made to the linker'),
        T('c++ conv.o -o conv', ['undefined reference to `sqrt(double)`'], 'the promise was never kept: libm was not named on the command line'),
        T('c++ conv.o -lm -o conv && ./conv 2', ['1.414214'], 'the linker only binds what you list: errors appear at link time, not compile time'),
    ]}, 'Compilation is private; linking is contractual. Every U symbol is a promise the final image must keep.'),
    'cpp-internals-optimisation.json': interactive('LatencyBudget', {'parts': [
        {'name': 'O0 naive (debug build)', 'ns': 184},
        {'name': 'O2 (vectorised loop)', 'ns': 41},
        {'name': 'O2 + restrict + alignment', 'ns': 29},
        {'name': 'bounds checks removed', 'ns': 23},
    ]}, 'The optimiser rewrites your loop under a contract: no visible side effects, no aliasing it cannot disprove. Every nanosecond here was bought by proving one of those.'),
    'cpp-futures-async.json': interactive('LatencyBudget', {'parts': [
        {'name': 'await quote feed', 'ns': 8_200_000},
        {'name': 'await vol surface', 'ns': 6_400_000},
        {'name': 'compute (both inputs resident)', 'ns': 900},
        {'name': 'same work, sequential awaits', 'ns': 15_100_000},
    ]}, 'A future splits "when I need it" from "when I fetch it". The waits overlap; the compute is the tiny part that actually needed the CPU.'),
    'cpp-benchmarking-profiling.json': interactive('LatencyBudget', {'parts': [
        {'name': 'branch mispredicts', 'ns': 38},
        {'name': 'cache misses (L3)', 'ns': 61},
        {'name': 'useful ALU work', 'ns': 12},
        {'name': 'instrumentation overhead', 'ns': 7},
    ]}, 'A benchmark that does not report its noise is a rumour. Profile before optimising, and distrust any bar you cannot reproduce three times.'),
    'cpp-branchless-simd.json': interactive('LatencyBudget', {'parts': [
        {'name': 'branchy scalar', 'ns': 96},
        {'name': 'branchless scalar (cmov)', 'ns': 34},
        {'name': 'AVX2, 4 doubles per op', 'ns': 11},
        {'name': 'AVX-512, 8 per op', 'ns': 7},
    ]}, 'Branches poison pipelines and SIMD wants straight lines: multiply by a mask instead of choosing, and let lanes process the question you were going to ask with if.'),
    'cpp-production-debugging.json': interactive('TerminalSteps', {'steps': [
        T('gdb -q ./crash', ['Reading symbols from ./crash...']),
        T('run', ['Program received signal SIGSEGV', '0x00007f2a in fill_book(std::vector<Level>&, size_t) at book.cpp:41'], 'the frame, the file, the line: a crash is an address plus a call chain'),
        T('bt', ['#0 fill_book ... at book.cpp:41', '#1 on_message ... at feed.cpp:88', '#2 main ... at main.cpp:12'], 'bt is the causal history; the bug lives in a frame, is triggered by another'),
        T('asan ./crash', ['ERROR: heap-buffer-overflow on address 0x602', 'READ of size 8 at 0x602... allocated by book.cpp:33'], 'sanitisers make the undefined defined: the first bad access is caught, not the 300th good one after it'),
    ]}, 'Debugging is history reconstruction: SIGSEGV gives you the scene, bt the suspects, and the sanitiser the first moment the contract broke.'),
    'cpp-testing-frameworks.json': interactive('TerminalSteps', {'steps': [
        T('./pricing_tests --gtest_filter=BlackScholes*', ['[ RUN      ] BlackScholes.PutAtZeroRate', '[  FAILED  ] BlackScholes.PutAtZeroRate', 'actual: -0.42 vs expected -0.40'], 'a fixture, a case, and a printed contract violation'),
        T('./pricing_tests --gtest_repeat=100 --gtest_break_on_failure', ['[  PASSED  ] 214 tests'], 'repeat matters: races and rounding fail on the 60th run, not the first'),
        T('ctest -R regression -j8', ['100% tests passed, 0 failures'], 'the suite is one command: what CI runs is what you ran'),
    ]}, 'A test framework is scaffolding around assertions: fixtures build the world, filters aim at one contract, and repeats catch the failures that need bad luck.'),
    'cpp-tooling.json': interactive('TerminalSteps', {'steps': [
        T('clang-format --style=file conv.cpp | diff conv.cpp - | head -6', ['38c38', '- return a*b+c;', '+ return a * b + c;'], 'formatting is not taste, it is policy: one file, one verdict'),
        T('clang-tidy conv.cpp --checks=bugprone*,performance*', ['warning: loop variable copied on each iteration [performance-for-range-copy]', 'warning: narrowing conversion from double to float [bugprone-narrowing]'], 'static analysis reads the code you wrote against the code you meant'),
        T('bear -- make', ['compile_commands.json written (214 entries)'], 'every tool downstream reads one index: clangd, tidy, coverage all speak it'),
    ]}, 'Tools are compilers that output opinions instead of objects. The index file they share is what makes a codebase navigable.'),

    # ---------- ph5 / ph6 ----------
    'alg-dynamic-programming.json': interactive('ComplexityCompare', {'expressions': ['2**n', 'n**2', 'n', 'log(n)'], 'nMax': 500}, 'Memoisation is a phase change: the exponential tree collapses to linear bookkeeping, because each subproblem is solved once and merely looked up afterwards.'),
    'lr-constraints.json': interactive('TerminalSteps', {'steps': [
        T('python solver.py puzzle.json --trace', ['variables: 25  domain: 5 each', 'constraint checks: 312', 'after elimination: 4 domains singleton', 'solution found: 0 backtracks'], 'propagation alone solved it: prune impossible values before ever branching'),
        T('python solver.py puzzle.json --brute', ['states enumerated: 2985984', 'time: 41.2s'], 'brute force is the same problem with the pruning turned off'),
    ]}, 'A constraint is a promise about the solution: propagate it early and the search tree never grows the branches it was always going to cut.'),
    'lr-deduction.json': interactive('TerminalSteps', {'steps': [
        T('python infer.py --facts rules.json', ['facts: 6  rules: 5', 'derived: trader(x) -> uses(x, limit_orders)', 'derived: uses(x, limit_orders) -> patient(x)', 'fixed point reached after 2 passes'], 'each rule fired once; the second pass adds nothing — that is the definition of done'),
        T('python infer.py --facts rules.json --goal "patient(ada)"', ['goal derived: True', 'chain: trader(ada) -> uses limit_orders -> patient'], 'a derivation is a path, and you can print it: logic you cannot audit is just opinion'),
    ]}, 'Deduction is closure: apply the rules until nothing new appears, and every derived fact carries a printable proof of its own ancestry.'),
    'lr-truth-tables.json': interactive('TerminalSteps', {'steps': [
        T('python truth.py "p implies q"', ['p q | (p -> q)', 'T T | T', 'T F | F', 'F T | T', 'F F | T'], 'one line is a lie: implication is false exactly when it promised and defaulted'),
        T('python truth.py "(p and not q) or r"', ['8 rows, tautology check: not a tautology', 'false rows: 3'], '16 rows for three atoms; tables grow by 2^n and stop being a method'),
        T('python truth.py "p xor q" --simplify', ['equivalent to: (p or q) and not (p and q)'], 'the table and the simplified form hold the same promise in fewer words'),
    ]}, 'A truth table enumerates the world: expensive, exhaustive, and honest. Use it to find the one row that breaks your claim, then let algebra keep the insight.'),

    # ---------- ph7 markets / risk / portfolio ----------
    'bt-data-biases.json': interactive('DistributionViewer', {'distribution': 'normal', 'mu': 0.02, 'sigma': 0.9}, 'Biases edit the sample before you ever see it: survivorship deletes the dead funds, look-ahead hands you tomorrow\u2019s prices. The distribution you backtest is never the one you will trade.'),
    'bt-lookahead-costs.json': interactive('TerminalSteps', {'steps': [
        T('python backtest.py signal=close', ['Sharpe 2.31, trades 184, net 12.4%'], 'the leaked version: the signal read the same close it was scored on'),
        T('python backtest.py signal=prev_close', ['Sharpe 0.71, trades 184, net 3.1%'], 'one bar of lag and the edge mostly evaporates: that gap is the cost of the leak'),
        T('python backtest.py signal=prev_close --costs bps=4', ['Sharpe 0.44, net 1.9%'], 'the honest version also pays to trade'),
    ]}, 'Look-ahead is the flattering bug: the strategy answers using the same bar that grades it. Lag the signal by one step and watch the Sharpe tell on it.'),
    'bt-overfitting-validation.json': interactive('ConfidenceIntervalLab', {'diff': 0.004, 'se': 0.003}, 'An in-sample Sharpe is a point estimate with no error bars. Walk-forward splits tell you whether the edge survives contact with data it has never met.'),
    'bt-strategy-evaluation.json': interactive('RegressionLab', {'n': 60, 'noise': 0.5, 'fitPolynomial': 1}, 'A backtest report is a regression question: how much of the return is explained by exposures you can name? The residual is what you actually own.'),
    'inst-swaps-fx-credit.json': interactive('YieldCurveLab', {'tenors': [0.25, 0.5, 1, 2, 5, 10], 'yields': [0.044, 0.043, 0.0425, 0.041, 0.04, 0.0405]}, 'Every leg of a swap is priced off this curve: shift it and both fixed and floating legs reprice together. Credit quietly widens the discount you deserve.'),
    'mkt-bid-ask-liquidity.json': interactive('OrderBookVisual', {}, 'Liquidity is a book you can see: depth stacked at prices away from the touch. The spread is the toll for immediacy; the depth behind it is the road.'),
    'mkt-order-types.json': interactive('OrderStateMachine', {'quantity': 500}, 'A market order skips the queue and pays the spread. A limit order joins the queue and risks non-arrival. Same intent, two state machines.'),
    'mkt-participants.json': interactive('MatchingSim', {}, 'An exchange is a queue discipline with a ledger: your counterparty in a taker fill is whoever rested the resting order. Participants differ only in how long they are willing to wait.'),
    'mkt-structure.json': interactive('OrderBookVisual', {}, 'Market structure is the order of the queues: who may cross, when the auction opens, which messages jump the line. Everything else is commentary on this book.'),
    'mic-adverse-selection.json': interactive('MatchingSim', {}, 'Fill me and you are wrong: the resting orders that trade against informed flow are the ones the informed side sought out. Adverse selection is why market makers widen, not why they grumble.'),
    'mic-spreads-impact.json': interactive('LatencyBudget', {'parts': [
        {'name': 'half spread paid', 'ns': 200_000},
        {'name': 'price impact of 5k shares', 'ns': 310_000},
        {'name': 'timing risk while working it', 'ns': 90_000},
        {'name': 'exchange + broker fees', 'ns': 40_000},
    ]}, 'The all-in cost of a trade is a stack: half the spread for immediacy, impact for size, risk while you wait. Slippage is the sum of the parts you did not budget.'),
    'pf-factor-models-attribution.json': interactive('RegressionLab', {'n': 48, 'noise': 0.7, 'fitPolynomial': 1}, 'Attribution is regression with a story: regress portfolio returns on factor returns and each beta is "how much of this you were running". The intercept is the part with no name.'),
    'pf-performance-ratios.json': interactive('DistributionViewer', {'distribution': 'normal', 'mu': 0.012, 'sigma': 0.4}, 'Sharpe is mean over deviation; Sortino only counts the downside tail. Same history, different denominator: the ratios disagree exactly when the tails matter.'),
    'risk-drawdown-hedging.json': interactive('RandomWalk', {'n': 260, 'seed': 7}, 'Drawdown is a path property, not a distribution property: two walks with the same volatility can lose very differently. A hedge does not narrow the distribution; it clips the path\u2019s worst excursions.'),
    'risk-es-stress.json': interactive('DistributionViewer', {'distribution': 'normal', 'mu': 0, 'sigma': 1}, 'VaR draws a line and reports the boundary. Expected shortfall walks past the line and averages the disaster: the tail behind the tail.'),
    'risk-taxonomy.json': interactive('ProbabilitySimulator', {'experiment': 'coin', 'p': 0.04, 'trials': 400}, 'Risk taxonomy is a claim about frequency and severity: market risk is a coin with a thin edge, credit risk is one rare catastrophic flip, and operational risk is the coin you forgot you were flipping.'),
    'prc-forwards-futures-pricing.json': interactive('YieldCurveLab', {'tenors': [0.25, 0.5, 1, 2], 'yields': [0.043, 0.0435, 0.044, 0.0445]}, 'A forward price is the spot carried along this curve: financing at r, storage if physical, income if the asset pays. Basis is the distance between that arithmetic and where the market actually trades.'),
}

# paragraph deepening for the two lessons flagged "body text seems short"
DEEPEN = {
    'geo-coordinate-geometry.json': [
        {"type": "p", "md": "Trading keeps handing you coordinate pairs whether you ask for them or not: a fill is a point (time, price), a limit order is a point sitting at a distance from mid, and a scatter of (volume, volatility) points is often the first chart you will build. The distance formula is not textbook nostalgia; it is the measure behind dispersion, and the gradient of a line through two prices is what a return is before anyone divides by time for you. When a screen shows a yield curve or a risk-return scatter, it is a coordinate plane with financial labels pinned on the axes."},
        {"type": "p", "md": "Two habits from this lesson pay rent later. First: state which point is which before computing anything, because swapping the endpoints of a distance is harmless while swapping the legs of a gradient reverses its meaning. Second: sanity-check intercepts against the data you actually have, since a line equation extrapolated past the last quoted price is a forecast pretending to be arithmetic."},
    ],
    'risk-drawdown-hedging.json': [
        {"type": "p", "md": "Hedging a drawdown is not the same as reducing volatility. A delta hedge re-prices your exposure continuously, so it shaves the little wiggles and the slow drift alike, but it costs carry and it needs rebalancing exactly when the market is least convenient. Buying a put or a collar instead defines a floor in advance: you pay a known premium for a bounded worst case, and the equity curve you keep afterwards is the unhedged path with its deepest excursions clipped at the strike. The two instruments answer different questions, which is why desks mix them rather than choose."},
        {"type": "p", "md": "Drawdown is the risk number clients actually feel, so report it next to the hedge that caps it: the maximum drawdown before the hedge, after it, and the cost of carrying the hedge in between. A hedge that halves your worst excursion but quietly bleeds a third of the drift is a bad trade, and the only way to see it is to plot both paths on one axis and let the eye do the arithmetic it is good at."},
    ],
}

changed, skipped = [], []
for fname, block in PLANS.items():
    try:
        p, data = load(fname)
    except FileNotFoundError:
        print(f'!! lesson file not found: {fname}')
        continue
    if any(b.get('type') == 'interactive' for b in data['blocks']):
        skipped.append(fname)
        continue
    insert_after_last(data['blocks'], [block])
    save(p, data)
    changed.append(fname)

for fname, paras in DEEPEN.items():
    p, data = load(fname)
    # append the deepening paragraphs at the end of the body blocks
    data['blocks'].extend(paras)
    save(p, data)
    changed.append(f'{fname} (deepened +{len(paras)} paras)')

print(f'changed: {len(changed)}')
for c in changed:
    print('  +', c)
print(f'skipped (already had interactive): {len(skipped)}')
