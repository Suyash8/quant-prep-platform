import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Merge Trading Halts', difficulty='easy', category='arrays-strings', tags=['arrays-strings', 'sorting', 'intervals'], estMinutes=20,
    statement=[p('A surveillance system receives trading halt windows for one instrument. Each window is a closed range of seconds $[s, e]$. Overlapping halts must be reported as one continuous halt.'),
               p('Two windows are merged when they **overlap or touch**: $[1, 4]$ and $[4, 6]$ share the second 4, so they merge into $[1, 6]$. Windows such as $[1, 4]$ and $[5, 6]$ do not share a second, so they stay separate. Print the merged windows in increasing order of start.')],
    inputFormat='First line: $n$. Then $n$ lines, each with two integers $s$ and $e$ with $s \\le e$. The windows are in arbitrary order.',
    outputFormat='First line: the number $m$ of merged windows. Then $m$ lines `s e`, sorted by start.',
    constraints=['$1 \\le n \\le 10^5$', '$0 \\le s \\le e \\le 10^9$', 'Windows may be identical or nested'],
    hints=['Sort by start. Then one pass can extend the current merged window or start a new one.', 'Extend when the next start is at most the current end. Remember to take the maximum of the two ends, because a nested window must not shrink the merge.'],
    editorial=[p('Sort the windows by start and sweep. Keep the current window `[cs, ce]`. If the next start `s <= ce`, set `ce = max(ce, e)`. Otherwise emit `[cs, ce]` and start again from the new window. Sorting dominates at $O(n \\log n)$.'),
               p('The common bug is `ce = e` instead of `max(ce, e)`: a window nested inside the current one then shrinks the merge. The closed-interval rule (touching windows merge) is the second one to check.')],
    lessons=['alg-greedy-backtracking', 'alg-searching-sorting'])
def oracle(inp):
    t = list(map(int, inp.split())); n = t[0]; iv = [(t[1 + 2 * i], t[2 + 2 * i]) for i in range(n)]
    lo, hi = min(a for a, b in iv), max(b for a, b in iv)
    # mark every covered second inside each window by brute force on coordinate-compressed points is unnecessary: use pairwise union until stable
    groups = [list(x) for x in iv]
    changed = True
    while changed:
        changed = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                a, b = groups[i], groups[j]
                if a[0] <= b[1] and b[0] <= a[1]:
                    groups[i] = [min(a[0], b[0]), max(a[1], b[1])]; del groups[j]; changed = True; break
            if changed: break
    groups.sort()
    return '\n'.join([str(len(groups))] + [f"{a} {b}" for a, b in groups])
def gen(r):
    n = r.randint(1, 8); iv = []
    for _ in range(n): s = r.randint(0, 20); iv.append((s, s + r.randint(0, 6)))
    return f"{n}\n" + ''.join(f"{a} {b}\n" for a, b in iv)
EXAMPLES = ['4\n1 4\n4 6\n8 10\n9 12\n', '3\n5 5\n1 2\n3 4\n']
EDGE = ['1\n0 0\n', '2\n1 10\n3 4\n', '2\n0 1000000000\n1000000000 1000000000\n', '3\n7 9\n7 9\n7 9\n', '4\n10 11\n1 2\n2 3\n12 13\n', '3\n0 5\n6 7\n5 6\n']
def BIG():
    r = random.Random(71); iv = []
    for _ in range(100000): s = r.randint(0, 10**9 - 1000); iv.append((s, s + r.randint(0, 1000)))
    return [f"100000\n" + ''.join(f"{a} {b}\n" for a, b in iv)]
