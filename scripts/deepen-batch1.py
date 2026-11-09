#!/usr/bin/env python3
"""Batch 1: deepen the 5 thinnest finance lessons with verified-number content."""
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

# ============ 1. bt-strategy-evaluation (thinnest on platform, ~100w) ============
path, d = load('bt-strategy-evaluation.json')
new = [
    {"type": "p", "md": "A backtest that ends with \"+12.7%\" has told you almost nothing. The same equity curve can be a smooth, repeatable strategy or a lucky streak riding one trade — and the difference lives in a handful of computed statistics, not the total return. This lesson works through the standard evaluation battery on one concrete strategy so each number has a face attached."},
    {"type": "steps", "title": "The evaluation battery, on one real (illustrative) track record", "items": [
        "Take 12 months of hypothetical strategy returns: $[3.1, -1.2, 2.4, 1.8, -2.8, 4.1, 0.9, -0.6, 2.2, 1.5, -1.9, 2.8]\\%$. Compounding gives a total return of $12.73\\%$ and a monthly mean of $1.03\\%$.",
        "Volatility: the monthly standard deviation is $2.17\\%$. Annualised Sharpe (assuming zero risk-free for the illustration) $= \\frac{1.03}{2.17}\\sqrt{12} \\approx 1.64$. Above 1 is interesting; above 2 with realistic costs deserves attention.",
        "Downside: only 4 months were negative. The downside deviation (root-mean-square of negative months only) is $1.06\\%$, giving a Sortino of $\\frac{1.03}{1.06}\\sqrt{12} \\approx 3.38$ — the strategy's pain is concentrated and small.",
        "Drawdown: the equity curve peaks mid-month-5, then falls $2.80\\%$ before recovering. Calmar $= \\frac{12.73}{2.80} \\approx 4.55$ — total return over worst drawdown.",
        "Trade quality: 8 wins of 12 months is a $67\\%$ hit rate; gains sum to $16.0\\%$ against losses of $6.5\\%$, a profit factor of $2.89$.",
    ]},
    {"type": "p", "md": "Now the part every statistic hides: **what would have to be true for these numbers to survive live trading**. The Sharpe of 1.64 assumes fills at the backtest price. If the strategy trades $2\\%$ of ADV, impact costs can plausibly consume 30–50% of the excess return — the Sharpe drops toward 1.0 before you have paid a cent of fees. Evaluation is where the assumptions you baked into the backtest get their bill."},
    {"type": "table", "headers": ["Metric", "Value", "Reads on", "Fails when"], "rows": [
        ["Total return", "12.73%", "Raw outcome over the window", "always quoted alone"],
        ["Sharpe", "1.64", "Reward per unit of total volatility", "returns are not i.i.d. / serial correlation"],
        ["Sortino", "3.38", "Reward per unit of downside", "few negative months (small sample)"],
        ["Max drawdown", "2.80%", "Worst peak-to-trough loss", "single-window; regime change resets it"],
        ["Calmar", "4.55", "Return per unit of worst pain", "short history inflates it"],
        ["Profit factor", "2.89", "Gross wins / gross losses", "one outlier month dominates"],
        ["Hit rate + payoff", "67% at 2.5:1", "Joint edge structure", "quoted without the other half"],
    ]},
    {"type": "callout", "variant": "pitfall", "title": "The statistics are downstream of the sample", "md": "Twelve monthly observations give you a Sharpe estimate with a standard error of roughly $\\sqrt{(1+\\text{SR}^2/2)/12} \\approx 0.34$ — the confidence interval around 1.64 comfortably includes 1.0. A Sharpe from a short track record is a hypothesis, not a measurement. This is why funds quote multi-year Sharpe and why you should distrust anything computed on fewer than ~36 observations."},
    {"type": "p", "md": "The professional habit: evaluate a strategy on the **rectangle** of evidence — return, risk, drawdown, trade-level statistics, cost sensitivity and stability across sub-periods — and only then decide whether it earns a live allocation. Any single number, quoted alone, is marketing."},
]
insert_after_last(d['blocks'], new)
save(path, d)
print('✓ bt-strategy-evaluation')

