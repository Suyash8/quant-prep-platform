import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    cents = 0
    i = 1
    for _ in range(n):
        side = data[i]
        q = int(data[i + 1])
        whole, frac = data[i + 2].split('.')
        price_cents = int(whole) * 100 + int(frac)
        i += 3
        if side == 'B':
            cents -= q * price_cents
        else:
            cents += q * price_cents
    sign = '-' if cents < 0 else ''
    a = abs(cents)
    sys.stdout.write(f"{sign}{a // 100}.{a % 100:02d}\n")

main()
