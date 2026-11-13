import sys
from math import log, sqrt, exp, erfc, pi


def Phi(x):
    return 0.5 * erfc(-x / sqrt(2))


def main():
    lines = sys.stdin.read().split('\n')
    out = []
    for line in lines[1:1 + int(lines[0])]:
        S, K, r, sg, T = map(float, line.split())
        sq = sg * sqrt(T)
        d1 = (log(S / K) + (r + sg * sg / 2) * T) / sq
        d2 = d1 - sq
        pdf = exp(-d1 * d1 / 2) / sqrt(2 * pi)
        vals = [S * Phi(d1) - K * exp(-r * T) * Phi(d2), Phi(d1), pdf / (S * sq), S * pdf * sqrt(T)]
        out.append(' '.join('0.000000' if abs(v) < 5e-7 else f"{v:.6f}" for v in vals))
    print('\n'.join(out))


main()
