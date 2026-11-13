import sys
from math import exp, sqrt


def main():
    t = sys.stdin.read().split()
    S, K, r, sg, T = map(float, t[:5])
    N = int(t[5])
    dt = T / N
    u = exp(sg * sqrt(dt))
    d = 1 / u
    q = (exp(r * dt) - d) / (u - d)
    disc = exp(-r * dt)
    u2 = u * u
    s = S * d ** N
    V = []
    for j in range(N + 1):
        V.append(max(K - s, 0.0))
        s *= u2
    for i in range(N - 1, -1, -1):
        s = S * d ** i
        for j in range(i + 1):
            V[j] = max(K - s, disc * (q * V[j + 1] + (1 - q) * V[j]), 0.0)
            s *= u2
    print(f"{V[0]:.6f}")


main()
