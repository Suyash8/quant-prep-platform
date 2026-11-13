import heapq
import sys


def main():
    tok = sys.stdin.buffer.read().split()
    n, k = int(tok[0]), int(tok[1])
    heap = []  # min-heap of the k largest values so far
    out = []
    for s in tok[2:2 + n]:
        x = int(s)
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
        out.append(str(heap[0]) if len(heap) == k else '-1')
    print('\n'.join(out))


main()
