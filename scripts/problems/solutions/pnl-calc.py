import sys


def to_cents(text):
    whole, _, frac = text.partition('.')
    return int(whole) * 100 + int((frac + '00')[:2])


def main():
    tok = sys.stdin.read().split()
    n = int(tok[0])
    total = 0
    for i in range(n):
        side, qty, price = tok[1 + 3 * i], int(tok[2 + 3 * i]), to_cents(tok[3 + 3 * i])
        total += qty * price if side == 'S' else -qty * price
    sign = '-' if total < 0 else ''
    print(f"{sign}{abs(total) // 100}.{abs(total) % 100:02d}")


main()
