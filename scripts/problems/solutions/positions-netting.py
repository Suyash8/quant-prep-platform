import sys


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    net = {}
    for i in range(n):
        sym = tok[1 + 2 * i]
        net[sym] = net.get(sym, 0) + int(tok[2 + 2 * i])
    print('\n'.join(f"{s} {net[s]}" for s in sorted(net)))


main()
