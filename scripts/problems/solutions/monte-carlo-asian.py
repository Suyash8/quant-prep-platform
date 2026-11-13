import sys
from math import exp, sqrt


def main():
    t = sys.stdin.read().split()
    S, K, r, sg, T = map(float, t[:5])
    N, M, x = int(t[5]), int(t[6]), int(t[7])
    dt = T / N
    drift = (r - sg * sg / 2) * dt
    vol = sg * sqrt(dt)
    u = exp(drift + vol)
    d = exp(drift - vol)
    tot = 0.0
    for _ in range(M):
        s = S
        a = 0.0
        for _ in range(N):
            x = (1103515245 * x + 12345) & 0x7fffffff
            s *= u if (x >> 30) & 1 else d
            a += s
        tot += max(a / N - K, 0.0)
    print(f"{exp(-r * T) * tot / M:.4f}")


main()
