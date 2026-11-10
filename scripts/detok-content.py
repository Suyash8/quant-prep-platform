#!/usr/bin/env python3
"""Deterministic copy cleanup for all content JSON.

Fixes, in place, with git as the restore point:
  - em-dashes (—) and en-dashes (–): proper punctuation or "to" for ranges
  - soft dashes " - " used as clause separators (markdown list items untouched)
  - AI-flavored words: robust -> solid, leverage -> use, journey -> path, ...

Protects: inline math $...$, code `...`, and any key in DENY_KEYS
(ids, answers, code, tests, examples, titles, structural fields).
"""
import json
import glob
import re
import sys

DENY_KEYS = {
    'id', 'slug', 'moduleId', 'code', 'lang', 'type', 'component',
    'params', 'url', 'answer', 'answerIndex', 'answerIndices', 'tolerance',
    'keywords', 'tests', 'examples', 'solutions', 'starterFiles', 'estMinutes',
    'estHours', 'difficulty', 'order', 'color', 'track', 'prereqs',
    'prereqLessons', 'skills', 'tags', 'category', 'version', 'generatedAt',
    'timeLimitMs', 'memoryLimitMb', 'timeLimitMinutes', 'kind', 'areas',
    'prepModules', 'prepAssessments', 'tex', 'name', 'roles', 'stdin', 'stdout', 'expectedOutput', 'input',
    'output', 'language', 'seed', 'est',
}
TITLE_KEYS = {'title', 'front', 'difficulty'}

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

PROTECT_RE = re.compile(r'(\$[^$\n]*\$|`[^`\n]*`)')


def fix_case(match, rep):
    m0 = match.group(0)
    return rep[0].upper() + rep[1:] if m0[0].isupper() else rep


def fix_soft_dashes_line(line, is_title):
    if re.match(r'^\s*[-*+]\s', line):
        return line
    if is_title:
        return re.sub(r'(\S) - (\S)', r'\1: \2', line)
    def repl(m):
        a, b = m.group(1), m.group(2)
        return f'{a}. {b}' if b[:1].isupper() else f'{a}, {b}'
    return re.sub(r'(\S) - (\S)', repl, line)


def clean_segment(seg, is_title):
    t = seg
    t = re.sub(r'\s+—\s+(?=[A-Z"])', '. ', t)
    t = re.sub(r'\s+—\s+', ', ', t)
    t = re.sub(r'(\w)—(\w)', r'\1, \2', t)
    t = re.sub(r'(\w)–(\w)', r'\1 to \2', t)
    t = re.sub(r'(\d)\s*–\s*(\d)', r'\1 to \2', t)
    t = t.replace('—', ', ').replace('–', ' ')
    t = '\n'.join(fix_soft_dashes_line(l, is_title) for l in t.split('\n'))
    t = re.sub(r'(\d) - (\d)', r'\1 to \2', t)
    for rex, rep in SWAPS:
        t = rex.sub(lambda m: fix_case(m, rep), t)
    t = re.sub(r'\s+,', ',', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)
    return t


def clean_text(s, is_title=False):
    if not isinstance(s, str) or not s.strip():
        return s, False
    out = []
    changed = False
    for part in PROTECT_RE.split(s):
        if part.startswith('$') or part.startswith('`'):
            out.append(part)
            continue
        c = clean_segment(part, is_title)
        if c != part:
            changed = True
        out.append(c)
    return ''.join(out), changed


def walk(node, key=None):
    if isinstance(node, dict):
        return {k: walk(v, k) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(v, key) for v in node]
    if isinstance(node, str):
        if key in DENY_KEYS:
            return node
        is_title = key in ('front', 'title', 'label')
        new, changed = clean_text(node, is_title)
        return new
    return node


def main():
    dry = '--dry' in sys.argv
    patterns = sys.argv[1:]
    files = []
    for p in patterns:
        files.extend(glob.glob(p, recursive=True))
    files = sorted(set(files))
    n_changed = 0
    for f in files:
        with open(f, encoding='utf8') as fh:
            d = json.load(fh)
        new = walk(d)
        if new != d:
            n_changed += 1
            if not dry:
                with open(f, 'w', encoding='utf8') as fh:
                    json.dump(new, fh, indent=2, ensure_ascii=False)
                    fh.write('\n')
    print(f'{len(files)} files scanned, {n_changed} changed')


if __name__ == '__main__':
    main()
