import heapq
import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n = int(tok[0])
    low = []   # max-heap (negated): the smaller half
    high = []  # min-heap: the larger half
    out = []
    for s in tok[1:1 + n]:
        x = int(s)
        if not low or x <= -low[0]:
            heapq.heappush(low, -x)
        else:
            heapq.heappush(high, x)
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))
        total = -low[0] * 2 if len(low) > len(high) else -low[0] + high[0]
        out.append(f"{total // 2}.{5 if total % 2 else 0}")
    print('\n'.join(out))


main()
