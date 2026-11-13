import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Matrix Power Modulo a Prime', difficulty='medium', category='mathematics', tags=['mathematics', 'matrices', 'modular-arithmetic', 'fast-exponentiation'], estMinutes=35,
    statement=[p('A Markov chain with integer weights has a transition matrix $A$ of size $n \\times n$. To know the weight of all paths of length $k$, compute $A^k$ with every entry reduced modulo a prime $M$. The exponent $k$ can be as large as $10^{18}$, so multiplying $k$ times is impossible.'),
               math('(A^k)_{ij} \\bmod M, \\qquad A^0 = I'),
               p('Use fast exponentiation by squaring: $O(n^3 \\log k)$ operations. Reduce modulo $M$ after every multiplication and every addition of products, because $M$ is close to $2^{30}$ and the sum of several products overflows a 64-bit integer.')],
    inputFormat='First line: $n$, $k$ and $M$. Then $n$ rows of $n$ integers with $0 \\le a_{ij} < M$.',
    outputFormat='$n$ lines of $n$ integers: the matrix $A^k \\bmod M$. For $k = 0$ this is the identity matrix.',
    constraints=['$1 \\le n \\le 20$', '$0 \\le k \\le 10^{18}$', '$M$ is a prime with $2 \\le M \\le 10^9 + 7$'],
    hints=['Square the matrix while halving k. When the current bit of k is set, multiply it into the result.', 'In C++ use unsigned 64-bit products and reduce after each product; 10^9+7 squared is below 2^63, but a sum of 20 of them is not.'],
    editorial=[p('Write $k$ in binary. $A^k$ is the product of $A^{2^i}$ over the set bits $i$ of $k$. Keep a running power `P` (squared each step) and a result `R` (initially the identity). Matrix multiplication is associative, so the order of the multiplications does not matter for powers of a single matrix.'),
               p('For $k = 0$ the result is the identity even if $A$ is the zero matrix. With $M = 2$ the identity has entries 1, which are below $M$, so no special case exists for small primes except $M \\ge 2$.')],
    lessons=['la-matrices-operations', 'disc-modular-recurrences', 'stp-markov-chains'])
def mul(A, B, M):
    n = len(A); return [[sum(A[i][t] * B[t][j] for t in range(n)) % M for j in range(n)] for i in range(n)]
def oracle(inp):
    t = list(map(int, inp.split())); n, k, M = t[0], t[1], t[2]; A = [t[3 + n * i:3 + n * (i + 1)] for i in range(n)]
    I = [[1 % M if i == j else 0 for j in range(n)] for i in range(n)]
    def pw(e):                      # recursive halving, independent of the iterative bit loop in the solutions
        if e == 0: return I
        h = pw(e // 2); h2 = mul(h, h, M)
        return mul(h2, A, M) if e % 2 else h2
    if k <= 40:                     # plain repeated multiplication
        R = I
        for _ in range(k): R = mul(R, A, M)
    else: R = pw(k)
    return '\n'.join(' '.join(map(str, row)) for row in R)
def gen(r):
    n = r.randint(1, 4); M = r.choice([2, 3, 5, 7, 11, 13, 1000000007]); k = r.choice([0, 1, 2, 3, 5, 10, r.randint(0, 60), r.randint(0, 10**18)])
    return f"{n} {k} {M}\n" + '\n'.join(' '.join(str(r.randrange(M)) for _ in range(n)) for _ in range(n)) + '\n'
EXAMPLES = ['2 10 1000000007\n1 1\n1 0\n']
EDGE = ['1 0 2\n1\n', '2 0 1000000007\n0 0\n0 0\n', '2 1 7\n3 4\n5 6\n', '3 1000000000000000000 1000000007\n1 1 0\n1 0 1\n0 1 1\n', '2 1000000000000000000 2\n1 1\n1 0\n', '1 1000000000000000000 1000000007\n999999999\n']
def BIG():
    r = random.Random(141); n = 20; M = 1000000007
    return [f"{n} 999999999999999999 {M}\n" + '\n'.join(' '.join(str(r.randrange(M)) for _ in range(n)) for _ in range(n)) + '\n']
