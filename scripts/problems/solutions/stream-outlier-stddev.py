import math
import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n = int(tok[0])
    count = 0
    mean = 0.0
    m2 = 0.0
    out = []
    for s in tok[1:1 + n]:
        x = int(s)
        count += 1
        delta = x - mean
        mean += delta / count
        delta2 = x - mean
        m2 += delta * delta2
        var = m2 / count
        out.append('outlier' if var > 0 and abs(x - mean) > 3 * math.sqrt(var) else 'ok')
    print('\n'.join(out))


main()
