#!/usr/bin/env python3
"""Batch 2: deepen 8 lessons (py/numa/geo/options/microstructure/prealg/bonds)."""
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

# ---------- 1. py-profiling ----------
path, d = load('py-profiling.json')
insert_after_last(d['blocks'], [
    B("The cardinal rule of optimisation work: **measure before you touch anything**. Programmers are famously bad at guessing where time goes — the expensive line is rarely the one you suspect, and \"obvious\" optimisations routinely make things slower. The professional loop is: profile, find the top cost, fix it, profile again. Anything else is superstition."),
    B("Here is a real comparison on this machine: summing square roots of the first million integers, once as a Python loop and once through NumPy. The profile and the wall clock agree:"),
    CODE("text", "loop  version : 1 call, 0.120 s tottime  (pure Python)\nnumpy version : 6 calls, 0.010 s tottime  (arange + sqrt + sum)\n\nwall clock: loop 0.091 s  vs  numpy 0.008 s   ->  ~11x faster", "Actual cProfile output and wall-clock times from a 1-million-element run"),
    B("Read the profile the way an engineer would. The loop version spends all 120 ms *inside one function* — there is nothing to optimise except the loop itself, and the fix is not micro-tuning the Python but moving the work into C (NumPy, or a compiled extension). The NumPy profile splits into three cheap calls. The lesson generalises: **profile output tells you which layer the cost lives in, and that decides which tool you reach for.** Rewriting the loop body would have bought 10–20%; switching layers bought 11x."),
    CALLOUT("pitfall", "The observer effect is real", "cProfile adds overhead per function *call*, so it exaggerates the cost of many-cheap-calls code (function-call-heavy designs look worse than they are). For per-line detail on a hot region, drop to `line_profiler`; for honest end-to-end numbers, use `time.perf_counter()` around the whole workload and trust the wall clock over the profiler. Rule of thumb: profile to find *where*, wall-clock to prove *how much*."),
    TABLE(["Situation", "First tool", "Why"], [
        ["Unknown hotspot anywhere", "cProfile + sort_stats('cumulative')", "Whole-program call graph, zero setup"],
        ["One known hot function", "line_profiler (kernprof -l)", "Per-line cost inside the suspect"],
        ["\"Is A faster than B?\"", "timeit / perf_counter", "Nanosecond-honest microbenchmarks, warm caches"],
        ["Memory blow-up", "tracemalloc / memray", "Allocation sites, not just peak RSS"],
        ["Production latency", "py-spy (sampling, no restart)", "Attach to a live process, ~1% overhead"],
    ]),
])
save(path, d); print('  ✓ py-profiling')

# ---------- 2. spy-pandas ----------
path, d = load('spy-pandas.json')
insert_after_last(d['blocks'], [
    B("The mental model that makes pandas click: a DataFrame is a **labelled 2-D array** with aligned indexes on its rows and columns. Every operation — arithmetic, joins, window functions — aligns on those labels first and computes second. That single rule explains most pandas behaviour that looks arbitrary at first: multiply two series with different indexes and you get `NaN`s where labels do not overlap, not an error; join two frames and columns line up by *name*, not position."),
    B("A quant's daily bread is the time-series slice-and-aggregate. Here is the pattern that covers most of it, on a hypothetical minute-bar frame (numbers generated for the example):"),
    CODE("python", "import pandas as pd\nimport numpy as np\n\n# OHLCV bars indexed by timestamp\nbars = pd.DataFrame({\n    'close': [100.10, 100.14, 100.09, 100.16, 100.22, 100.19],\n}, index=pd.date_range('2026-11-09 09:30', periods=6, freq='5min'))\n\n# log returns; .shift(1) aligns each row with its predecessor by INDEX, not position\nrets = np.log(bars['close'] / bars['close'].shift(1))\n\n# rolling 3-bar realised volatility, annualised (5-min bars, 78 bars/day, 252 days)\nrv = rets.rolling(3).std() * np.sqrt(78 * 252)\n\n# resample to 15-minute bars: label = left edge of the window\nbars15 = bars['close'].resample('15min').last()"),
    B("Three habits separate robust pandas code from notebook spaghetti. **One: never loop over rows** — if you write `for i, row in df.iterrows()` you have almost always missed a vectorised formulation. **Two: be explicit about alignment** — `shift`, `rolling` and `resample` all behave according to the index, so a sorted, unique, timezone-aware DatetimeIndex is worth building *before* any analysis. **Three: chain, don't mutate** — `df.method().method()` with a copy keeps history readable; in-place mutation across cells is where silent bugs breed."),
    CALLOUT("quant", "Look-ahead bias lives in the index", "The classic research bug: computing a signal at 09:35 that uses the 09:35 *close*, then trading at 09:35. In pandas terms, `shift(1)` before you act on anything, and when you `merge`/`join`, check `how=` and the label convention of `resample` (open-left vs closed-right) like your P&L depends on it — because it does."),
])
save(path, d); print('  ✓ spy-pandas')

