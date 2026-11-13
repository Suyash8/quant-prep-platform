import sys


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    a = list(map(int, data[1:1 + n]))
    m = int(data[1 + n])
    out = []
    for q in map(int, data[2 + n:2 + n + m]):
        lo, hi = 0, n
        while lo < hi:
            mid = (lo + hi) // 2
            if a[mid] < q:
                lo = mid + 1
            else:
                hi = mid
        out.append(str(lo if lo < n else -1))
    print('\n'.join(out))


main()
