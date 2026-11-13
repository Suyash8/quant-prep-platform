import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import *
NEW = dict(title='FIX Message Parser', difficulty='medium', category='strings', tags=['strings', 'parsing', 'checksum', 'fix-protocol'], estMinutes=35,
    statement=[p('The FIX protocol sends orders as a list of `tag=value` fields separated by the SOH control character (byte 1). To keep the input readable, **each SOH is written as the character `|`**, and every field, including the last, ends with `|`.'),
               p('For each message line, decide whether it is valid and extract a few fields. A message is **well formed** when: it ends with `|`; every field has the form `tag=value` where the tag is 1 to 4 digits and the value is not empty and contains no `=`; no tag appears twice; the first field has tag `8`; and the last field has tag `10` with a value of exactly 3 digits. Otherwise print `BAD_FORMAT`.'),
               p('A well formed message must also have the right **checksum**. Add the byte values (ASCII codes, with `|` counted as 1, the SOH value) of every character from the start of the line up to and including the `|` that ends the field just before `10=`. Take the sum modulo 256 and write it as three digits with leading zeros. If it differs from the value of tag 10 print `BAD_CHECKSUM`. If it matches, print `OK` followed by the values of tags 35, 55, 38 and 44 in this order, using `-` for a missing tag.')],
    inputFormat='First line: $t$. Then $t$ lines, each one message with no spaces.',
    outputFormat='One line per message: `BAD_FORMAT`, `BAD_CHECKSUM`, or `OK v35 v55 v38 v44`. Format errors take priority over checksum errors.',
    constraints=['$1 \\le t \\le 10^4$', 'Each line has at most 400 characters and contains only printable ASCII without spaces', 'Tag numbers are compared as text, so `55` and `055` are different tags'],
    hints=['Check the format first with a loop over fields split on |. Then compute the checksum over the prefix that ends right before the tag 10 field.', 'Compute the sum of bytes with ord() or by casting to unsigned char, then take it modulo 256 and format with three digits, e.g. f"{x:03d}".'],
    editorial=[p('Splitting on `|` gives the fields; the final empty piece after the trailing `|` is dropped. After the format checks pass, the prefix for the checksum is the whole line minus the last field (`10=NNN|`). The checksum is `sum(bytes(prefix)) % 256` printed as 3 digits.'),
               p('Real FIX uses byte 1 as the delimiter and the same rule, so a parser that works here ports directly. Note the order of checks: a message with a duplicate tag is `BAD_FORMAT` even if its checksum happens to be correct.')],
    lessons=['tsmd-exchange-protocols', 'tsmd-connectivity'])
def cks(prefix): return f"{sum(prefix.encode()) % 256:03d}"
def oracle(inp):
    lines = inp.split('\n'); t = int(lines[0]); out = []
    for ln in lines[1:1 + t]:
        out.append(one(ln))
    return '\n'.join(out)
def one(ln):
    if not ln.endswith('|'): return 'BAD_FORMAT'
    body = ln[:-1]
    parts = body.split('|') if body else []
    if not parts: return 'BAD_FORMAT'
    tags = []; vals = {}
    for f in parts:
        if '=' not in f: return 'BAD_FORMAT'
        tag, _, val = f.partition('=')
        if not (1 <= len(tag) <= 4 and tag.isdigit() and tag.isascii()): return 'BAD_FORMAT'
        if val == '' or '=' in val: return 'BAD_FORMAT'
        if tag in vals: return 'BAD_FORMAT'
        vals[tag] = val; tags.append(tag)
    if tags[0] != '8' or tags[-1] != '10': return 'BAD_FORMAT'
    if not (len(vals['10']) == 3 and vals['10'].isdigit() and vals['10'].isascii()): return 'BAD_FORMAT'
    prefix = ln[:len(ln) - len('10=' + vals['10'] + '|')]
    if cks(prefix) != vals['10']: return 'BAD_CHECKSUM'
    return 'OK ' + ' '.join(vals.get(k, '-') for k in ('35', '55', '38', '44'))
def mk(fields):
    pre = ''.join(f + '|' for f in fields); return pre + '10=' + cks(pre) + '|'
def gen(r):
    t = r.randint(1, 5); rows = []
    for _ in range(t):
        f = ['8=FIX.4.2', '35=' + r.choice('DG8')]
        for tg, vv in (('55', r.choice(['AAPL', 'MSFT', 'X'])), ('38', str(r.randint(1, 500))), ('44', f"{r.randint(1, 9999) / 100:.2f}"), ('34', str(r.randint(1, 99)))):
            if r.random() < .7: f.append(tg + '=' + vv)
        m = mk(f); k = r.random()
        if k < .15: m = m.replace('=', '', 1) if r.random() < .5 else m[:-1]
        elif k < .3: m = m[:-4] + str((int(m[-4:-1]) + 1) % 1000).zfill(3) + '|'
        elif k < .4: m = mk(f + [f[-1]])
        elif k < .5: m = mk(['35=D'] + f[1:])
        elif k < .6: m = mk(f + ['999999=1'])
        rows.append(m)
    return f"{t}\n" + '\n'.join(rows) + '\n'
EXAMPLES = ['2\n' + mk(['8=FIX.4.2', '35=D', '55=AAPL', '38=100', '44=150.25']) + '\n8=FIX.4.2|35=0|10=000|\n']
EDGE = ['1\n8=FIX.4.2|10=000|\n', '1\n' + mk(['8=FIX.4.2', '35=8', '55=X']) + '\n', '1\n' + mk(['8=FIX.4.2', '55=A', '55=B']) + '\n', '1\n8=FIX.4.2|35=D|10=12|\n', '1\n' + mk(['8=FIX.4.2', '35=D', '44=']) + '\n', '1\n' + mk(['8=FIX.4.2', '0055=A']) + '\n', '1\n8=FIX.4.2|10=000\n', '1\n' + mk(['8=FIX.4.2', '35=D', '38=5', '44=1.5']) + '\n']
def BIG():
    r = random.Random(161); rows = []
    for _ in range(10000):
        f = ['8=FIX.4.4', '35=D', '55=SYM' + str(r.randint(1, 999)), '38=' + str(r.randint(1, 10**6)), '44=' + f"{r.randint(1, 10**5) / 100:.2f}"]
        rows.append(mk(f))
    return ["10000\n" + '\n'.join(rows) + '\n']