# ---------- 3. numa-root-finding ----------
path, d = load('numa-root-finding.json')
insert_after_last(d['blocks'], [
    B("Root-finding is where numerical analysis stops being theory and starts being engineering: you choose a method based on what you can *guarantee* about the function, not on convergence rates from a textbook table. The three methods in this lesson have honestly different contracts — bisection buys certainty with slowness, Newton buys speed with assumptions, secant is the pragmatic middle. Professional code usually runs bisection to get close, then switches."),
    STEPS("Bisection, worked by hand: $f(x) = x^3 - 2x - 5$ on $[2, 3]$", [
        "$f(2) = -1 < 0$ and $f(3) = 16 > 0$: sign change confirmed, so a root exists in $[2,3]$ (intermediate value theorem).",
        "Midpoint $2.5$: $f(2.5) = +5.625 > 0$ — root is in the left half. New bracket $[2, 2.5]$.",
        "Midpoint $2.25$: $f(2.25) = +1.891 > 0$ — left again. Bracket $[2, 2.25]$.",
        "Midpoint $2.125$: $f(2.125) = +0.346 > 0$ — bracket $[2, 2.125]$.",
        "Midpoint $2.0625$: $f(2.0625) = -0.351 < 0$ — bracket $[2.0625, 2.125]$.",
        "After 5 iterations the bracket is $[2.0625, 2.125]$, width $0.0625 = 2^{-4}$... each step halves the width, so after $n$ steps the width is exactly $2^{-n}$. The true root is $2.094551$. **The error bound is known before you start** — that is bisection's superpower.",
    ]),
    STEPS("Newton-Raphson on the same equation, $x_0 = 2$", [
        "Iteration 1: $f(2) = -1$, $f'(x) = 3x^2 - 2$ so $f'(2) = 10$. $x_1 = 2 - (-1/10) = 2.1$.",
        "Iteration 2: $f(2.1) = 0.061$, $f'(2.1) = 11.23$. $x_2 = 2.1 - 0.061/11.23 = 2.094568$.",
        "Iteration 3: $x_3 = 2.094551$ — correct to 7 decimals. **Three steps to machine precision** where bisection needed ~20 for 6 digits.",
        "The fine print: Newton converges like this only near a simple root with a healthy derivative. Near a double root (where $f' \\approx 0$ too) it crawls linearly; with a bad $x_0$ it can cycle or fly off to infinity. It also needs $f'$ — for an implied-volatility solve, that means vega, which is exactly what calibration code supplies.",
    ]),
    CALLOUT("pitfall", "Newton's failure modes are not exotic", "Try Newton on $f(x) = x^{1/3}$ from $x_0 = 1$: each step multiplies the distance from zero by $-2$ — the iterate oscillates off to infinity. The derivative $\\tfrac{1}{3}x^{-2/3}$ blows up at the root. Production solvers (including scipy's) guard with bracketing + bisection fallback for exactly this reason: hybrid beats pure."),
    TABLE(["Method", "Needs", "Guaranteed convergence", "Rate", "Use when"], [
        ["Bisection", "sign change on $[a,b]$", "yes, always", "linear (1 bit/step)", "correctness beats speed, or as a fallback"],
        ["Newton-Raphson", "$f$, $f'$, good $x_0$", "only near simple roots", "quadratic", "derivative is cheap and you start close"],
        ["Secant", "$f$, two prior points", "no", "$\\approx 1.618$", "derivative is expensive but $f$ is smooth"],
    ]),
])
save(path, d); print('  ✓ numa-root-finding')

