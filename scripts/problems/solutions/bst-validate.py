import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    val = [0] * n
    left = [0] * n
    right = [0] * n
    for i in range(n):
        val[i] = int(data[1 + 3 * i])
        left[i] = int(data[2 + 3 * i])
        right[i] = int(data[3 + 3 * i])
    # Iterative walk carrying an open interval (lo, hi) for every node.
    stack = [(0, None, None)]
    while stack:
        u, lo, hi = stack.pop()
        v = val[u]
        if (lo is not None and v <= lo) or (hi is not None and v >= hi):
            print('INVALID')
            return
        if left[u] != -1:
            stack.append((left[u], lo, v))
        if right[u] != -1:
            stack.append((right[u], v, hi))
    print('VALID')


main()
