import sys


def main():
    tok = sys.stdin.read().split()
    n, m = int(tok[0]), int(tok[1])
    grid = [tok[2 + i * m:2 + (i + 1) * m] for i in range(n)]
    top, bottom, left, right = 0, n - 1, 0, m - 1
    out = []
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            out.append(grid[top][j])
        for i in range(top + 1, bottom + 1):
            out.append(grid[i][right])
        if top < bottom:
            for j in range(right - 1, left - 1, -1):
                out.append(grid[bottom][j])
        if left < right:
            for i in range(bottom - 1, top, -1):
                out.append(grid[i][left])
        top += 1
        bottom -= 1
        left += 1
        right -= 1
    print(' '.join(out))


main()
