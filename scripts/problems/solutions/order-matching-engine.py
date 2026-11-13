import sys
from collections import deque


def money(cents):
    return f"{cents // 100}.{cents % 100:02d}"


def main():
    lines = sys.stdin.read().split('\n')
    n = int(lines[0])
    book = {'B': {}, 'S': {}}  # side -> price -> FIFO queue of resting quantities
    out = []
    for line in lines[1:1 + n]:
        p = line.split()
        if p[0] == 'L':
            book[p[1]].setdefault(int(p[2]), deque()).append(int(p[3]))
            continue
        opp = 'S' if p[1] == 'B' else 'B'
        remaining = int(p[2])
        levels = book[opp]
        while remaining > 0 and levels:
            price = min(levels) if opp == 'S' else max(levels)
            queue = levels[price]
            while remaining > 0 and queue:
                fill = min(remaining, queue[0])
                out.append(f"T {money(price)} {fill}")
                remaining -= fill
                queue[0] -= fill
                if queue[0] == 0:
                    queue.popleft()
            if not queue:
                del levels[price]
    bid = max(book['B']) if book['B'] else None
    ask = min(book['S']) if book['S'] else None
    out.append('BID ' + (money(bid) if bid is not None else '-'))
    out.append('ASK ' + (money(ask) if ask is not None else '-'))
    print('\n'.join(out))


main()
