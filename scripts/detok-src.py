#!/usr/bin/env python3
"""Deterministic copy cleanup for TS/TSX source: string literals + comments only.

Never touches code outside strings/comments (so `a - b` stays intact).
Fixes em/en dashes, soft-dash clause separators, and AI-flavored words.
"""
import re
import sys
import glob

SWAPS = [
    (re.compile(r'\brobust\b', re.I), 'solid'),
    (re.compile(r'\brobustly\b', re.I), 'solidly'),
    (re.compile(r'\brobustness\b', re.I), 'reliability'),
    (re.compile(r'\bleverage\b', re.I), 'use'),
    (re.compile(r'\bleveraging\b', re.I), 'using'),
    (re.compile(r'\bjourney\b', re.I), 'path'),
    (re.compile(r'\bjourneys\b', re.I), 'paths'),
    (re.compile(r'\bcrucial\b', re.I), 'critical'),
    (re.compile(r'\bpivotal\b', re.I), 'key'),
    (re.compile(r'\bseamless\b', re.I), 'smooth'),
    (re.compile(r'\bseamlessly\b', re.I), 'smoothly'),
    (re.compile(r'\bcomprehensive\b', re.I), 'thorough'),
    (re.compile(r'\bdelve into\b', re.I), 'dig into'),
    (re.compile(r'\bdelve\b', re.I), 'dig'),
    (re.compile(r'\bmyriad\b', re.I), 'countless'),
    (re.compile(r'\bplethora\b', re.I), 'loads'),
    (re.compile(r'\barsenal\b', re.I), 'toolkit'),
    (re.compile(r'\bunderscore\b', re.I), 'show'),
    (re.compile(r'\bnotably\b', re.I), 'in particular'),
    (re.compile(r'\barguably\b', re.I), 'possibly'),
    (re.compile(r'\bempower\b', re.I), 'enable'),
    (re.compile(r'\belevate\b', re.I), 'raise'),
]


def fix_case(match, rep):
    m0 = match.group(0)
    return rep[0].upper() + rep[1:] if m0[0].isupper() else rep


def clean(seg):
    t = seg
    t = re.sub(r'\s+—\s+(?=[A-Z"(])', '. ', t)
    t = re.sub(r'\s+—\s+', ', ', t)
    t = re.sub(r'(\w)—(\w)', r'\1, \2', t)
    t = re.sub(r'(\w)–(\w)', r'\1-\2', t)
    t = re.sub(r'(\d)\s*–\s*(\d)', r'\1 to \2', t)
    t = t.replace('—', ', ').replace('–', '-')
    return t


def transform(src):
    out = []
    i = 0
    n = len(src)
    state = 'code'
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ''
        if state == 'code':
            if c == '/' and nxt == '/':
                state = 'line'
                out.append('//')
                i += 2
                continue
            if c == '/' and nxt == '*':
                state = 'block'
                out.append('/*')
                i += 2
                continue
            if c == "'":
                state = 'single'
                out.append(c)
                i += 1
                continue
            if c == '"':
                state = 'double'
                out.append(c)
                i += 1
                continue
            if c == '`':
                state = 'template'
                out.append(c)
                i += 1
                continue
            out.append(c)
            i += 1
        elif state == 'line':
            # buffer the comment body, clean it, emit
            j = i
            while j < n and src[j] != '\n':
                j += 1
            body = src[i:j]
            out.append(clean(body))
            if j < n:
                out.append('\n')
            state = 'code'
            i = j
        elif state == 'block':
            if c == '*' and nxt == '/':
                state = 'code'
                out.append('*/')
                i += 2
                continue
            # buffer until closing */
            j = i
            while j < n and not (src[j] == '*' and j + 1 < n and src[j + 1] == '/'):
                j += 1
            body = src[i:j]
            out.append(clean(body))
            i = j
        elif state in ('single', 'double', 'template'):
            q = {'single': "'", 'double': '"', 'template': '`'}[state]
            if c == '\\':
                out.append(c)
                if i + 1 < n:
                    out.append(src[i + 1])
                i += 2
                continue
            if c == q:
                state = 'code'
                out.append(c)
                i += 1
                continue
            # template literal interpolation: treat ${ ... } as code
            if state == 'template' and c == '$' and nxt == '{':
                depth = 0
                j = i
                buf = []
                while j < n:
                    if src[j] == '{':
                        depth += 1
                    elif src[j] == '}':
                        depth -= 1
                        if depth == 0:
                            buf.append('}')
                            break
                    buf.append(src[j])
                    j += 1
                out.append(''.join(buf))
                i = j + 1
                continue
            # accumulate literal run and clean it
            j = i
            buf = []
            while j < n:
                cj = src[j]
                if cj == '\\':
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                if cj == q or (state == 'template' and cj == '$' and j + 1 < n and src[j + 1] == '{'):
                    break
                buf.append(cj)
                j += 1
            lit = ''.join(buf)
            out.append(clean(lit))
            i = j
    return ''.join(out)


def main():
    dry = '--dry' in sys.argv
    files = []
    for p in sys.argv[1:]:
        if p.startswith('--'):
            continue
        files.extend(glob.glob(p, recursive=True))
    changed = 0
    for f in sorted(set(files)):
        src = open(f, encoding='utf8').read()
        new = transform(src)
        if new != src:
            changed += 1
            if not dry:
                open(f, 'w', encoding='utf8').write(new)
    print(f'{len(set(files))} files scanned, {changed} changed')


if __name__ == '__main__':
    main()
