import sys


def money(cents):
    return f"{cents // 100}.{cents % 100:02d}"


def main():
    lines = sys.stdin.read().split('\n')
    n = int(lines[0])
    book = {'B': {}, 'S': {}}
    out = []
    for line in lines[1:1 + n]:
        kind, side, price, qty = line.split()
        price, qty = int(price), int(qty)
        levels = book[side]
        if kind == 'A':
            levels[price] = levels.get(price, 0) + qty
        else:
            levels[price] -= qty
            if levels[price] == 0:
                del levels[price]
        bid = max(book['B']) if book['B'] else None
        ask = min(book['S']) if book['S'] else None
        spread = money(ask - bid) if bid is not None and ask is not None else '-'
        out.append(f"{money(bid) if bid is not None else '-'} {money(ask) if ask is not None else '-'} {spread}")
    print('\n'.join(out))


main()
