import sys


def main():
    tok = sys.stdin.read().split()
    n, span = int(tok[0]), int(tok[1])
    alpha = 2.0 / (span + 1)
    ema = float(tok[2])
    out = [f"{ema:.4f}"]
    for s in tok[3:2 + n]:
        ema = alpha * float(s) + (1 - alpha) * ema
        out.append(f"{ema:.4f}")
    print('\n'.join(out))


main()