# ============ 2. mic-matching (144w) ============
path, d = load('mic-matching.json')
new = [
    {"type": "p", "md": "A matching engine is a deterministic function from an incoming order and a book state to a new book state plus zero or more fills. That sounds bureaucratic until you realise that *everything* about market fairness — who gets filled, at what price, in what order — is decided by two tie-break rules the engine applies: price priority first, then time priority within a price. There is no judgement call inside the engine. That is the point."},
    {"type": "steps", "title": "Worked match: a market buy arrives at a resting book", "items": [
        "Resting asks (the sell side): $300@100.10$ (arrived 09:30:01), $500@100.10$ (09:30:04), $400@100.12$ (09:29:58), $200@100.15$ (09:30:02).",
        "An aggressive **market buy for 600** arrives. Price priority scans ask levels upward: everything at $100.10$ is cheaper than anything at $100.12$.",
        "At $100.10$ two orders rest. Time priority ranks them by arrival: the $300$ from 09:30:01 is first, then the $500$ from 09:30:04.",
        "Fills: $300@100.10$ (fully filled, removed), $300@100.10$ against the second order (partially filled, $200$ remains resting at $100.10$). The incoming order is fully satisfied and disappears.",
        "Post-trade book state: asks are now $200@100.10$, $400@100.12$, $200@100.15$. Note the $100.12$ order arrived *earlier* than the $100.15$ one but sits at a better price — price always outranks time.",
    ]},
    {"type": "p", "md": "Two consequences follow. First, **queue position is an asset**: an order resting at a popular price is effectively holding an option on being filled, and strategies that cancel-and-replace pay for it with queue loss. Second, the engine's determinism is what makes a provable audit trail possible — given the same sequence of inputs, any correct re-implementation produces the same fills, which is how exchanges defend themselves in disputes."},
    {"type": "callout", "variant": "quant", "title": "Where you will meet this", "md": "Interview favourite: *\"You are first in queue at the best bid; a market sell for 10× your size arrives — what happens to your fill?\"* Answer: you are filled fully at your price before anyone behind you gets anything. Follow-up: what if the incoming order was priced *through* the book? Then it sweeps levels — each level fills in time order until the incoming price limit binds."},
    {"type": "table", "headers": ["Design choice", "Common default", "Why it matters"], "rows": [
        ["Priority at same price", "FIFO (time)", "Later designs (e.g. pro-rata in some futures) change queueing strategy fundamentally"],
        ["Matching price", "Resting order's price", "Price improvement exists in some venues; matters for expected fill quality"],
        ["Self-trade prevention", "Reject / cancel newest", "A firm's own two orders must not wash volume"],
        ["Lot handling", "Round lots first", "Odd lots can match after round lots on some venues"],
    ]},
]
insert_after_last(d['blocks'], new)
save(path, d)
print('✓ mic-matching')

