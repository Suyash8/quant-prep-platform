import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Sliding Window Maximum', difficulty='medium', category='arrays-strings', tags=['arrays-strings', 'deque', 'sliding-window'], estMinutes=30,
    statement=[p('A monitoring service watches a stream of $n$ prices and wants the **highest price inside every window of $k$ consecutive prices**, for example the session high of the last $k$ ticks. The first window covers prices $1 \\dots k$, the next covers $2 \\dots k+1$, and so on.'),
               p('Recomputing the maximum of each window costs $O(nk)$, which is too slow at the upper limits. A monotonic deque of indices answers every window in amortised $O(1)$.')],
    inputFormat='First line: $n$ and $k$ with $1 \\le k \\le n$. Second line: $n$ integers.',
    outputFormat='$n - k + 1$ integers on one line, separated by spaces: the maximum of each window in order.',
    constraints=['$1 \\le k \\le n \\le 2 \\cdot 10^5$', '$-10^9 \\le a_i \\le 10^9$'],
    hints=['Keep a deque of indices whose values are decreasing from front to back. The front is always the maximum of the current window.', 'Before pushing index i, pop smaller values from the back. Drop the front when it falls out of the window (index <= i - k).'],
    editorial=[p('Each index is pushed once and popped at most once, so the total work is $O(n)$. Values that are smaller than a newer value can never be the maximum of any later window, because the newer one stays in the window at least as long, so they are discarded from the back.'),
               p('Store indices, not values, so you can tell when the front has left the window. Using `<` or `<=` when popping equal values does not change the answers.')],
    lessons=['alg-two-pointers-sliding', 'ds-stacks-queues'])
def oracle(inp):
    t = list(map(int, inp.split())); n, k = t[0], t[1]; a = t[2:2 + n]
    return ' '.join(str(max(a[i:i + k])) for i in range(n - k + 1))
def gen(r):
    n = r.randint(1, 12); k = r.randint(1, n); return f"{n} {k}\n{' '.join(str(r.randint(-6, 6)) for _ in range(n))}\n"
EXAMPLES = ['8 3\n1 3 -1 -3 5 3 6 7\n', '4 1\n4 2 2 9\n']
EDGE = ['1 1\n-1000000000\n', '5 5\n1 2 3 4 5\n', '6 2\n6 5 4 3 2 1\n', '6 3\n1 1 1 1 1 1\n', '7 4\n1000000000 -1000000000 1000000000 -1000000000 0 0 0\n']
def BIG():
    r = random.Random(81); n = 200000
    return [f"{n} 1000\n" + ' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n)) + '\n', f"{n} 100000\n" + ' '.join(str(i) for i in range(n)) + '\n',
            f"{n} 50000\n" + ' '.join(str(n - i) for i in range(n)) + '\n']
