import sys


def main():
    data = sys.stdin.buffer.read().split()
    n, k = int(data[0]), int(data[1])
    p = [int(s) for s in data[2:2 + n]]
    s = sum(p[:k])
    out = []
    for i in range(n - k + 1):
        if i > 0:
            s += p[i + k - 1] - p[i - 1]
        cents = (200 * s + k) // (2 * k)  # round half up, exact integer arithmetic
        out.append(f"{cents // 100}.{cents % 100:02d}")
    print('\n'.join(out))


main()