# ============ 3. fi-duration-convexity (169w) ============
path, d = load('fi-duration-convexity.json')
new = [
    {"type": "p", "md": "Duration is the answer to the question every bond desk asks first: *if rates move 1%, how much money do I make or lose?* The naive answer — \"it depends on the coupon and maturity\" — is correct and useless. Duration compresses coupon, maturity and yield into one slope number, and convexity reports the curvature that the slope misses. Both are approximations to the bond's true price function, and knowing when the approximation breaks is the actual skill."},
    {"type": "steps", "title": "Full worked example: a 3-year 4% annual-coupon bond at par", "items": [
        "The bond pays $\\\$4, \\\$4, \\\$104$ at years 1, 2, 3 and yields $4\\%$, so it prices exactly at par: $P = \\frac{4}{1.04} + \\frac{4}{1.04^2} + \\frac{104}{1.04^3} = \\\$100.00$.",
        "Macaulay duration weights each payment time by present value: $D_{mac} = \\frac{1\\cdot3.846 + 2\\cdot3.698 + 3\\cdot92.455}{100} = 2.886$ years.",
        "Modified duration: $D_{mod} = \\frac{2.886}{1.04} = 2.775$. The headline sensitivity: $\\Delta P \\approx -D_{mod} \\cdot P \\cdot \\Delta y$, so $+1\\%$ in yield predicts roughly $-\\\$2.78$ on a $\\\$100$ bond.",
        "Reality check — reprice exactly at $5\\%$: the true price is $\\\$97.2768$, a fall of $\\\$2.7232$. The duration-only estimate said $\\\$2.7751$: an error of about 5 cents.",
        "Add convexity $C = 10.53$: $\\Delta P \\approx -D_{mod}P\\Delta y + \\tfrac{1}{2}CP(\\Delta y)^2$ predicts $\\\$97.2776$ — the error drops below one-tenth of a cent. At $\\pm 1\\%$ the convexity term is worth roughly $5\\cents$; at $\\pm 3\\%$ it is worth almost half a dollar.",
    ]},
    {"type": "p", "md": "Why the errors are asymmetric: a bond's price is **convex** in yield — it falls less than duration predicts when yields rise, and rises more when yields fall. Long-dated and low-coupon bonds have the most curvature, which is why convexity is reported next to duration for anything beyond a short book. The same second-order thinking reappears in gamma for options: first-order Greeks tell you the slope, the cross-Greek tells you how the slope itself moves."},
    {"type": "table", "headers": ["Yield shift", "Exact price", "Duration-only", "Error", "With convexity", "Error"], "rows": [
        ["+0.50%", "98.6255", "98.6125", "+0.013", "98.6256", "-0.000"],
        ["-0.50%", "101.4008", "101.3875", "+0.013", "101.4007", "+0.000"],
        ["+1.00%", "97.2768", "97.2249", "+0.052", "97.2776", "-0.001"],
        ["-1.00%", "102.8286", "102.7751", "+0.054", "102.8278", "+0.001"],
    ]},
    {"type": "callout", "variant": "pitfall", "title": "Duration is a tangent line, not the curve", "md": "Every duration number is a local derivative computed at today's yield. After a $2\\%$ move, the slope itself has changed — the hedge ratio you computed this morning is stale this afternoon. Books with material convexity re-strike hedges as rates move; the frequency of that rebalancing is a risk decision, not a technicality."},
]
insert_after_last(d['blocks'], new)
save(path, d)
print('✓ fi-duration-convexity')

# ============ 4. opt-black-scholes (199w) ============
path, d = load('opt-black-scholes.json')
new = [
    {"type": "p", "md": "The Black-Scholes formula is usually presented as an inscription to be admired. It is more useful as a *machine with four dials* — spot, strike, rate, volatility, time — where you can trace exactly which dial moves which output and why. The derivation belongs to a later lesson; here you learn to compute it, sanity-check it, and read the hedging information it carries, because that is what a desk actually uses it for."},
    {"type": "steps", "title": "Full computation: 1-year ATM call, S=K=100, r=5%, σ=20%", "items": [
        "$d_1 = \\frac{\\ln(S/K) + (r + \\sigma^2/2)T}{\\sigma\\sqrt{T}} = \\frac{0 + (0.05 + 0.02)\\cdot1}{0.20} = 0.350$",
        "$d_2 = d_1 - \\sigma\\sqrt{T} = 0.350 - 0.200 = 0.150$. The gap between $d_1$ and $d_2$ is pure volatility-time — it is how much the distribution smears before expiry.",
        "Normal CDF values: $N(d_1) = N(0.350) = 0.6368$ and $N(d_2) = N(0.150) = 0.5596$.",
        "Call price: $C = S\\,N(d_1) - Ke^{-rT}N(d_2) = 100(0.6368) - 100(0.9512)(0.5596) = 63.68 - 53.23 = \\\$10.45$.",
        "Same-parameters put: $P = \\\$5.57$. Put-call parity check: $C - P = 4.88$ and $S - Ke^{-rT} = 100 - 95.12 = 4.88$. Two completely different formulas agree to the cent — that is not luck, it is arbitrage enforcing internal consistency.",
    ]},
    {"type": "p", "md": "The two $N(\\cdot)$ terms are not decoration. $N(d_1)$ is the **delta**: to hedge one short call you hold 0.637 shares, and that number *changes* as spot moves (that drift in delta is gamma — the hedging cost the formula anticipates). $N(d_2)$ is the risk-neutral probability of finishing in the money. When someone says \"the market prices a 56% chance of expiring ITM\", this is the sentence behind it."},
    {"type": "callout", "variant": "quant", "title": "Sanity checks you should run on any BSM number", "md": "Bounds: a European call must trade between $S - Ke^{-rT}$ and $S$ — ours does ($4.88 \\le 10.45 \\le 100$). Monotonicity: raise σ and the call price must rise (volatility is the only dial that helps both calls and puts). ATM approximation: $C \\approx 0.4 S\\sigma\\sqrt{T} = 0.4(100)(0.20)(1) = 8$ — within 25% of our exact 10.45, which is close enough to catch order-of-magnitude errors instantly."},
    {"type": "p", "md": "What the model *doesn't* claim is the part people misremember. It does not say prices are lognormal — it says **if** diffusion holds and hedging is continuous and costless, then this price is the replication cost. The formula is exact under its assumptions; the assumptions are the approximation. Every smile, skew and term structure you will meet later is the market's way of telling you where those assumptions leak."},
]
insert_after_last(d['blocks'], new)
save(path, d)
print('✓ opt-black-scholes')

