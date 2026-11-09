#!/usr/bin/env python3
"""Add two new portfolio projects: volatility surface builder, execution analyser."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, 'content', 'projects')

def write(d):
    p = os.path.join(PDIR, d['slug'] + '.json')
    with open(p, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"  ✓ {d['slug']} ({len(d['milestones'])} milestones, {len(d['starterFiles'])} starter files)")

write({
    "slug": "volatility-surface-builder",
    "order": 11,
    "title": "Volatility Surface Builder and Arbitrage Checker",
    "language": "python",
    "difficulty": "advanced",
    "prereqLessons": ["opt-black-scholes", "prc-calibration-validation", "opt-volatility-smile", "spy-numpy", "spy-pandas"],
    "context": "Every derivatives desk and every serious options-adjacent interview involves the volatility surface: implied vol as a function of strike and expiry. Building one end-to-end — from raw option quotes to a smooth, arbitrage-checked, interpolable surface — exercises numerical root-finding, market conventions, data pipelining and the honest handling of illiquid quotes. The result is a genuine portfolio piece: the same code a desk's infra team writes in miniature, with the corners cut visibly labelled.",
    "problem": "Given a table of option quotes (strike, expiry, bid, ask, type) on a single underlying, build the implied-volatility surface: (1) invert Black-Scholes per quote with a bracketed, hybrid solver; (2) construct a parameterised fit in (log-moneyness, expiry) that is smooth by construction; (3) verify no static arbitrage — no negative call butterflies (convexity in strike) and no negative calendar spreads (forward variance non-negativity); (4) expose a clean API: `surface.vol(strike, expiry)` interpolated at arbitrary points, with documented error behaviour outside the quoted range. Handle quotes with zero or crossed markets honestly (skip, never invent).",
    "requirements": [
        "Implied-vol inversion: bisection to a bracket, then Newton with vega as derivative; documented convergence criteria and a hard iteration cap",
        "Mid-quote input with a minimum-spread filter; quotes wider than a configurable threshold are excluded and logged",
        "Surface fit: your choice of SVI parameterisation per slice (recommended) or a quadratic-in-log-moneyness baseline — but the arbitrage checks must run on the fitted surface, not the raw points",
        "Static-arbitrage checks: butterfly (second derivative of call price in strike ≥ 0) and calendar (total variance non-decreasing in expiry at fixed forward moneyness); violations reported with locations, not silently patched",
        "Interpolation in expiry: linear in total variance (the standard convention) with the reasoning documented",
        "A CLI that takes a quotes CSV and an output path, and prints an arbitrage report plus summary statistics",
        "Reproducible demo: a bundled synthetic quote set (generated, clearly labelled) that exercises every code path",
    ],
    "milestones": [
        {"title": "Core pricing and inversion", "detail": "Black-Scholes price + vega; hybrid bisection/Newton solver with tests on known round-trips (vol in → price → vol out, to 1e-8).", "estHours": 6},
        {"title": "Quote ingestion and hygiene", "detail": "CSV parsing, mid/spread logic, exclusion filters, logging of excluded quotes with reasons.", "estHours": 4},
        {"title": "Single-slice fit", "detail": "One expiry: SVI (or quadratic) fit with a documented optimiser choice; plot fitted vs quoted vols for the report.", "estHours": 8},
        {"title": "Arbitrage checks", "detail": "Butterfly and calendar tests on the fitted surface; violation report format; unit tests with a deliberately violating surface.", "estHours": 7},
        {"title": "Surface assembly and interpolation", "detail": "Per-slice fits joined by total-variance interpolation in expiry; `vol(K, T)` API with out-of-range policy.", "estHours": 5},
        {"title": "CLI, demo data, write-up", "detail": "Command-line entry point, synthetic demo dataset, README with methodology and known limitations.", "estHours": 5},
    ],
    "designGuidance": [
        {"type": "p", "md": "Structure the solver as a pure function `(quote, S, r, T) -> vol | None` so it can be vectorised or parallelised later without touching the fit layer."},
        {"type": "p", "md": "Resist the temptation to interpolate implied vol directly in expiry: variance (or total variance) is the quantity that behaves linearly; the lesson material covers why."},
        {"type": "p", "md": "Decide the out-of-range policy early and document it — extrapolated vols from an SVI fit can be nonsense; clamping, erroring and extrapolating-with-a-warning are all defensible, silence is not."},
        {"type": "callout", "variant": "pitfall", "title": "The arbitrage you must not patch away", "md": "When the checks fail, the temptation is to smooth harder until they pass. That hides the information: a genuine arbitrage in the fitted surface usually means a bad quote or a bad parameterisation, and the correct output is a *report*. Trading desks pay for the honest version."},
    ],
    "starterFiles": [
        {"path": "README.md", "content": "# Volatility Surface Builder\n\nBuilds an implied-vol surface from option quotes, checks static arbitrage,\nand exposes `Surface.vol(strike, expiry)`.\n\n## Milestones — see project spec\n1. Core pricing + inversion\n2. Quote ingestion\n3. Single-slice fit\n4. Arbitrage checks\n5. Surface assembly\n6. CLI + demo\n\n## Honest-decisions log\nKeep every judgement call here with a one-line reason."},
        {"path": "volsurface/pricing.py", "content": "\"\"\"Black-Scholes pricing, vega, and implied-vol inversion.\n\nMilestone 1: implement price(), vega(), and implied_vol().\nRequirements: hybrid bisection+Newton, 1e-8 convergence on round-trips,\nhard iteration cap with a clear failure return (None), never an exception\nfor ordinary market inputs.\n\"\"\"\nimport math\n\n\ndef price(S, K, r, sigma, T, is_call=True):\n    raise NotImplementedError\n\n\ndef vega(S, K, r, sigma, T):\n    raise NotImplementedError\n\n\ndef implied_vol(target_price, S, K, r, T, is_call=True):\n    \"\"\"Invert price() for sigma. Hybrid solver. Returns None on failure.\"\"\"\n    raise NotImplementedError\n"},
        {"path": "volsurface/ingest.py", "content": "\"\"\"Quote ingestion and hygiene.\n\nMilestone 2: CSV -> clean mid vols. Exclusions are logged with reasons:\nzero bid, crossed market, spread wider than max_spread_frac of mid.\n\"\"\"\n\n\ndef load_quotes(path, max_spread_frac=0.25):\n    raise NotImplementedError\n"},
        {"path": "volsurface/fit.py", "content": "\"\"\"Slice fitting and arbitrage checks.\n\nMilestone 3-4: fit one expiry slice (SVI recommended:\nsigma^2(k) = a + b*(rho*(k-m) + sqrt((k-m)^2 + s^2)))\nthen run butterfly + calendar checks on the fitted surface.\n\"\"\"\n\n\ndef fit_slice(strikes, vols, forwards):\n    raise NotImplementedError\n\n\ndef check_butterfly(surface, expiry):\n    raise NotImplementedError\n\n\ndef check_calendar(surface):\n    raise NotImplementedError\n"},
    ],
    "evaluationCriteria": [
        {"criterion": "Solver correctness and robustness (round-trip tests, failure handling)", "weight": 20},
        {"criterion": "Quote hygiene: exclusions justified and logged, never invented", "weight": 15},
        {"criterion": "Fit quality: sensible residuals, parameters in sane ranges", "weight": 20},
        {"criterion": "Arbitrage checks correct and *reported*, not patched", "weight": 20},
        {"criterion": "API design: vol(K, T) contract, out-of-range policy documented", "weight": 10},
        {"criterion": "Reproducibility: demo runs from clean checkout; decisions logged", "weight": 15},
    ],
    "documentationRequirements": [
        "Methodology: choice of parameterisation, optimiser, and interpolation convention with one-paragraph justifications",
        "Arbitrage report format documented, with example output",
        "Known limitations: extrapolation behaviour, liquidity assumptions, data hygiene scope",
        "The honest-decisions log maintained from day one",
    ],
    "extensionChallenges": [
        "Fit the surface with a no-arbitrage constraint built into the parameterisation (e.g. gauge-rest bounded SVI) and compare fit quality against the unconstrained version",
        "Add time-slice weighting by open interest and show the effect on the surface's wings",
        "Compute a vega-weighted P&L attribution for a small option book using your surface vs a flat-vol baseline",
        "Port the hot path (solver) to C++ with a pybind11 binding and benchmark the crossing cost",
    ],
})

write({
    "slug": "execution-analysis",
    "order": 12,
    "title": "Execution Quality Analyser (TCA in Miniature)",
    "language": "python",
    "difficulty": "advanced",
    "prereqLessons": ["mic-order-books", "mic-spreads-impact", "bt-lookahead-costs", "spy-pandas", "spy-visualisation"],
    "context": "Transaction-cost analysis (TCA) is the meeting point of microstructure theory and data engineering: take a record of your own orders and fills plus the market data around them, and answer the desk's question — *what did our trading actually cost us, and why?* Building a small but honest TCA tool is one of the most portfolio-relevant projects available: it demonstrates you can define a cost benchmark defensibly, align messy event streams, and refuse to average away the distribution. Every buy-side firm and every execution desk runs a version of this.",
    "problem": "Given (a) an order/fill event log (parent orders, child executions, cancels) and (b) a trade-and-quote (TAQ) stream for the same session, compute per-order and aggregate execution quality: arrival-price slippage, implementation-shortfall decomposition (timing vs execution cost), effective vs quoted spread, fill-rate and cancel statistics, and market-impact estimates binned by participation. Produce a per-order report and a session summary with distributions (not just means), and flag the orders whose benchmarks disagree suspiciously — measurement bugs and real anomalies both live there.",
    "requirements": [
        "Event alignment: orders, fills and TAQ joined on instrument with explicit, documented timestamp semantics (what arrival means, what the benchmark window is)",
        "Benchmarks: arrival mid, arrival price, VWAP over the order's life, and implementation shortfall with its standard decomposition — each defined in a docstring before it is coded",
        "Effective spread computed against the *post-trade* mid, with the reason documented",
        "Distribution-first reporting: p50/p90/p99 alongside means; a session report that shows histograms, not just tables",
        "Participation-binned impact analysis with honest sample counts per bin",
        "A synthetic demo generator (clearly labelled) producing a session with known planted costs, so the tool's numbers can be verified against ground truth",
        "Flags for pathological cases: benchmark disagreement beyond a threshold, fills outside the quoted spread, clock skew between streams",
    ],
    "milestones": [
        {"title": "Schemas and alignment", "detail": "Define event schemas; implement the join of orders/fills/TAQ on instrument+time with the timestamp policy written down first.", "estHours": 6},
        {"title": "Benchmark library", "detail": "Arrival mid/price, VWAP, implementation shortfall + decomposition; unit tests on hand-computed cases.", "estHours": 8},
        {"title": "Spread and impact metrics", "detail": "Effective vs quoted spread; participation-binned impact with sample counts.", "estHours": 7},
        {"title": "Reporting layer", "detail": "Per-order report, session summary with distributions, the two required figures (slippage histogram, impact-vs-participation).", "estHours": 6},
        {"title": "Demo generator and verification", "detail": "Synthetic session with planted costs; verify the tool recovers them within tolerance.", "estHours": 5},
        {"title": "Anomaly flags and write-up", "detail": "Pathological-case flags; README with definitions, policy choices and limitations.", "estHours": 4},
    ],
    "designGuidance": [
        {"type": "p", "md": "Write every benchmark definition (arrival price, IS decomposition) in a docstring *before* implementing it — these definitions are the product; the code merely evaluates them."},
        {"type": "p", "md": "The planted-costs demo generator is not optional polish: it is your only ground truth. Design it first, verify continuously against it."},
        {"type": "callout", "variant": "pitfall", "title": "Averages hide the story", "md": "The mean slippage of a session where half the orders were perfect and half were disasters is a number that describes neither group. Report distributions, and when a reviewer asks 'what did trading cost us', the honest answer is a histogram plus a sentence about the tail — the tool should make that the default output, not an appendix."},
    ],
    "starterFiles": [
        {"path": "README.md", "content": "# Execution Quality Analyser\n\nMiniature TCA: benchmarks, decomposition, distributions, flags.\n\n## Milestones\n1. Schemas and alignment\n2. Benchmark library\n3. Spread and impact\n4. Reporting\n5. Demo + verification\n6. Flags + write-up\n\n## Definition register\nEvery benchmark gets its definition here BEFORE it is coded."},
        {"path": "tca/align.py", "content": "\"\"\"Event alignment: orders + fills + TAQ.\n\nMilestone 1. Timestamp policy (document here FIRST):\n- arrival = parent order first message timestamp\n- benchmark window = [arrival, last child terminal state]\n- clock-skew tolerance = configurable; flag, don't fix silently\n\"\"\"\n\n\ndef align(orders, fills, taq, skew_tolerance_ms=50):\n    raise NotImplementedError\n"},
        {"path": "tca/benchmarks.py", "content": "\"\"\"Cost benchmarks.\n\nMilestone 2. Define each in its docstring, then implement:\n- arrival_mid_slippage: ...\n- arrival_price_shortfall: ...\n- vwap_shortfall: ...\n- implementation_shortfall: decomposition into timing + execution cost\n\"\"\"\n\n\ndef arrival_mid_slippage(order, taq):\n    raise NotImplementedError\n\n\ndef implementation_shortfall(order, fills, taq, decision_price):\n    raise NotImplementedError\n"},
        {"path": "tca/report.py", "content": "\"\"\"Reporting: per-order table, session summary with DISTRIBUTIONS.\n\nMilestone 4. The session report must include p50/p90/p99 for every\nheadline metric, plus histograms. Means alone do not ship.\n\"\"\"\n"},
    ],
    "evaluationCriteria": [
        {"criterion": "Benchmark definitions: precise, standard, documented before coding", "weight": 25},
        {"criterion": "Alignment correctness incl. timestamp policy and skew flags", "weight": 20},
        {"criterion": "Distribution-first reporting (percentiles + histograms, not means)", "weight": 20},
        {"criterion": "Ground-truth verification against the planted-costs demo", "weight": 20},
        {"criterion": "Honest flags: pathological cases surfaced, not smoothed", "weight": 15},
    ],
    "documentationRequirements": [
        "The definition register: every benchmark with its formula and policy choices",
        "Timestamp/alignment policy and its failure modes",
        "Demo verification: planted costs vs recovered costs, with numbers",
        "Known limitations: what this tool cannot conclude from this data",
    ],
    "extensionChallenges": [
        "Add a market-impact regression (log-impact vs log-participation) and compare its predictions with the binned analysis",
        "Sector-style venue comparison: fill quality by executing venue with sample-size honesty",
        "Implement arrival-price benchmarks using stable historical vols for risk-adjusted slippage",
        "Stream the analysis (incremental, memory-bounded) instead of batch, and document the changed semantics",
    ],
})

print('\n2 projects added.')