# ---------- 4. geo-triangles-trig-ratios ----------
path, d = load('geo-triangles-trig-ratios.json')
insert_after_last(d['blocks'], [
    B("Trigonometric ratios answer one question — *given an angle in a right triangle, what is the shape?* — and the answer is three numbers that do not depend on the triangle's size. That size-independence is the whole reason the ratios matter: a 30° slope is 1 unit up per $\\sqrt{3}$ across whether the triangle is a millimetre or a kilometre. `sin`, `cos` and `tan` are the standard names for the three possible ratios of the sides."),
    TABLE(["Angle θ", "sin θ (opp/hyp)", "cos θ (adj/hyp)", "tan θ (opp/adj)"], [
        ["30°", "1/2 = 0.500", "√3/2 ≈ 0.866", "1/√3 ≈ 0.577"],
        ["45°", "√2/2 ≈ 0.707", "√2/2 ≈ 0.707", "1 exactly"],
        ["60°", "√3/2 ≈ 0.866", "1/2 = 0.500", "√3 ≈ 1.732"],
    ]),
    B("Do not memorise the table as noise — derive it from two triangles. The **45-45-90** triangle is half a square, so the legs are equal and the hypotenuse is $\\sqrt{2}$ legs: every ratio at 45° is forced. The **30-60-90** triangle is half an equilateral triangle: hypotenuse $2s$, short leg $s$, long leg $\\sqrt{3}s$ by Pythagoras — that single construction generates the entire 30/60 row. Two pictures, zero flashcards."),
    B("The ratios become tools the moment you stop thinking in degrees and start thinking in *sides you know*. Tower problem: you stand 50 m from a building and measure the elevation angle to the top as 32°. You know the adjacent side (50) and want the opposite (height $h$): $\\tan(32°) = h/50$, so $h = 50\\tan(32°) \\approx 50 \\times 0.6249 = 31.2$ m. Finance version, same skeleton: a stock at 100 with annualised volatility 20% — one standard deviation up over a year is $100 \\times 0.20 = 20$; the *ratio* view (return/volatility) is a tangent in disguise, and the Sharpe ratio is exactly this shape."),
    CALLOUT("info", "Pythagoras is the consistency check", "$\\sin^2\\theta + \\cos^2\\theta = 1$ is Pythagoras applied to the ratio triangle — the two legs over the hypotenuse must square-sum to 1. Whenever you compute both sine and cosine in a program, assert this identity as a unit test; it catches angle-unit bugs (degrees vs radians) faster than reading the numbers ever will."),
])
save(path, d); print('  ✓ geo-triangles-trig-ratios')

# ---------- 5. opt-put-call-parity ----------
path, d = load('opt-put-call-parity.json')
insert_after_last(d['blocks'], [
    B("Put-call parity is the first genuinely load-bearing result in derivatives: one equation, no model, no volatility input, true by arbitrage alone. It says a call, a put, the stock and a bond are four instruments with only three degrees of freedom — buy any three in the right proportions and you have manufactured the fourth. Desks quote conversions and reversals off this line daily; when it holds to the tick, the market is consistent, and when it does not, either money is on the table or your inputs (rate, dividends) are wrong."),
    STEPS("Worked parity check: S=100, K=95, r=5%, T=0.5", [
        "Present value of the strike: $Ke^{-rT} = 95\\,e^{-0.05 \\times 0.5} = 95 \\times 0.98758 = 93.7205$... at half a year: $95\\,e^{-0.025} = 92.6544$.",
        "Parity: $C - P = S - Ke^{-rT} = 100 - 92.6544 = 7.3456$. Note what is *absent*: no volatility, no normal distribution, no Black-Scholes machinery. The spread between call and put prices is fixed by cash-and-carry arithmetic.",
        "Suppose the put trades at 3.00. Then the call must trade at $3.00 + 7.3456 = 10.3456$.",
        "If instead the call is quoted at 10.00 (0.35 cheap), the arbitrage is a **conversion**: buy call, sell put, short stock, lend 92.6544. At expiry the options combine into a forced sale of the stock at 95, the loan returns exactly 95, and the stock position is covered — you pocket 0.3456 today with zero future exposure.",
        "Where does it break in practice? Early exercise (American options), dividends you did not model, borrow costs on the short leg, and the width of the bid-ask you must cross to put the package on. The parity *band* around the theoretical line is exactly those frictions priced honestly.",
    ]),
    CALLOUT("quant", "Why interviewers love this question", "Parity separates candidates who memorised Black-Scholes from those who understand replication. If you can derive $C - P = S - Ke^{-rT}$ from two portfolios that pay the same at expiry (long call + bond vs long put + stock), you can also explain why a delta of 1 deep ITM is not a coincidence and why synthetic positions are just balance-sheet moves."),
])
save(path, d); print('  ✓ opt-put-call-parity')

