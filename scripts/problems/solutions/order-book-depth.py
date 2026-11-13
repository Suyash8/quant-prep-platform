import sys


def main():
    lines = sys.stdin.read().split('\n')
    n, k = map(int, lines[0].split())
    book = {'B': {}, 'S': {}}
    for line in lines[1:1 + n]:
        kind, side, price, qty = line.split()
        price, qty = int(price), int(qty)
        levels = book[side]
        total = levels.get(price, 0) + (qty if kind == 'A' else -qty)
        if total == 0:
            levels.pop(price, None)
        else:
            levels[price] = total

    def show(levels, descending):
        top = sorted(levels, reverse=descending)[:k]
        return ' '.join(f"{p}:{levels[p]}" for p in top) if top else '-'

    print('BIDS ' + show(book['B'], True))
    print('ASKS ' + show(book['S'], False))


main()
