import sys


def multiply(a, b, mod):
    n = len(a)
    bt = list(zip(*b))
    return [[sum(x * y for x, y in zip(row, col)) % mod for col in bt] for row in a]


def main():
    tok = sys.stdin.read().split()
    n, k, mod = int(tok[0]), int(tok[1]), int(tok[2])
    base = [[int(tok[3 + n * i + j]) % mod for j in range(n)] for i in range(n)]
    result = [[1 % mod if i == j else 0 for j in range(n)] for i in range(n)]
    while k:
        if k & 1:
            result = multiply(result, base, mod)
        base = multiply(base, base, mod)
        k >>= 1
    print('\n'.join(' '.join(map(str, row)) for row in result))


main()
