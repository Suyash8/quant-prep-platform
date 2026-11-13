import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Order Book Depth', difficulty='medium', category='systems-design', tags=['systems-design', 'order-book', 'hashing', 'sorting'], estMinutes=30,
    statement=[p('A market data handler rebuilds a depth-of-book view from a message stream. Each message either adds quantity at a price level or removes quantity from it. After the whole stream, print the **top $k$ price levels** on each side with their total resting quantity.'),
               p('Bids are ordered from the highest price down, asks from the lowest price up. Levels whose quantity reaches zero disappear. A side with fewer than $k$ levels prints all it has, and an empty side prints `-`.')],
    inputFormat='First line: $n$ and $k$. Then $n$ messages, one per line: `A side price qty` adds $qty$ at $price$ on `side` (`B` or `S`); `C side price qty` removes $qty$ from that level.',
    outputFormat='Two lines. The first starts with `BIDS`, the second with `ASKS`. Each is followed by up to $k$ levels written `price:qty` separated by spaces, or by `-` when the side is empty.',
    constraints=['$1 \\le n \\le 2 \\cdot 10^5$, $1 \\le k \\le 10$', '$1 \\le price \\le 10^9$, $1 \\le qty \\le 10^9$', 'A remove never takes more than the level currently holds; level totals fit in 64 bits'],
    hints=['Keep one hash map per side from price to total quantity. Delete the key when the quantity reaches 0.', 'Sort only at the end: the whole stream costs O(n), and sorting the surviving levels costs O(L log L).'],
    editorial=[p('Aggregating as the stream arrives needs only a hash map per side. Only the final snapshot is requested, so the levels can be sorted once at the end. If you needed the top of book after every message, a sorted map or heap would be the right structure instead.'),
               p('Deleting zero-quantity levels matters: a stale level with quantity 0 would show up in the depth and hide the next real level.')],
    lessons=['mic-order-books', 'qalg-orderbook-structures'])
def oracle(inp):
    lines = inp.strip().split('\n'); n, k = map(int, lines[0].split()); book = {'B': {}, 'S': {}}
    for ln in lines[1:1 + n]:
        ty, side, pr, q = ln.split(); pr, q = int(pr), int(q); lv = book[side]
        lv[pr] = lv.get(pr, 0) + (q if ty == 'A' else -q)
        if lv[pr] == 0: del lv[pr]
    def show(lv, rev):
        ks = sorted(lv, reverse=rev)[:k]; return ' '.join(f"{x}:{lv[x]}" for x in ks) if ks else '-'
    return 'BIDS ' + show(book['B'], True) + '\nASKS ' + show(book['S'], False)
def gen(r):
    n = r.randint(1, 14); book = {'B': {}, 'S': {}}; ev = []
    for _ in range(n):
        side = r.choice('BS'); lv = book[side]
        if lv and r.random() < .4:
            pr = r.choice(list(lv)); q = r.randint(1, lv[pr]); ev.append(f"C {side} {pr} {q}"); lv[pr] -= q
            if not lv[pr]: del lv[pr]
        else:
            pr = r.randint(1, 8); q = r.randint(1, 9); ev.append(f"A {side} {pr} {q}"); lv[pr] = lv.get(pr, 0) + q
    return f"{len(ev)} {r.randint(1, 4)}\n" + '\n'.join(ev) + '\n'
EXAMPLES = ['6 2\nA B 100 5\nA B 99 7\nA B 100 3\nA S 101 4\nC B 99 7\nA S 102 1\n']
EDGE = ['1 1\nA B 1 1\n', '2 3\nA S 1000000000 1000000000\nC S 1000000000 1000000000\n', '5 2\nA B 5 1\nA B 6 1\nA B 7 1\nA S 8 2\nA S 9 2\n', '4 10\nA B 1 1\nA B 1 1\nC B 1 2\nA S 2 2\n', '3 1\nA S 3 1\nA S 2 1\nA S 1 1\n']
def BIG():
    r = random.Random(121); ev = []; book = {'B': {}, 'S': {}}
    for _ in range(200000):
        side = r.choice('BS'); lv = book[side]
        if lv and r.random() < .3:
            pr = r.choice(list(lv)); q = r.randint(1, lv[pr]); ev.append(f"C {side} {pr} {q}"); lv[pr] -= q
            if not lv[pr]: del lv[pr]
        else:
            pr = r.randint(1, 5000); q = r.randint(1, 1000); ev.append(f"A {side} {pr} {q}"); lv[pr] = lv.get(pr, 0) + q
    return ["200000 10\n" + '\n'.join(ev) + '\n']
