import sys
from math import gcd


def main():
    n = int(sys.stdin.read().split()[0])
    num, den = 7 * n, 2
    g = gcd(num, den)
    num //= g
    den //= g
    print(num if den == 1 else f"{num}/{den}")


main()
