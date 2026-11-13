import sys


def parse(line):
    if not line.endswith('|'):
        return 'BAD_FORMAT'
    fields = line[:-1].split('|')
    values = {}
    order = []
    for f in fields:
        tag, eq, val = f.partition('=')
        if not eq or not (1 <= len(tag) <= 4 and tag.isascii() and tag.isdigit()):
            return 'BAD_FORMAT'
        if val == '' or '=' in val or tag in values:
            return 'BAD_FORMAT'
        values[tag] = val
        order.append(tag)
    if order[0] != '8' or order[-1] != '10':
        return 'BAD_FORMAT'
    check = values['10']
    if len(check) != 3 or not (check.isascii() and check.isdigit()):
        return 'BAD_FORMAT'
    prefix = line[:len(line) - len('10=' + check + '|')]
    if f"{sum(prefix.encode()) % 256:03d}" != check:
        return 'BAD_CHECKSUM'
    return 'OK ' + ' '.join(values.get(t, '-') for t in ('35', '55', '38', '44'))


def main():
    lines = sys.stdin.read().split('\n')
    t = int(lines[0])
    print('\n'.join(parse(line) for line in lines[1:1 + t]))


main()
