import sys


def main():
    data = sys.stdin.read().split()
    t = int(data[0])
    out = []
    for i in range(t):
        x = int(data[1 + 2 * i])
        y = int(data[2 + 2 * i])
        out.append('ODD' if bin(x & y).count('1') % 2 else 'EVEN')
    print('\n'.join(out))


main()
