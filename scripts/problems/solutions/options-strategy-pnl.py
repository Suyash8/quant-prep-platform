import sys
from decimal import Decimal


def cents(text):
    return int(Decimal(text) * 100)


def main():
    tok = sys.stdin.read().split()
    t = int(tok[0])
    legs = []
    pos = 1
    for _ in range(t):
        kind, side, strike, qty, prem = tok[pos:pos + 5]
        legs.append((kind, 1 if side == 'BUY' else -1, cents(strike), int(qty), cents(prem)))
        pos += 5
    q = int(tok[pos])
    out = []
    for s in tok[pos + 1:pos + 1 + q]:
        spot = cents(s)
        total = 0
        for kind, sign, strike, qty, prem in legs:
            intrinsic = max(0, spot - strike) if kind == 'C' else max(0, strike - spot)
            total += sign * (intrinsic - prem) * qty
        out.append(('-' if total < 0 else '') + f"{abs(total) // 100}.{abs(total) % 100:02d}")
    print('\n'.join(out))


main()
