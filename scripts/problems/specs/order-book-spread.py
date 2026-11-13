import random
def fmt(c): return f"{c // 100}.{c % 100:02d}"
def oracle(inp):
    lines = inp.strip().split('\n'); n = int(lines[0]); book = {'B': {}, 'S': {}}; out = []
    for ln in lines[1:1 + n]:
        ty, side, price, qty = ln.split(); price = int(price); qty = int(qty)
        lv = book[side]
        if ty == 'A': lv[price] = lv.get(price, 0) + qty
        else:
            lv[price] -= qty
            if lv[price] == 0: del lv[price]
        bid = max(book['B']) if book['B'] else None; ask = min(book['S']) if book['S'] else None
        out.append(' '.join([fmt(bid) if bid is not None else '-', fmt(ask) if ask is not None else '-', fmt(ask - bid) if bid is not None and ask is not None else '-']))
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 14); ev = []; book = {'B': {}, 'S': {}}
    for _ in range(n):
        side = r.choice('BS'); lv = book[side]
        if lv and r.random() < .4:
            p = r.choice(list(lv)); q = r.randint(1, lv[p]); ev.append(f"C {side} {p} {q}"); lv[p] -= q
            if lv[p] == 0: del lv[p]
        else:
            p = r.randint(995, 1000) if side == 'B' else r.randint(1000, 1005)
            ob = book['S' if side == 'B' else 'B']
            if side == 'B' and ob and p > min(ob): p = min(ob)
            if side == 'S' and ob and p < max(ob): p = max(ob)
            q = r.randint(1, 9); ev.append(f"A {side} {p} {q}"); lv[p] = lv.get(p, 0) + q
    return f"{len(ev)}\n" + '\n'.join(ev) + '\n'
EDGE = ['1\nA B 1 1\n', '3\nA B 1000000 1000000\nA S 1000000 1\nC S 1000000 1\n', '4\nA B 1000 5\nA S 1000 5\nC B 1000 5\nC S 1000 5\n', '3\nA S 100 1000000\nC S 100 999999\nC S 100 1\n']
PATCH = [("a single dash, in its place", "a single hyphen (-) in its place"), ("(best ask cents, best bid cents)", "(best ask in cents minus best bid in cents)")]
