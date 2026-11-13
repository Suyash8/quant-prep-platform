from itertools import groupby
import random
def oracle(inp):
    s = inp.strip('\n')
    return ' '.join(f"{k}{len(list(g))}" for k, g in groupby(s))
def gen(r): return ''.join(r.choice('abc') for _ in range(r.randint(1, 20))) + '\n'
EDGE = ['a\n', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n', 'abababab\n', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz\n', 'abc']
def BIG():
    r = random.Random(1); s = ''.join(c * r.randint(1, 5) for c in (r.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(300000)))[:1000000]
    return ['a' * 1000000 + '\n', s + '\n']
