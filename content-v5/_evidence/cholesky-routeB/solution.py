import sys
from math import isqrt


def fmt(num, den, neg):
    # value = sqrt(num/den) scaled by 1e6, rounded to nearest, exact ties to even
    q = num * 10**12 // den
    k = isqrt(q)
    c = 4 * num * 10**12 - (2 * k + 1) ** 2 * den
    if c > 0 or (c == 0 and k % 2 == 1):
        k += 1
    s = f"{k // 10**6}.{k % 10**6:06d}"
    return '-' + s if neg and k else s


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    a = [[int(tok[1 + i * n + j]) for j in range(n)] for i in range(n)]
    # Bareiss: piv[j] = leading minor of order j+1; m[i][j] kept for i >= j
    prev = 1
    out = [['0.000000'] * n for _ in range(n)]
    for j in range(n):
        pj = a[j][j]
        for i in range(j, n):
            # a[i][j] now holds det of rows 0..j-1,i and cols 0..j-1,j
            v = a[i][j]
            if i == j:
                out[i][j] = fmt(pj, prev, False)
            else:
                out[i][j] = fmt(v * v, pj * prev, v < 0)
        for i in range(j + 1, n):
            for k in range(j + 1, n):
                a[i][k] = (a[i][k] * pj - a[i][j] * a[j][k]) // prev
        prev = pj
    print('\n'.join(' '.join(r) for r in out))


main()
