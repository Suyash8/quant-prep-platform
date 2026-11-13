import sys


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    peak = 0.0
    worst = 0.0
    for s in tok[1:1 + n]:
        v = float(s)
        peak = max(peak, v)
        worst = max(worst, (peak - v) / peak)
    print(f"{worst:.4f}")


main()