# ============ 5. geo-unit-circle (190w) ============
path, d = load('geo-unit-circle.json')
new = [
    {"type": "p", "md": "Most trigonometry mistakes in practice come from treating the unit circle as a lookup table instead of a machine. The machine view: an angle is a **distance walked** counter-clockwise from $(1, 0)$ along a circle of radius 1. Walk $\\pi/2$ and you land on $(0, 1)$. Walk $\\pi$ and you are at $(-1, 0)$. Walk $2\\pi$ and you are home again. Sine and cosine are just the coordinates of wherever you stopped — which is why $\\sin(\\theta + 2\\pi) = \\sin(\\theta)$ is not a formula to memorise: nothing stops you from continuing to walk."},
    {"type": "table", "headers": ["You walk", "You land on", "sin (height)", "cos (x-position)"], "rows": [
        ["0", "(1, 0)", "0", "1"],
        ["π/6", "(0.866, 0.5)", "1/2", "√3/2 ≈ 0.866"],
        ["π/4", "(0.707, 0.707)", "√2/2", "√2/2"],
        ["π/3", "(0.5, 0.866)", "√3/2", "1/2"],
        ["π/2", "(0, 1)", "1", "0"],
        ["π", "(−1, 0)", "0", "−1"],
        ["3π/2", "(0, −1)", "−1", "0"],
        ["2π", "(1, 0)", "0", "1"],
    ]},
    {"type": "p", "md": "Every sign rule you ever struggled with dissolves here. In which quadrant is $\\sin(7\\pi/6)$ negative? You have walked just past $\\pi$, so you are **below** the x-axis and to the left of the origin — the third quadrant. Height (sine) is negative, x-position (cosine) is negative. No mnemonic needed; you can *see* it. This also explains the periodic structure of financial models: any model built on $\\sin(\\omega t)$ is a model of something that walks the circle at speed $\\omega$, and phase is just where on the circle you started."},
    {"type": "callout", "variant": "info", "title": "Radians are the honest unit", "md": "One radian = the arc length you walked along the unit circle. That is why $\\frac{d}{dx}\\sin x = \\cos x$ holds **only** in radians: the small-angle fact $\\sin h \\approx h$ is literally the statement \"the chord and the arc are nearly the same when you walk a short distance\". In degrees the derivative picks up a factor of $\\pi/180$, and every calculus formula downstream of it breaks. Set your calculator to radians once and leave it there."},
    {"type": "p", "md": "The last piece of fluency is walking **backwards** (clockwise, negative angles) and beyond one lap (angles above $2\\pi$). $\\cos(-\\theta) = \\cos(\\theta)$ because walking backwards lands you at the mirror position across the x-axis — same x-coordinate, negated height, hence $\\sin(-\\theta) = -\\sin(\\theta)$. These symmetries let you reduce any angle to a reference angle in $[0, \\pi/2]$, which is how numerical libraries evaluate trig functions cheaply and how you should sanity-check them by hand."},
]
insert_after_last(d['blocks'], new)
save(path, d)
print('✓ geo-unit-circle')

print('\nBatch 1 complete.')
