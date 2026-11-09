import sys
from bisect import bisect_left

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    a = [int(x) for x in data[1:1 + n]]
    m = int(data[1 + n])
    out = []
    for j in range(m):
        q = int(data[2 + n + j])
        i = bisect_left(a, q)
        out.append(str(i if i < n else -1))
    sys.stdout.write("\n".join(out) + "\n")

main()
