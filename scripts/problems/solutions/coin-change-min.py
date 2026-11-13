import sys


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    coins = sorted(set(int(x) for x in data[1:1 + n]))
    amount = int(data[1 + n])
    inf = amount + 1
    dp = [inf] * (amount + 1)
    dp[0] = 0
    for x in range(1, amount + 1):
        best = inf
        for c in coins:
            if c > x:
                break
            if dp[x - c] + 1 < best:
                best = dp[x - c] + 1
        dp[x] = best
    print(dp[amount] if dp[amount] <= amount else -1)


main()
