def oracle(inp):
    t = inp.split(); n = int(t[0]); out = []
    for i in range(n):
        x, y = int(t[1 + 2 * i]), int(t[2 + 2 * i])
        out.append('ODD' if bin(x & y).count('1') % 2 else 'EVEN')
    return '\n'.join(out)
def gen(r):
    n = r.randint(1, 6)
    def v(): return r.choice([0, 1, 2**63 - 1, r.getrandbits(63), r.getrandbits(8), 2**62])
    return f"{n}\n" + ''.join(f"{v()} {v()}\n" for _ in range(n))
EDGE = ['3\n0 0\n9223372036854775807 9223372036854775807\n4611686018427387904 4611686018427387904\n', '2\n9223372036854775807 1\n6148914691236517205 3074457345618258602\n']
