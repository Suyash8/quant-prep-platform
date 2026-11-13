import sys
from collections import deque


def main():
    tok = sys.stdin.buffer.read().split()
    n, k = int(tok[0]), int(tok[1])
    a = [int(s) for s in tok[2:2 + n]]
    dq = deque()  # indices, values decreasing from front to back
    out = []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(a[dq[0]])
    print(' '.join(map(str, out)))


main()
