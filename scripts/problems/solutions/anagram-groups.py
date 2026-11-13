import sys


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    groups = {}
    for w in data[1:1 + n]:
        groups.setdefault(''.join(sorted(w)), []).append(w)
    lists = [sorted(g) for g in groups.values()]
    lists.sort(key=lambda g: (-len(g), g[0]))
    out = [str(len(lists))]
    for g in lists:
        out.append(' '.join(g))
    print('\n'.join(out))


main()