# ---------- 6. mic-spreads-impact ----------
path, d = load('mic-spreads-impact.json')
insert_after_last(d['blocks'], [
    B("The bid-ask spread is the market's explicit price for immediacy: you can pay it (cross the spread) or you can earn it (provide liquidity and wait). Everything else in transaction-cost analysis is a refinement of this single trade-off. Start with the arithmetic, then the incentives, then the impact — in that order, because each layer explains the noise you will see in the next."),
    STEPS("The cost of crossing, on real-size numbers", [
        "A liquid future trades at 100.00 bid / 100.02 ask: a 2-cent spread on a 100 notional = **2 basis points**.",
        "A market order to buy 10 million notional crosses the ask. Half-spread paid: $10{,}000{,}000 \\times 0.0002 / 2 = \\$1{,}000$. That is the *instantaneous* cost — the moment the trade prints, the mid has not moved and you are already down 1,000.",
        "A strategy doing this 100 times a day, 250 days a year, hands over $\\$1{,}000 \\times 100 \\times 250 = \\$25{,}000{,}000$ a year in spread alone. A backtest that ignored this shows a profitable year; the live P&L shows a slow bleed.",
        "Now the provider's side: the passive limit order that filled you *earned* that 1,000 — but only if the market did not move away from it (adverse selection). If filling you reliably costs more than 1,000 in adverse moves, the spread widens until it doesn't. Spreads are set by this equilibrium, not by greed.",
    ]),
    B("Market impact is the second cost, and it is not linear. Crossing the spread gets you the displayed size; beyond that you consume depth at worse prices (the *walk* up the book), and beyond the book you move the price itself. The square-root law — impact $\\approx \\sigma\\sqrt{Q/V}$ — is the industry's rough empirical rule: doubling your participation costs about 1.4x, not 2x, and trading 1% of volume costs roughly 1% of a daily vol. It is a law of thumb, not physics, but it is the right order of magnitude for sizing what your order will do."),
    CALLOUT("pitfall", "The spread you see is not the spread you pay", "Displayed midpoint assumes the book is honest. Your order arrives with information (that is why you are trading), and the book knows it: quotes fade, or the mid was stale. Effective spread paid = $2|P_{exec} - M_{post}|$, measured against the mid a moment *after* your fill. Execution desks live on this number, and it is always worse than the pre-trade screenshot."),
])
save(path, d); print('  ✓ mic-spreads-impact')

