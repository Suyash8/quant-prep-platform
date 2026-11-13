import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n = int(tok[0])
    notional = shares = 0
    for i in range(n):
        q = int(tok[1 + 2 * i])
        p = int(tok[2 + 2 * i])
        notional += q * p
        shares += q
    # VWAP in units of 1e-4 dollars is 100 * notional / shares; round to nearest in exact integers.
    units = (200 * notional + shares) // (2 * shares)
    print(f"{units // 10000}.{units % 10000:04d}")


main()
