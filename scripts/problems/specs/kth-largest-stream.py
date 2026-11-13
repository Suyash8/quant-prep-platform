import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='K-th Largest in a Stream', difficulty='medium', category='heaps', tags=['heaps', 'streaming', 'priority-queue'], estMinutes=25,
    statement=[p('A leaderboard shows the $k$-th largest trade size seen so far. After each new trade size arrives, report the $k$-th largest value among all sizes received up to that moment. Equal sizes count separately, so for sizes $5, 5, 3$ the 2nd largest is $5$.'),
               p('If fewer than $k$ sizes have arrived, print `-1` for that step.')],
    inputFormat='First line: $n$ and $k$. Second line: $n$ integers, the stream in arrival order.',
    outputFormat='$n$ lines. Line $i$ is the $k$-th largest of the first $i$ values, or `-1` when $i < k$.',
    constraints=['$1 \\le k \\le n \\le 2 \\cdot 10^5$', '$-10^9 \\le a_i \\le 10^9$'],
    hints=['You only ever need the k largest values. A min-heap of size k keeps exactly those, with the k-th largest on top.', 'When a value arrives and the heap already holds k items, it matters only if it is larger than the top.'],
    editorial=[p('Maintain a min-heap holding the $k$ largest values so far. Its top is the $k$-th largest. A new value is pushed; if the heap then has more than $k$ items, the smallest is popped. Each step costs $O(\\log k)$, so the whole stream costs $O(n \\log k)$.'),
               p('Sorting the prefix after every arrival costs $O(n^2 \\log n)$. The heap works because values smaller than the current $k$-th largest can never become the $k$-th largest again: the set of the top $k$ only improves.')],
    lessons=['ds-advanced-structures', 'qalg-streaming'])
def oracle(inp):
    t = list(map(int, inp.split())); n, k = t[0], t[1]; a = t[2:2 + n]
    return '\n'.join(str(sorted(a[:i], reverse=True)[k - 1]) if i >= k else '-1' for i in range(1, n + 1))
def gen(r):
    n = r.randint(1, 12); k = r.randint(1, n); return f"{n} {k}\n{' '.join(str(r.randint(-6, 6)) for _ in range(n))}\n"
EXAMPLES = ['6 3\n4 5 8 2 9 1\n', '4 2\n5 5 3 7\n']
EDGE = ['1 1\n7\n', '3 3\n1 2 3\n', '5 1\n3 1 4 1 5\n', '5 5\n5 4 3 2 1\n', '6 2\n-1000000000 1000000000 1000000000 0 0 0\n']
def BIG():
    r = random.Random(91); n = 200000
    return [f"{n} 1000\n" + ' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n)) + '\n', f"{n} {n}\n" + ' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n)) + '\n']
