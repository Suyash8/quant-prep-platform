import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    coins = [int(x) for x in data[1:1 + n]]
    amount = int(data[1 + n])
    INF = amount + 1
    dp = [INF] * (amount + 1)
    dp[0] = 0
    for c in coins:
        if c < 1 or c > amount:
            continue
        for x in range(c, amount + 1):
            if dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    print(dp[amount] if dp[amount] <= amount else -1)

main()
