import sys
from collections import OrderedDict


def main():
    lines = sys.stdin.read().split('\n')
    cap, t = map(int, lines[0].split())
    cache = OrderedDict()
    out = []
    for line in lines[1:1 + t]:
        p = line.split()
        if p[0] == 'PUT':
            key, val = p[1], int(p[2])
            if key in cache:
                cache.move_to_end(key)
            cache[key] = val
            if len(cache) > cap:
                cache.popitem(last=False)
        else:
            key = p[1]
            if key in cache:
                cache.move_to_end(key)
                out.append(str(cache[key]))
            else:
                out.append('MISS')
    print('\n'.join(out))


main()
