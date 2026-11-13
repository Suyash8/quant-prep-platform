def fmt(c): return f"{c // 100}.{c % 100:02d}"
def oracle(inp):
    lines = inp.strip().split('\n'); n = int(lines[0]); resting = {'B': [], 'S': []}; seq = 0; out = []
    for ln in lines[1:1 + n]:
        p = ln.split()
        if p[0] == 'L':
            seq += 1; resting[p[1]].append([int(p[2]), seq, int(p[3])])
        else:
            opp = 'S' if p[1] == 'B' else 'B'; rem = int(p[2])
            while rem > 0 and resting[opp]:
                best = min(resting[opp], key=lambda o: (o[0], o[1]) if opp == 'S' else (-o[0], o[1]))
                f = min(rem, best[2]); out.append(f"T {fmt(best[0])} {f}"); rem -= f; best[2] -= f
                if best[2] == 0: resting[opp].remove(best)
    bid = max((o[0] for o in resting['B']), default=None); ask = min((o[0] for o in resting['S']), default=None)
    out.append('BID ' + (fmt(bid) if bid is not None else '-')); out.append('ASK ' + (fmt(ask) if ask is not None else '-'))
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 14); ev = []
    for _ in range(n):
        if r.random() < .6: ev.append(f"L {r.choice('BS')} {r.randint(98, 103)} {r.randint(1, 9)}")
        else: ev.append(f"M {r.choice('BS')} {r.randint(1, 20)}")
    return f"{n}\n" + '\n'.join(ev) + '\n'
EDGE = ['1\nM B 5\n', '3\nL B 1000000 1000000\nM S 1000000\nM S 1\n', '5\nL S 100 5\nL S 100 5\nL S 99 3\nM B 4\nM B 9\n', '4\nL B 100 5\nL B 101 5\nL B 100 5\nM S 12\n', '4\nL S 100 3\nL B 105 4\nM S 2\nM B 1\n']
def BIG():
    import random
    r = random.Random(4); ev = []
    for _ in range(2000):
        if r.random() < .6: ev.append(f"L {r.choice('BS')} {r.randint(900, 1100)} {r.randint(1, 1000)}")
        else: ev.append(f"M {r.choice('BS')} {r.randint(1, 3000)}")
    return ["2000\n" + '\n'.join(ev) + '\n']
PATCH = [("BID x.xx or BID, (best remaining bid)", "BID x.xx (best remaining bid) or BID - when no bid remains"), ("ASK x.xx or ASK, (best remaining ask)", "ASK x.xx (best remaining ask) or ASK - when no ask remains"), ("-> BID, / ASK 10.08", "-> BID - / ASK 10.08")]
