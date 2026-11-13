import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n, target = int(tok[0]), int(tok[1])
    seen = {}
    pairs = 0
    for s in tok[2:2 + n]:
        x = int(s)
        pairs += seen.get(target - x, 0)  # count partners seen earlier, before adding x itself
        seen[x] = seen.get(x, 0) + 1
    print(pairs)


main()
