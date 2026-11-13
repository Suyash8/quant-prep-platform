import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
from collections import deque
NEW = dict(title='SPSC Ring Buffer', difficulty='medium', category='systems-design', tags=['systems-design', 'ring-buffer', 'queues', 'low-latency'], estMinutes=30,
    statement=[p('A single-producer single-consumer ring buffer has $c$ slots, indexed $0$ to $c-1$, and two indices: `head` (next slot to read) and `tail` (next slot to write). Both start at 0 and wrap around modulo $c$. To tell a full buffer from an empty one without a counter, **one slot is always left unused**: the buffer is empty when `head == tail` and full when `(tail + 1) mod c == head`. So it holds at most $c - 1$ items.'),
               p('Simulate a stream of operations. `PUSH x` writes $x$ at `tail` and advances `tail` unless the buffer is full, in which case it prints `FULL` and changes nothing. `POP` reads at `head` and advances `head`, or prints `EMPTY` if the buffer is empty. A successful push prints `OK`; a successful pop prints the value read.')],
    inputFormat='First line: $c$ and $t$. Then $t$ operations, one per line: `PUSH x` or `POP`.',
    outputFormat='One line per operation as described. After the last operation print `HEAD h TAIL t SIZE s` where $s$ is the number of items currently stored.',
    constraints=['$2 \\le c \\le 10^6$, $1 \\le t \\le 2 \\cdot 10^5$', '$-10^9 \\le x \\le 10^9$', 'Operations are applied strictly in the given order'],
    hints=['Do not track a size counter for the full test. Use the rule (tail + 1) % c == head.', 'The size is (tail - head + c) % c.'],
    editorial=[p('With one slot kept free, `head == tail` can only mean empty, so a producer and a consumer can each update only their own index. That is what makes the structure safe without locks: the producer writes `tail`, the consumer writes `head`, and each only reads the other.'),
               p('The price is one wasted slot. A power-of-two capacity would let you replace `% c` with a bit mask, which is why production buffers usually use it. Here $c$ is arbitrary, so use the modulo.')],
    lessons=['ds-stacks-queues', 'll-user-space-techniques', 'cpp-lock-free'])
def oracle(inp):
    lines = inp.strip().split('\n'); c, t = map(int, lines[0].split()); q = deque(); pushes = pops = 0; out = []
    for ln in lines[1:1 + t]:
        p = ln.split()
        if p[0] == 'PUSH':
            if len(q) == c - 1: out.append('FULL')
            else: q.append(int(p[1])); pushes += 1; out.append('OK')
        else:
            if not q: out.append('EMPTY')
            else: out.append(str(q.popleft())); pops += 1
    out.append(f"HEAD {pops % c} TAIL {pushes % c} SIZE {len(q)}")
    return '\n'.join(out)
def gen(r):
    c = r.randint(2, 5); t = r.randint(1, 20); return f"{c} {t}\n" + ''.join((f"PUSH {r.randint(-9, 9)}\n" if r.random() < .55 else "POP\n") for _ in range(t))
EXAMPLES = ['4 8\nPUSH 1\nPUSH 2\nPUSH 3\nPUSH 4\nPOP\nPUSH 5\nPOP\nPOP\n']
EDGE = ['2 4\nPUSH 1\nPUSH 2\nPOP\nPOP\n', '3 3\nPOP\nPOP\nPOP\n', '5 6\nPUSH -1000000000\nPUSH 1000000000\nPOP\nPOP\nPOP\nPUSH 0\n', '3 7\nPUSH 1\nPUSH 2\nPUSH 3\nPOP\nPUSH 3\nPOP\nPOP\n']
def BIG():
    r = random.Random(131); t = 200000
    return [f"1000000 {t}\n" + ''.join((f"PUSH {r.randint(-10**9, 10**9)}\n" if r.random() < .5 else "POP\n") for _ in range(t)), f"2 {t}\n" + ''.join((f"PUSH {i}\n" if i % 2 == 0 else "POP\n") for i in range(t))]
