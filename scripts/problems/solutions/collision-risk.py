import sys


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    x = [int(s) for s in data[1:1 + n]]
    v = [int(s) for s in data[1 + n:1 + 2 * n]]
    t = int(data[1 + 2 * n])
    # Agents i and j meet at tau = (xj - xi) / (vi - vj). Compare in integers:
    # tau > 0 needs dx and dv with the same sign, tau <= t needs |dx| <= t * |dv|.
    for i in range(n):
        for j in range(i + 1, n):
            dx = x[j] - x[i]
            dv = v[i] - v[j]
            if dv == 0:
                continue
            if (dx > 0) == (dv > 0) and abs(dx) <= t * abs(dv):
                print('COLLIDE')
                return
    print('SAFE')


main()
