import sys
from math import gcd

def main():
    n = int(sys.stdin.buffer.read().decode().split()[0])
    p, q = 7 * n, 2
    g = gcd(p, q)
    p //= g
    q //= g
    print(p if q == 1 else f"{p}/{q}")

main()
