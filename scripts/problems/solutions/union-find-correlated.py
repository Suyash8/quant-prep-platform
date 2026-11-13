import sys


def hundredths(text):
    neg = text.startswith('-')
    whole, _, frac = text.lstrip('-').partition('.')
    v = int(whole) * 100 + int((frac + '00')[:2])
    return -v if neg else v


def main():
    tok = sys.stdin.read().split()
    n, m = int(tok[0]), int(tok[1])
    theta = hundredths(tok[2])
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for e in range(m):
        i, j = int(tok[3 + 3 * e]), int(tok[4 + 3 * e])
        if hundredths(tok[5 + 3 * e]) > theta:
            a, b = find(i), find(j)
            if a != b:
                parent[b] = a
    groups = {}
    for v in range(n):
        groups.setdefault(find(v), []).append(v)
    clusters = sorted(groups.values(), key=lambda g: g[0])  # members are already in increasing order
    print('\n'.join([str(len(clusters))] + [' '.join(map(str, g)) for g in clusters]))


main()
