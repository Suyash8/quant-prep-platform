import sys, os, random
from math import isqrt
from fractions import Fraction
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Cholesky Decomposition', difficulty='medium', category='quant-finance', tags=['quant-finance', 'linear-algebra', 'floating-point'], estMinutes=30,
    statement=[p('A covariance matrix $A$ is symmetric positive definite, so it factors as $A = L L^\\top$ with $L$ lower triangular and positive diagonal. Compute $L$ for an integer matrix $A$.'),
               math('L_{jj} = \\sqrt{A_{jj} - \\sum_{k<j} L_{jk}^2}, \\qquad L_{ij} = \\frac{A_{ij} - \\sum_{k<j} L_{ik} L_{jk}}{L_{jj}} \\;(i > j)'),
               p('Print $L$ as $n$ rows of $n$ numbers (zeros above the diagonal), each with exactly 6 decimals. A value whose absolute size is below $5\\cdot 10^{-7}$ is printed as `0.000000` (never `-0.000000`). Each printed value is the exact value of $L_{ij}$ rounded to the nearest multiple of $10^{-6}$, with an exact tie rounded to the even last digit.')],
    inputFormat='First line: $n$. Then $n$ lines of $n$ integers: the matrix $A$.',
    outputFormat='$n$ lines of $n$ numbers with 6 decimals, separated by single spaces.',
    constraints=['$1 \\le n \\le 50$', '$A$ is symmetric positive definite with $|A_{ij}| \\le 10^6$'],
    hints=['Process columns left to right; each entry needs only entries already computed.', 'Clamp tiny values so negative zero is never printed.'],
    editorial=[p('The algorithm is $O(n^3)$. Column $j$ of $L$ depends on columns $0..j-1$. For a positive definite matrix the value under the square root is always positive.')],
    lessons=['la-svd-covariance', 'la-linear-systems'])
def mat(inp):
    t = inp.split(); n = int(t[0]); return n, [[int(t[1 + i * n + j]) for j in range(n)] for i in range(n)]
def oracle(inp):
    # exact rational LDL^T (unit lower L1, D > 0): L_jj = sqrt(D_j), L_ij = L1_ij sqrt(D_j)
    n, A = mat(inp); F = Fraction
    L1 = [[F(0)] * n for _ in range(n)]; D = [F(0)] * n
    for j in range(n):
        D[j] = F(A[j][j]) - sum((L1[j][k] ** 2 * D[k] for k in range(j)), F(0))
        assert D[j] > 0
        L1[j][j] = F(1)
        for i in range(j + 1, n):
            L1[i][j] = (F(A[i][j]) - sum((L1[i][k] * L1[j][k] * D[k] for k in range(j)), F(0))) / D[j]
    def f(i, j):
        if j > i: return '0.000000'
        R = L1[i][j] ** 2 * D[j]
        num, den = R.numerator, R.denominator
        k = isqrt(num * 10**12 // den)
        c = 4 * num * 10**12 - (2 * k + 1) ** 2 * den
        if c > 0 or (c == 0 and k % 2 == 1): k += 1
        return fixed(-k if L1[i][j] < 0 else k, 6)
    return '\n'.join(' '.join(f(i, j) for j in range(n)) for i in range(n))
def fmt(A): return f"{len(A)}\n" + '\n'.join(' '.join(map(str, r)) for r in A) + '\n'
def spd(r, n, m):
    B = [[r.randint(-m, m) if j <= i else 0 for j in range(n)] for i in range(n)]
    for i in range(n): B[i][i] = r.randint(1, m)
    return [[sum(B[i][k] * B[j][k] for k in range(n)) for j in range(n)] for i in range(n)]
def gen(r):
    while True:
        n = r.randint(1, 5); x = fmt(spd(r, n, r.choice([2, 5, 30])))
        try: oracle(x); return x
        except AssertionError: pass
EXAMPLES = ['3\n4 12 -16\n12 37 -43\n-16 -43 98\n']
EDGE = ['1\n1\n', '1\n1000000\n', '3\n4 0 0\n0 9 0\n0 0 16\n', '2\n2 1\n1 2\n', '3\n1 1 1\n1 2 2\n1 2 3\n']
def BIG():
    r = random.Random(173); return [fmt(spd(r, 50, 20))]
ORACLE_MAX = 100000
