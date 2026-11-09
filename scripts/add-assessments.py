#!/usr/bin/env python3
"""Add two new assessments: options & greeks, market microstructure.
All numeric answers verified by computation (see session log)."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADIR = os.path.join(ROOT, 'content', 'assessments')

def write(d):
    p = os.path.join(ADIR, d['id'] + '.json')
    with open(p, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    n = sum(len(s['questions']) for s in d['sections'])
    print(f"  ✓ {d['id']} ({n} questions)")

# ============ assess-options-greeks ============
write({
    "id": "assess-options-greeks",
    "title": "Options and Greeks Assessment",
    "kind": "assessment",
    "timeLimitMinutes": 35,
    "description": "Pricing, parity, payoff structures and the Greeks — the option-pricing material from the derivatives modules. All market data is clearly hypothetical.",
    "sections": [{
        "title": "Options and Greeks",
        "questions": [
            {"id": "opt-q1", "type": "numeric", "prompt": "Black-Scholes call price: spot $S=100$, strike $K=100$, risk-free $r=5\\%$, volatility $\\sigma=20\\%$, maturity $T=1$ year. (Two decimals.)",
             "answer": 10.45, "tolerance": 0.06, "explanation": "$d_1 = 0.350$, $d_2 = 0.150$; $C = 100 N(d_1) - 100 e^{-0.05} N(d_2) = 10.45$. The tolerance allows small differences in normal-CDF precision."},
            {"id": "opt-q2", "type": "numeric", "prompt": "Same option as above. What is the call's **delta**? (Three decimals; between 0 and 1.)",
             "answer": 0.637, "tolerance": 0.01, "explanation": "Delta of a European call is $N(d_1) = N(0.350) = 0.637$: hold 0.637 shares per short call to be locally hedged."},
            {"id": "opt-q3", "type": "numeric", "prompt": "Same parameters. What is the **put's** delta? (Three decimals; negative.)",
             "answer": -0.363, "tolerance": 0.01, "explanation": "Put delta is $-N(-d_1) = -0.363$. Note $0.637 + (-0.363) = 0.274$... no: put delta $= N(d_1) - 1$, and indeed $0.637 - 1 = -0.363$. Put delta = call delta − 1 is the identity to remember."},
            {"id": "opt-q4", "type": "numeric", "prompt": "Same parameters. What is the option's **vega per 1% point** of volatility? (Three decimals.)",
             "answer": 0.375, "tolerance": 0.01, "explanation": "$\\text{vega} = S\\varphi(d_1)\\sqrt{T}$; per 1 vol point divide by 100. Full vega is 37.5 per 100%, so a 1% vol rise adds ≈ 0.375 to the price."},
            {"id": "opt-q5", "type": "numeric", "prompt": "Same parameters. What is **gamma**? (Four decimals.)",
             "answer": 0.0188, "tolerance": 0.001, "explanation": "$\\Gamma = \\varphi(d_1) / (S\\sigma\\sqrt{T}) = 0.0188$: delta changes by ~0.019 per 1-point move in spot — the rehedging cost driver."},
            {"id": "opt-q6", "type": "numeric", "prompt": "Same parameters. What is the call's **theta per calendar day**? (Three decimals; expect negative.)",
             "answer": -0.018, "tolerance": 0.004, "explanation": "Annual theta is −6.55 (−$S\\varphi(d_1)\\sigma/(2\\sqrt{T}) - rKe^{-rT}N(d_2)$); dividing by 365 gives ≈ −0.018 per day."},
            {"id": "opt-q7", "type": "numeric", "prompt": "Put-call parity: $S = 100$, $K = 95$, $r = 5\\%$, $T = 0.5$. What must $C - P$ equal? (Four decimals.)",
             "answer": 7.3456, "tolerance": 0.01, "explanation": "$C - P = S - Ke^{-rT} = 100 - 95e^{-0.025} = 100 - 92.6544 = 7.3456$. No volatility appears — parity is model-free."},
            {"id": "opt-q8", "type": "numeric", "prompt": "A call with strike 100 trades at 8.20 while the stock is 105. How much of the premium is **time value**? (Two decimals.)",
             "answer": 3.20, "tolerance": 0.01, "explanation": "Intrinsic = max(0, 105−100) = 5.00; time value = 8.20 − 5.00 = 3.20."},
            {"id": "opt-q9", "type": "numeric", "prompt": "Covered call: you own the stock at 100 and sell a 105-strike call for 2.50. What is the **maximum profit** of the position? (Two decimals.)",
             "answer": 7.50, "tolerance": 0.01, "explanation": "Max profit = strike − purchase price + premium = 105 − 100 + 2.50 = 7.50, reached at any expiry price ≥ 105."},
            {"id": "opt-q10", "type": "numeric", "prompt": "Long straddle: buy the 100-strike call for 3.50 and the 100-strike put for 3.20. What is the **lower** break-even price at expiry? (Two decimals.)",
             "answer": 93.30, "tolerance": 0.01, "explanation": "Total premium 6.70; break-evens are 100 ± 6.70, so 93.30 and 106.70. Below 93.30 the put's intrinsic exceeds the combined premium."},
            {"id": "opt-q11", "type": "numeric", "prompt": "Bear put spread: buy the 105 put for 6.00, sell the 95 put for 2.00. What is the **maximum profit**? (Two decimals.)",
             "answer": 6.00, "tolerance": 0.01, "explanation": "Max = width − net cost = (105 − 95) − (6.00 − 2.00) = 10 − 4 = 6.00, realised at expiry ≤ 95."},
            {"id": "opt-q12", "type": "mcq", "prompt": "Volatility rises from 20% to 40%, all else equal. What happens to an at-the-money straddle's price?",
             "options": ["It falls: higher vol means more risk to sell", "It rises roughly proportionally to the vol increase", "It is unchanged: parity pins straddle value", "It doubles exactly"],
             "answerIndex": 1, "explanation": "ATM option value is approximately $0.4 S \\sigma \\sqrt{T}$ — near-linear in vol for ATM strikes. Doubling vol roughly doubles the straddle. Not *exactly* (the approximation drifts away from ATM), which is why option (d) is the trap."},
            {"id": "opt-q13", "type": "mcq", "prompt": "You are short an at-the-money call and delta-hedged with 0.637 shares. Spot rises 1. If you do NOT rehedge, your position is now:",
             "options": ["still perfectly hedged", "short gamma: the hedge under-compensates the new delta", "long gamma: the hedge over-compensates the new delta", "insufficient information"],
             "answerIndex": 1, "explanation": "Positive gamma means the call's delta grew above 0.637 as spot rose; your static 0.637-share hedge is now too small — you are short gamma. This unhedged residual is precisely what gamma P&L (and the lesson's hedging-cost discussion) quantifies."},
        ],
    }],
})

# ============ assess-microstructure ============
write({
    "id": "assess-microstructure",
    "title": "Market Microstructure Assessment",
    "kind": "assessment",
    "timeLimitMinutes": 30,
    "description": "Order books, matching rules, spreads, adverse selection and execution costs. All books and fills are clearly hypothetical.",
    "sections": [{
        "title": "Market Microstructure",
        "questions": [
            {"id": "mic-q1", "type": "numeric", "prompt": "A stock quotes 100.00 bid / 100.04 ask. What is the quoted spread in **basis points** of the mid? (Integer.)",
             "answer": 4, "tolerance": 0.5, "explanation": "Spread = 0.04 on a mid of 100.02 → 0.04/100.02 ≈ 4bp. Spread-in-bps normalises across price levels, which is why it is the standard quoting unit."},
            {"id": "mic-q2", "type": "numeric", "prompt": "You cross that spread with a 5,000,000-notional market order (and the book absorbs it at the touch). What is the **half-spread cost** in dollars? (Integer, no commas.)",
             "answer": 1000, "tolerance": 20, "explanation": "$5{,}000{,}000 \\times 0.0004 / 2 = \\$1{,}000$: the instantaneous loss versus the mid, the moment the trade prints."},
            {"id": "mic-q3", "type": "numeric", "prompt": "Book: bid depth 4,500 lots, ask depth 2,400 lots (within the near levels). What is the order-book **imbalance** $(B-A)/(B+A)$? (Three decimals.)",
             "answer": 0.304, "tolerance": 0.01, "explanation": "$(4500-2400)/(4500+2400) = 2100/6900 = 0.304$ — roughly 30% more resting buy interest; a classic (noisy) short-horizon signal."},
            {"id": "mic-q4", "type": "mcq", "prompt": "A 500-lot market buy arrives. Best ask is 100.02 × 900. At what price does it fill?",
             "options": ["100.00 (the mid)", "100.02 (the resting ask's price)", "100.04 (the next level up)", "the average of 100.02 and 100.04"],
             "answerIndex": 1, "explanation": "The aggressor fills at the resting order's price — price priority takes you to the best ask, and the match price is the passive side's price. The book thins by 500 at 100.02; the spread is unchanged."},
            {"id": "mic-q5", "type": "mcq", "prompt": "Two limit orders rest at the same price. Which fills first when an arriving order takes that level?",
             "options": ["the larger order", "the earlier-arriving order (time priority)", "the one whose owner trades more volume", "randomly by the matching engine"],
             "answerIndex": 1, "explanation": "Price priority first, then FIFO within a price level. Queue position is why cancel-replace strategies pay a real cost: rejoining the queue loses your place."},
            {"id": "mic-q6", "type": "numeric", "prompt": "Your market buy executes at 100.04; a moment later the mid is 100.05. What is the **effective spread** $2|P_{exec} - M_{post}|$? (Give the answer in cents, two decimals — e.g. 3.25.)",
             "answer": 0.02, "tolerance": 0.005, "explanation": "$2 \\times |100.04 - 100.05| = 0.02$: 2 cents. The post-trade mid is the honest benchmark — measuring against the pre-trade mid hides the adverse move your own information caused."},
            {"id": "mic-q7", "type": "numeric", "prompt": "A strategy's winning months sum to +16.0% and its losing months to −6.5%. What is its **profit factor**? (Two decimals.)",
             "answer": 2.46, "tolerance": 0.02, "explanation": "$16.0 / 6.5 = 2.46$: gross wins over gross losses. Above ~1.5 with a real sample is respectable; above 2.5 on months (not trades) deserves suspicion of a lucky sample."},
            {"id": "mic-q8", "type": "mcq", "prompt": "You are making a market and a well-informed client repeatedly lifts your offer. The textbook response ladder is:",
             "options": ["keep quotes fixed: consistency builds trust", "widen or fade quotes on one-sided flow, adjust inventory, step aside if toxicity persists", "widen the bid only", "increase size at the same prices to average the flow"],
             "answerIndex": 1, "explanation": "Adverse selection management: measure flow toxicity, skew or widen when flow is one-sided, lean inventory the other way, and withdraw when the edge against you persists. Holding quotes fixed donates the spread (and worse) to informed flow."},
            {"id": "mic-q9", "type": "mcq", "prompt": "The square-root impact law predicts that doubling your order size (same ADV) increases impact by approximately:",
             "options": ["2×", "1.41× (square root of 2)", "4×", "no change: impact depends only on ADV"],
             "answerIndex": 1, "explanation": "Impact $\\propto \\sqrt{Q/V}$: doubling participation multiplies impact by $\\sqrt{2} \\approx 1.41$. It is an empirical rule of thumb, not physics — but the right order of magnitude for sizing execution costs."},
            {"id": "mic-q10", "type": "mcq", "prompt": "An order rests at the best bid. A large market sell sweeps the entire bid level and trades through to lower prices. Your resting order was:",
             "options": ["cancelled automatically by the exchange", "filled at your limit price before any order behind you", "filled at the lower sweep price", "partially filled at the mid"],
             "answerIndex": 1, "explanation": "Time priority: you were ahead in the queue, so you were filled fully at *your* price. The sweep's lower prices applied to the orders behind you — this is exactly why queue position has value."},
            {"id": "mic-q11", "type": "numeric", "prompt": "A backtest assumes maker fills whenever price trades through your level. With 2,000 lots ahead of you at that price and 1,200 lots traded there, did you fill? (1 = yes, 0 = no.)",
             "answer": 0, "tolerance": 0.1, "explanation": "No: volume (1,200) never exceeded the queue ahead of you (2,000). Honest queue simulation requires traded volume to consume your position — the naive assumption is the single most common maker-backtest illusion."},
            {"id": "mic-q12", "type": "mcq", "prompt": "Displayed depth in the book is best understood as:",
             "options": ["a firm commitment you can always trade through", "a standing offer to maybe trade, withdrawable at any time", "the exchange's guarantee of liquidity", "equal to recent traded volume"],
             "answerIndex": 1, "explanation": "Limit orders are free to cancel. The visible book overstates the liquidity you can actually transact — which is why impact models, execution algos and 'depth you can trade' all discount the display."},
        ],
    }],
})

print('\n2 assessments added.')
