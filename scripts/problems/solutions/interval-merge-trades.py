import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n = int(tok[0])
    windows = sorted((int(tok[1 + 2 * i]), int(tok[2 + 2 * i])) for i in range(n))
    merged = []
    cs, ce = windows[0]
    for s, e in windows[1:]:
        if s <= ce:
            ce = max(ce, e)
        else:
            merged.append((cs, ce))
            cs, ce = s, e
    merged.append((cs, ce))
    print('\n'.join([str(len(merged))] + [f"{a} {b}" for a, b in merged]))


main()
