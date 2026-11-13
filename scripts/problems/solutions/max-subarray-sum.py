import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    best = cur = int(data[1])
    for s in data[2:1 + n]:
        x = int(s)
        cur = max(x, cur + x)
        best = max(best, cur)
    print(best)


main()
