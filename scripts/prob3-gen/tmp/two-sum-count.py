import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    target = int(data[1])
    a = [int(x) for x in data[2:2 + n]]
    seen = {}
    count = 0
    for x in a:
        count += seen.get(target - x, 0)
        seen[x] = seen.get(x, 0) + 1
    print(count)

main()
