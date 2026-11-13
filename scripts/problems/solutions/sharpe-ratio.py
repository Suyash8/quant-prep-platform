import sys
from math import sqrt


def main():
    tok = sys.stdin.read().split()
    n, f = int(tok[0]), int(tok[1])
    r = list(map(int, tok[2:2 + n]))
    num = n * sum(x * x for x in r) - sum(r) ** 2
    if n == 1 or num == 0:
        print("0.0000")
        return
    s = sqrt(num / (n * (n - 1)))
    print(f"{(sum(r) / n - f / 252) / s * sqrt(252):.4f}")


main()
