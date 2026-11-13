import sys


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    grid = [data[1 + i * n:1 + (i + 1) * n] for i in range(n)]
    # Clockwise rotation: new row j is old column j read from the bottom up.
    out = [' '.join(grid[n - 1 - i][j] for i in range(n)) for j in range(n)]
    print('\n'.join(out))


main()
