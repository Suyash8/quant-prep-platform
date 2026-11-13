import json, glob, re, sys, collections, hashlib, os
root = sys.argv[1]
out = {}
lessons = {}
for f in sorted(glob.glob(root + '/content/lessons/*/*.json')):
    d = json.load(open(f)); lessons[d['id']] = (f, d)
cur = json.load(open(root + '/content/map/curriculum.json'))
order = []; phase_of = {}; mod_of = {}
for p in cur['phases']:
    for m in p['modules']:
        for l in m['lessons']:
            lid = l['id'] if isinstance(l, dict) else l
            order.append(lid); phase_of[lid] = p['id']; mod_of[lid] = m['id']
pos = {l: i for i, l in enumerate(order)}

def text_of_block(b):
    t = b['type']
    if t in ('p', 'callout'): return b.get('md', '')
    if t == 'list': return ' '.join(b.get('items', []))
    if t == 'steps': return ' '.join(b.get('items', []))
    if t == 'table': return ' '.join(b.get('headers', [])) + ' ' + ' '.join(' '.join(r) for r in b.get('rows', []))
    if t in ('h2', 'h3'): return b.get('text', '')
    return ''

issues = collections.defaultdict(list)
stats = []
para_hash = collections.defaultdict(set)
sent_hash = collections.defaultdict(set)
ngram = collections.Counter()
for lid, (f, d) in lessons.items():
    words = 0
    for b in d['blocks']:
        txt = text_of_block(b)
        words += len(txt.split())
        if b['type'] in ('p', 'callout', 'list', 'steps'):
            for para in ([txt] if b['type'] in ('p', 'callout') else b.get('items', [])):
                n = re.sub(r'\W+', ' ', para.lower()).strip()
                if len(n) > 60: para_hash[hashlib.md5(n.encode()).hexdigest()].add(lid)
                for s in re.split(r'(?<=[.!?])\s+', para):
                    sn = re.sub(r'\W+', ' ', s.lower()).strip()
                    if len(sn.split()) >= 9: sent_hash[sn].add(lid)
    q = d['quiz']
    nint = sum(1 for b in d['blocks'] if b['type'] == 'interactive')
    ncode = sum(1 for b in d['blocks'] if b['type'] == 'code')
    stats.append(dict(id=lid, phase=phase_of.get(lid), words=words, est=d['estMinutes'], diff=d['difficulty'], nq=len(q), nfc=len(d['flashcards']),
                      nint=nint, ncode=ncode, nobj=len(d['objectives']), nsum=len(d['summary']), nmis=len(d.get('commonMistakes', [])),
                      nref=len(d.get('references', [])), nblocks=len(d['blocks']), prereqs=d['prereqs']))
    # structure
    if d['moduleId'] != mod_of.get(lid): issues['module_mismatch'].append(lid)
    if words < 400: issues['thin_under_400_words'].append((lid, words))
    if words > 1800: issues['very_long_over_1800_words'].append((lid, words))
    if len(q) < 5: issues['quiz_under_5'].append((lid, len(q)))
    if len(d['flashcards']) < 4: issues['flashcards_under_4'].append((lid, len(d['flashcards'])))
    qtypes = collections.Counter(x['type'] for x in q)
    if len(qtypes) < 2: issues['quiz_single_type'].append((lid, dict(qtypes)))
    # est minutes plausibility: reading 200wpm + 1 min per question + 8 per exercise pair
    est_floor = words / 220 + len(q) * 0.7
    if d['estMinutes'] < 0.6 * est_floor: issues['estMinutes_too_low'].append((lid, d['estMinutes'], round(est_floor)))
    if d['estMinutes'] > 2.2 * est_floor + 15: issues['estMinutes_too_high'].append((lid, d['estMinutes'], round(est_floor)))
    # quiz integrity
    seenp = set()
    for x in q:
        pr = x['prompt'].strip().lower()
        if pr in seenp: issues['dup_quiz_prompt'].append((lid, x['id']))
        seenp.add(pr)
        if not x.get('explanation') or len(x['explanation']) < 50: issues['short_explanation'].append((lid, x['id'], len(x.get('explanation', ''))))
        if x['type'] == 'mcq':
            o = x['options']
            if len(set(s.strip().lower() for s in o)) != len(o): issues['mcq_dup_options'].append((lid, x['id']))
            if not (0 <= x['answerIndex'] < len(o)): issues['mcq_bad_index'].append((lid, x['id']))
            if any(re.search(r'all of the above|none of the above', s, re.I) for s in o): issues['mcq_all_none_above'].append((lid, x['id']))
            L = [len(s) for s in o]
            if L[x['answerIndex']] == max(L) and max(L) > 1.5 * sorted(L)[-2]: issues['mcq_answer_is_longest_outlier'].append((lid, x['id']))
        if x['type'] == 'ms':
            if not all(0 <= i < len(x['options']) for i in x['answerIndices']): issues['ms_bad_index'].append((lid, x['id']))
            if len(x['answerIndices']) in (0, len(x['options'])): issues['ms_degenerate'].append((lid, x['id']))
        if x['type'] == 'numeric':
            if not isinstance(x.get('answer'), (int, float)): issues['numeric_bad_answer'].append((lid, x['id']))
            if 'tolerance' not in x: issues['numeric_no_tolerance'].append((lid, x['id']))
        if x['type'] == 'short':
            if len(x.get('keywords', [])) < 3: issues['short_few_keywords'].append((lid, x['id']))
            if not x.get('modelAnswer'): issues['short_no_model'].append((lid, x['id']))
    # flashcards
    fr = set()
    for c in d['flashcards']:
        if c['front'] in fr: issues['dup_flashcard'].append((lid, c['front'][:40]))
        fr.add(c['front'])
        if len(c['back']) > 350: issues['flashcard_back_long'].append((lid, len(c['back'])))
        if len(c['back']) < 12: issues['flashcard_back_short'].append((lid, c['back']))
    # exercises
    for k in ('guidedExercise', 'independentExercise'):
        e = d.get(k)
        if not e: issues['missing_' + k].append(lid); continue
        if len(e.get('hints', [])) < 2: issues[k + '_few_hints'].append((lid, len(e.get('hints', []))))
        if not e.get('solution') or len(e['solution']) < 80: issues[k + '_thin_solution'].append(lid)
    # prereqs
    for p in d['prereqs']:
        if p not in lessons: issues['prereq_missing'].append((lid, p))
        elif pos[p] > pos[lid]: issues['prereq_later_in_order'].append((lid, p))
        elif p == lid: issues['prereq_self'].append(lid)
    if not d['prereqs'] and lid != order[0]: issues['no_prereqs'].append(lid)
    # references
    for r in d.get('references', []):
        if not re.match(r'^https://[^ ]+\.[a-z]{2,}', r.get('url', '')): issues['bad_ref_url'].append((lid, r.get('url')))
    for b in d['blocks']:
        if b['type'] == 'ref':
            for r in b['items']:
                if not re.match(r'^https://[^ ]+\.[a-z]{2,}', r.get('url', '')): issues['bad_ref_url'].append((lid, r.get('url')))
    # text hygiene (all strings)
    blob = json.dumps(d, ensure_ascii=False)
    for pat, name in [(r'TODO|TBD|lorem ipsum|FIXME|XXX', 'placeholder'), (r'\s{2,}\S', None), (r'Ã|â€|�', 'mojibake'), (r'[\u2013\u2014]', 'dash'),
                      (r'\b(delve|leverage|robust|seamless|crucial|pivotal|myriad|plethora|tapestry|holistic|streamline|elevate|empower)\b', 'ai_word')]:
        if name and re.search(pat, blob, re.I): issues['hygiene_' + name].append((lid, len(re.findall(pat, blob, re.I))))
    # math delimiters
    for b in d['blocks']:
        t = text_of_block(b)
        t2 = t.replace('\\$', '')
        if t2.count('$') % 2: issues['odd_dollar_in_text'].append((lid, t[:60]))
    # spelling variant mix
    us = len(re.findall(r'\b\w+(?:ize|izes|ized|izing|ization|izations)\b', blob)); uk = len(re.findall(r'\b\w+(?:ise|ises|ised|ising|isation|isations)\b', blob))
    stats[-1]['us'] = us; stats[-1]['uk'] = uk
