import sys


def price(F, cpn, m, yrs, y):
    N = m * yrs
    i = y / m
    c = F * cpn / m
    s = 0.0
    for t in range(1, N + 1):
        s += c / (1 + i) ** t
    return s + F / (1 + i) ** N


def main():
    lines = sys.stdin.read().split('\n')
    for line in lines[1:1 + int(lines[0])]:
        t = line.split()
        F, cpn, m, yrs, x = float(t[1]), float(t[2]) / 100, int(t[3]), int(t[4]), float(t[5])
        if t[0] == 'P':
            print(f"{price(F, cpn, m, yrs, x / 100):.4f}")
        else:
            lo, hi = 0.0, 1.0
            for _ in range(100):
                mid = (lo + hi) / 2
                if price(F, cpn, m, yrs, mid) > x:
                    lo = mid
                else:
                    hi = mid
            print(f"{(lo + hi) / 2 * 100:.4f}")


main()
