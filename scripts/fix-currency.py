#!/usr/bin/env python3
"""Fix currency-in-math escapes: $\\$N$ inside math delimiters renders wrong.
Per content README, currency must be escaped OUTSIDE math: \\$N."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, 'content', 'lessons')

FILES = ['bt-strategy-evaluation', 'mic-matching', 'fi-duration-convexity',
         'opt-black-scholes', 'geo-unit-circle']

def fix_text(s: str) -> str:
    # pattern: $\$1,234.56$ (math-wrapped escaped currency) -> \$1,234.56
    # after JSON load, the raw string contains: $\$ ... $  (backslash-dollar inside dollars)
    out = re.sub(r'\$\\\$([0-9][0-9.,]*)\$', r'\\$\1', s)
    return out

total = 0
for name in FILES:
    for mod in os.listdir(LDIR):
        p = os.path.join(LDIR, mod, name + '.json')
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        n = 0
        def walk(obj):
            global n
            if isinstance(obj, str):
                new = fix_text(obj)
                if new != obj:
                    n += 1
                return new
            if isinstance(obj, list):
                return [walk(x) for x in obj]
            if isinstance(obj, dict):
                return {k: walk(v) for k, v in obj.items()}
            return obj
        d2 = walk(d)
        if n:
            with open(p, 'w') as f:
                json.dump(d2, f, indent=2, ensure_ascii=False)
                f.write('\n')
        print(f'{name}: {n} strings fixed')
        total += n
        break
print(f'total: {total}')