dups = {h: sorted(v) for h, v in para_hash.items() if len(v) > 1}
sd = {h: sorted(v) for h, v in sent_hash.items() if len(v) >= 3}
issues['paragraphs_duplicated_across_lessons'] = [(len(v), v[:6]) for v in dups.values()]
issues['sentences_in_3plus_lessons'] = [(h[:90], len(v)) for h, v in sd.items()]
# graph cycles
color = {}
def dfs(n, st):
    color[n] = 1
    for p in lessons[n][1]['prereqs']:
        if p not in lessons: continue
        if color.get(p) == 1: issues['cycle'].append((n, p))
        elif p not in color: dfs(p, st)
    color[n] = 2
for n in lessons:
    if n not in color: dfs(n, [])
# unreachable / leaves
used_as_prereq = set(p for _, d in lessons.values() for p in d['prereqs'])
issues['never_a_prereq_count'] = len([l for l in lessons if l not in used_as_prereq])
# skills
sk = cur.get('skills', {})
skill_ids = set(sk.keys()) if isinstance(sk, dict) else set(s['id'] if isinstance(s, dict) else s for s in sk)
usedsk = collections.Counter(s for _, d in lessons.values() for s in d['skills'])
issues['unknown_skills'] = [(s, c) for s, c in usedsk.items() if s not in skill_ids]
issues['skills_never_used'] = [s for s in skill_ids if s not in usedsk]
# answer index distribution
dist = collections.Counter(); tot = 0
for _, d in lessons.values():
    for x in d['quiz']:
        if x['type'] == 'mcq': dist[x['answerIndex']] += 1; tot += 1
print('MCQ answerIndex distribution', dict(dist), tot)
# per phase stats
byp = collections.defaultdict(list)
for s in stats: byp[s['phase']].append(s)
for p, L in byp.items():
    print(p, 'n', len(L), 'avg words', round(sum(x['words'] for x in L) / len(L)), 'min', min(x['words'] for x in L), 'avg est', round(sum(x['est'] for x in L) / len(L)),
          'avg q', round(sum(x['nq'] for x in L) / len(L), 1), 'avg fc', round(sum(x['nfc'] for x in L) / len(L), 1), 'avg code', round(sum(x['ncode'] for x in L) / len(L), 1),
          'avg int', round(sum(x['nint'] for x in L) / len(L), 1), 'refs avg', round(sum(x['nref'] for x in L) / len(L), 1))
print('US vs UK -ize/-ise totals', sum(s['us'] for s in stats), sum(s['uk'] for s in stats))
print('diff by phase', {p: dict(collections.Counter(x['diff'] for x in L)) for p, L in byp.items()})
for k, v in sorted(issues.items(), key=lambda kv: kv[0]):
    n = len(v) if isinstance(v, list) else v
    print(f'ISSUE {k}: {n}')
json.dump({k: v for k, v in issues.items()}, open(sys.argv[2], 'w'), indent=1, default=str)
json.dump(stats, open(sys.argv[2].replace('.json', '-stats.json'), 'w'))
