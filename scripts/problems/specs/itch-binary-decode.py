import sys, os, random, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='Binary Market Data Decoder', difficulty='hard', category='systems', tags=['systems', 'parsing', 'binary-protocols', 'simulation'], estMinutes=50,
    statement=[p('A feed handler receives binary packets, given here as hex strings (two hex digits per byte, upper or lower case). All integers are big endian. Every packet starts with a 4 byte sequence number and a 1 byte type:'),
               {'type': 'table', 'headers': ['Type', 'Body', 'Total bytes'], 'rows': [['`A` (0x41) add', 'id (8), side (1: `B` or `S`), qty (4), price (4)', '22'], ['`X` (0x58) cancel', 'id (8), qty (4)', '17'], ['`E` (0x45) execute', 'id (8), qty (4)', '17']]},
               p('Expected sequence starts at 1. Process packets in order:'),
               {'type': 'list', 'ordered': False, 'items': ['A packet with fewer than 5 bytes (or an odd number of hex digits) prints `ERR LENGTH -` and does not touch the sequence state.', 'If $\\text{seq} < \\text{expected}$, print `DUP seq` and ignore the packet completely.', 'If $\\text{seq} > \\text{expected}$, print `GAP expected seq-1` (the missing range, inclusive) and continue with this packet. After this check, set expected to $\\text{seq}+1$, even if the packet turns out to be invalid.', 'Unknown type byte, or an `A` with a side other than `B`/`S`: print `ERR TYPE seq`. Wrong total length for the type: print `ERR LENGTH seq`.', '`A` adds a live order with that id and quantity; if the id is already live print `ERR DUPID seq` and change nothing.', '`X` and `E` reduce the live quantity of the order. Unknown id: print `ERR UNKNOWN seq`. Quantity larger than the remaining quantity: print `ERR OVERFLOW seq` and change nothing. An order whose remaining quantity reaches 0 is removed. `E` also adds its quantity to the executed total.']},
               p('A valid packet prints nothing. After all packets print `BOOK n` (number of live orders) and `SHARES m` (executed total). Ids are compared as 64-bit numbers, so upper and lower case hex are the same id.')],
    inputFormat='First line: $n$. Then $n$ lines, each a hex string.',
    outputFormat='Event lines in packet order, then `BOOK n` and `SHARES m`.',
    constraints=['$1 \\le n \\le 10^5$', 'Each line has at most 64 hex digits', 'Quantities of valid `A`, `X`, `E` packets are at least 1'],
    hints=['Decode bytes by hand: two hex digits per byte, then fold big endian into an integer.', 'Check the sequence number first, then the type, then the length, then the order book.'],
    editorial=[p('The order of checks defines the output. Sequence handling comes first and is applied even to invalid packets; then the type and length are checked; only a fully valid packet touches the book.'),
               p('Use 64-bit integers for the executed total and keep ids as 64-bit values or normalised lower case strings.')],
    lessons=['tsmd-exchange-protocols', 'tsmd-market-data-path', 'cf-binary-hex'])
def oracle(inp):
    lines = inp.split('\n'); n = int(lines[0]); exp_ = 1; book = {}; sh = 0; out = []
    for ln in lines[1:1 + n]:
        ln = ln.strip()
        if len(ln) % 2 or len(ln) < 10: out.append('ERR LENGTH -'); continue
        b = bytes.fromhex(ln); seq = struct.unpack('>I', b[:4])[0]
        if seq < exp_: out.append(f'DUP {seq}'); continue
        if seq > exp_: out.append(f'GAP {exp_} {seq - 1}')
        exp_ = seq + 1; ty = chr(b[4])
        need = {'A': 22, 'X': 17, 'E': 17}.get(ty)
        if need is None or (ty == 'A' and len(b) == 22 and chr(b[13]) not in 'BS'): out.append(f'ERR TYPE {seq}'); continue
        if len(b) != need: out.append(f'ERR LENGTH {seq}'); continue
        oid = struct.unpack('>Q', b[5:13])[0]
        if ty == 'A':
            q = struct.unpack('>I', b[14:18])[0]
            if oid in book: out.append(f'ERR DUPID {seq}')
            else: book[oid] = q
        else:
            q = struct.unpack('>I', b[13:17])[0]
            if oid not in book: out.append(f'ERR UNKNOWN {seq}')
            elif q > book[oid]: out.append(f'ERR OVERFLOW {seq}')
            else:
                book[oid] -= q
                if ty == 'E': sh += q
                if book[oid] == 0: del book[oid]
    out += [f'BOOK {len(book)}', f'SHARES {sh}']
    return '\n'.join(out)
def pa(seq, oid, side, q, pr): return struct.pack('>IBQcII', seq, 65, oid, side, q, pr).hex()
def pxe(seq, ty, oid, q): return struct.pack('>IBQI', seq, ty, oid, q).hex()
def stream(r, n, bad=0.15):
    seq = 1; live = {}; ls = []; mx = 6
    for _ in range(n):
        a = r.random()
        if a < .45 or not live:
            oid = r.randint(1, mx) if r.random() < .1 else r.randint(1, 2**64 - 1); q = r.randint(1, 1000)
            pk = pa(seq, oid, r.choice([b'B', b'S']), q, r.randint(1, 10**6)); live.setdefault(oid, q)
        else:
            oid = r.choice(list(live)); q = r.randint(1, live[oid]); ty = r.choice([69, 88])
            pk = pxe(seq, ty, oid, q); live[oid] -= q
            if live[oid] == 0: del live[oid]
        seq += 1
        if r.random() < bad:
            k = r.randint(0, 7)
            if k == 0: seq += r.randint(1, 3)
            elif k == 1: pk = pxe(max(1, seq - r.randint(2, 5)), 69, r.randint(1, 5), 1)
            elif k == 2: pk = pk[:-2]
            elif k == 3: pk = pk[:8] + '5a' + pk[10:]
            elif k == 4: pk = pk[:5]
            elif k == 5: pk = pxe(seq - 1, r.choice([69, 88]), r.randint(1, 2**64 - 1), r.randint(1, 5))
            elif k == 6: pk = pk.upper()
            else: pk = pk + '00'
        ls.append(pk)
    return f"{len(ls)}\n" + '\n'.join(ls) + '\n'
def gen(r): return stream(r, r.randint(1, 15))
EXAMPLES = ['5\n' + '\n'.join([pa(1, 7, b'B', 100, 15025), pxe(2, 69, 7, 40), pxe(4, 88, 7, 60), pxe(3, 69, 7, 1), pxe(5, 69, 9, 1)]) + '\n']
EDGE = [
 '1\n00\n', '3\n' + '\n'.join([pa(1, 1, b'B', 5, 1), pa(2, 1, b'S', 5, 1), pxe(3, 69, 1, 6)]) + '\n',
 '2\n' + '\n'.join([pa(1, 2**64 - 1, b'S', 4294967295, 4294967295), pxe(2, 69, 2**64 - 1, 4294967295)]) + '\n',
 '4\n' + '\n'.join([pa(1, 255, b'X', 5, 1), pa(2, 255, b'B', 5, 1).upper(), pxe(3, 69, 0xff, 5).upper(), pxe(1, 88, 255, 1)]) + '\n',
 '3\n' + '\n'.join([pxe(10, 88, 1, 1), pa(11, 1, b'B', 1, 1)[:-2], pa(12, 1, b'B', 1, 1)]) + '\n']
def BIG():
    r = random.Random(177); return [stream(r, 25000, 0.05)]
ORACLE_MAX = 100000
