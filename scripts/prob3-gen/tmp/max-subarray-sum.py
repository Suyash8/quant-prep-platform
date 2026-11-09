import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    a = [int(x) for x in data[1:1 + n]]
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    print(best)

main()
