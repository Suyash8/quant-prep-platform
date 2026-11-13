import sys


def main():
    tok = sys.stdin.read().split()
    t = int(tok[0])
    out = []
    for i in range(t):
        total, n = int(tok[1 + 2 * i]), int(tok[2 + 2 * i])
        base, rem = divmod(total, n)
        out.append(' '.join(str(base + 1 if k < rem else base) for k in range(n)))
    print('\n'.join(out))


main()
