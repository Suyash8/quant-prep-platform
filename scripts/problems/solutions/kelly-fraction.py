import sys


def main():
    data = sys.stdin.read().split()
    t = int(data[0])
    out = []
    for i in range(t):
        p = float(data[1 + 2 * i])
        b = float(data[2 + 2 * i])
        q = 1.0 - p
        f = (b * p - q) / b
        if f <= 0:
            f = 0.0
        out.append(f"{f:.4f}")
    print('\n'.join(out))


main()
