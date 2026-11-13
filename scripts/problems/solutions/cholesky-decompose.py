import sys
from math import sqrt


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    a = [[int(tok[1 + i * n + j]) for j in range(n)] for i in range(n)]
    L = [[0.0] * n for _ in range(n)]
    for j in range(n):
        L[j][j] = sqrt(a[j][j] - sum(L[j][k] ** 2 for k in range(j)))
        for i in range(j + 1, n):
            L[i][j] = (a[i][j] - sum(L[i][k] * L[j][k] for k in range(j))) / L[j][j]
    for i in range(n):
        print(' '.join('0.000000' if abs(x) < 5e-7 else f"{x:.6f}" for x in L[i]))


main()
