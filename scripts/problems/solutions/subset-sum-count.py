import sys

MOD = 10**9 + 7


def main():
    tok = sys.stdin.read().split()
    n, target = int(tok[0]), int(tok[1])
    dp = [0] * (target + 1)
    dp[0] = 1
    for s in tok[2:2 + n]:
        a = int(s)
        for x in range(target, a - 1, -1):  # downwards: each value is used at most once
            dp[x] = (dp[x] + dp[x - a]) % MOD
    print(dp[target] % MOD)


main()
