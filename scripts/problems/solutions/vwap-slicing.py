import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n, total = int(tok[0]), int(tok[1])
    vol = [int(s) for s in tok[2:2 + n]]
    v_sum = sum(vol)
    base = [total * x // v_sum for x in vol]
    rem = [total * x % v_sum for x in vol]
    left = total - sum(base)
    order = sorted(range(n), key=lambda i: (-rem[i], i))
    for i in order[:left]:
        base[i] += 1
    print(' '.join(map(str, base)))


main()
