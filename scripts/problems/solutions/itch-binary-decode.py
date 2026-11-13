import sys


def hv(c):
    return '0123456789abcdef'.index(c.lower())


def main():
    lines = sys.stdin.read().split('\n')
    n = int(lines[0])
    expected = 1
    book = {}
    shares = 0
    out = []
    for ln in lines[1:1 + n]:
        ln = ln.strip()
        if len(ln) % 2 == 1 or len(ln) < 10:
            out.append("ERR LENGTH -")
            continue
        b = [hv(ln[i]) * 16 + hv(ln[i + 1]) for i in range(0, len(ln), 2)]
        seq = 0
        for x in b[:4]:
            seq = seq * 256 + x
        if seq < expected:
            out.append("DUP %d" % seq)
            continue
        if seq > expected:
            out.append("GAP %d %d" % (expected, seq - 1))
        expected = seq + 1
        ty = b[4]
        if ty == 0x41:
            need = 22
        elif ty in (0x58, 0x45):
            need = 17
        else:
            out.append("ERR TYPE %d" % seq)
            continue
        if ty == 0x41 and len(b) == 22 and b[13] not in (0x42, 0x53):
            out.append("ERR TYPE %d" % seq)
            continue
        if len(b) != need:
            out.append("ERR LENGTH %d" % seq)
            continue
        oid = 0
        for x in b[5:13]:
            oid = oid * 256 + x
        qo = 14 if ty == 0x41 else 13
        q = 0
        for x in b[qo:qo + 4]:
            q = q * 256 + x
        if ty == 0x41:
            if oid in book:
                out.append("ERR DUPID %d" % seq)
            else:
                book[oid] = q
        elif oid not in book:
            out.append("ERR UNKNOWN %d" % seq)
        elif q > book[oid]:
            out.append("ERR OVERFLOW %d" % seq)
        else:
            book[oid] -= q
            if ty == 0x45:
                shares += q
            if book[oid] == 0:
                del book[oid]
    out.append("BOOK %d" % len(book))
    out.append("SHARES %d" % shares)
    print('\n'.join(out))


main()