# ---------- 7. prealg-word-problems ----------
path, d = load('prealg-word-problems.json')
insert_after_last(d['blocks'], [
    B("A word problem is a translation exercise: English in, algebra out. The resistance most people feel is not mathematical — it is that nobody taught translation as an explicit, mechanical skill. You are going to learn it as one: find the quantity being asked about, name it with a letter, and then convert each sentence into a statement about that letter. The algebra afterwards is almost always easier than the translation."),
    STEPS("Translation, demonstrated end to end", [
        "**The problem.** A desk's daily P&L was negative for three straight days. The losses were 2 million, 1.5 million and 0.7 million, then two winning days brought the week's total to a gain of 0.4 million. What was the combined profit on the two winning days?",
        "**Name the unknown.** Let $w$ = combined profit of the two winning days (millions). One letter, one meaning — do not introduce a second letter for something expressible through the first.",
        "**Translate sentence by sentence.** Week total = losses + wins: $(-2) + (-1.5) + (-0.7) + w = +0.4$.",
        "**Solve.** $w = 0.4 + 4.2 = 4.6$. The two winning days together made 4.6 million.",
        "**Sanity-check against the story, not just the algebra.** Three losses totalling 4.2 million against wins of 4.6 million leaves +0.4 million ✓. The number is believable; the units are millions throughout; the sign of the answer matches the story (a profit). All three checks pass, so the translation — not just the arithmetic — is right.",
    ]),
    B("The failure modes are systematic, so the defences can be too. **Units drift**: mixing thousands with millions silently; defence — carry units in every line, convert once, up front. **The wrong unknown**: answering the wrong letter; defence — write *explicitly* what the letter means before using it. **Sign errors in stories**: \"a loss of 2\" is $-2$, \"three times fewer\" is $x/3$ not $3x$; defence — re-read each translated line against the original sentence, asking *does this say the same thing in symbols?* That last habit, slow at first, is what eventually makes translation automatic."),
    CALLOUT("info", "Why finance interviews lean on this", "Every brainteaser of the form \"a stock falls 50% then rises 50%...\" is a translation test under time pressure. The candidates who write the equation ( $1 \\to 0.5 \\to 0.75$ ) walk through it; the ones who pattern-match \"falls then rises the same, so back to even\" fail. The discipline you build here is exactly the interview skill — and the daily skill of turning a trader's request into a specification."),
])
save(path, d); print('  ✓ prealg-word-problems')

# ---------- 8. inst-bonds-overview ----------
path, d = load('inst-bonds-overview.json')
insert_after_last(d['blocks'], [
    B("Governments issue bonds for the same reason corporations do: to spend before taxing, and to term out funding so it does not all come due at once. For a quant, the government curve is not just another asset class — it is the **discounting backbone** of every other valuation on the desk. Equity futures, swaps, options, repo trades: all of them reference a curve that starts here. That is why T-bill and bond mechanics deserve first-class attention rather than a passing nod."),
    STEPS("T-bill arithmetic, worked: 90-day bill at 98", [
        "A T-bill pays no coupons: you pay the price today, receive face (100) at maturity. Quoted here at 98 per 100 face with 90 days remaining.",
        "**Discount yield** (the legacy money-market convention): $(100 - 98)/100 \\times 360/90 = 0.02 \\times 4 = 8.00\\%$. Note the two anachronisms the convention carries: the gain is measured against *face* (not your cost), and the year is 360 days.",
        "**Bond-equivalent yield** (the honest comparison): $(100 - 98)/98 \\times 365/90 = 0.020408 \\times 4.0556 = 8.277\\%$. Measured against the price you actually paid, with the calendar year you actually live in.",
        "The 27.7 basis-point gap is pure convention, not extra money. When someone quotes money-market instruments against bond yields, this is the conversion being (or not being) done — desks have lost real basis points comparing 8.00 to 8.10 across incompatible conventions.",
    ]),
    TABLE(["Instrument", "Coupon", "Maturity", "Quoting convention", "Credit story"], [
        ["T-bill", "none (discount)", "≤ 1 year", "discount yield, 360-day", "full faith and credit"],
        ["T-note", "semi-annual", "2–10 years", "clean price + accrued", "same sovereign backing"],
        ["T-bond", "semi-annual", "> 10 years (to 30)", "clean price + accrued", "same sovereign backing"],
        ["STRIPS", "none (zero-coupon)", "any coupon stripped", "yield on discount", "created from Treasuries"],
    ]),
    B("The clean/dirty distinction earns its keep the first time you settle a trade. Between coupon dates, the seller has accrued interest they are owed but will not receive — the next coupon goes entirely to the buyer. So the invoice price is the quoted *clean* price plus *accrued* interest, computed pro-rata on the coupon period. Charts plot clean prices (so the price does not sawtooth down every coupon date); invoices use dirty. Confusing the two is a classic settlement-desk error, and the reconciliation report will find you."),
    CALLOUT("quant", "Why the discount curve starts here", "A T-bill is the closest thing to a riskless zero-coupon instrument that exists, so its price *is* a discount factor: paying 98 today for 100 in 90 days means $D(0, 0.25) = 0.98$ — no model required. Every curve-fitting method you will meet later is a way of interpolating and smoothing these primitive discount factors into a continuous, arbitrage-free function. The instruments are the raw data; the curve is engineering."),
])
save(path, d); print('  ✓ inst-bonds-overview')

print('\nBatch 2 complete.')
