import json, glob, os, re, subprocess, sys, tempfile, hashlib, collections
from multiprocessing import Pool
root = sys.argv[1]; outp = sys.argv[2]
T = tempfile.mkdtemp(prefix='qfexec_')

def norm(s):
    s = s.replace('\r\n', '\n')
    return '\n'.join(re.sub(r'[ \t]+', ' ', l.strip()) for l in s.split('\n')).rstrip('\n')

def run(cmd, inp='', timeout=10, cwd=None):
    try:
        p = subprocess.run(cmd, input=inp, capture_output=True, text=True, timeout=timeout, cwd=cwd or T)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return 'TIMEOUT', '', ''

def compile_cpp(code, tag, syntax_only=False):
    h = hashlib.md5((tag + code).encode()).hexdigest()[:10]
    src = os.path.join(T, h + '.cpp'); exe = os.path.join(T, h)
    open(src, 'w').write(code)
    args = ['g++', '-std=c++20', '-O1', '-pthread', '-w', src, '-o', exe]
    if syntax_only: args = ['g++', '-std=c++20', '-fsyntax-only', '-pthread', '-w', src]
    rc, so, se = run(args, timeout=60)
    return rc, se, exe

def job(j):
    kind = j['kind']
    try:
        if kind == 'problem':
            res = []
            for lang, code in j['solutions'].items():
                if lang in ('cpp', 'c++'):
                    rc, se, exe = compile_cpp(code, j['slug'])
                    if rc != 0: res.append(dict(slug=j['slug'], lang=lang, status='COMPILE_FAIL', err=se[:300])); continue
                    cmd = [exe]
                elif lang == 'python':
                    f = os.path.join(T, j['slug'] + '.py'); open(f, 'w').write(code); cmd = ['python3', f]
                else: continue
                for i, t in enumerate(j['tests'] + [dict(input=e['input'], expected=e['output'], hidden=False, _ex=True) for e in j['examples']]):
                    rc, so, se = run(cmd, t['input'], timeout=max(10, j['tl'] / 1000 * 3))
                    ok = rc == 0 and norm(so) == norm(t['expected'])
                    if not ok:
                        res.append(dict(slug=j['slug'], lang=lang, status='WRONG' if rc == 0 else str(rc), test=('example' if t.get('_ex') else 'test') + str(i), got=so[:160], want=t['expected'][:160], err=se[:160]))
            return res or [dict(slug=j['slug'], status='OK')]
        if kind == 'code-output':
            lang = j['lang']; code = j['code']
            if lang in ('cpp', 'c++'):
                rc, se, exe = compile_cpp(code, j['id'])
                if rc != 0: return [dict(id=j['id'], status='COMPILE_FAIL', err=se[:250])]
                rc, so, se = run([exe])
            elif lang == 'python':
                f = os.path.join(T, 'co_' + hashlib.md5(code.encode()).hexdigest()[:8] + '.py'); open(f, 'w').write(code)
                rc, so, se = run(['python3', f])
            else: return [dict(id=j['id'], status='SKIP_' + str(lang))]
            if rc == 'TIMEOUT': return [dict(id=j['id'], status='TIMEOUT')]
            if norm(so) != norm(str(j['answer'])): return [dict(id=j['id'], status='MISMATCH', got=so[:200], want=str(j['answer'])[:200], rc=rc, err=se[:150])]
            return [dict(id=j['id'], status='OK')]
        if kind == 'block':
            lang = j['lang']; code = j['code']
            if lang in ('cpp', 'c++'):
                if 'main' not in code: return [dict(id=j['id'], status='SNIPPET')]
                rc, se, exe = compile_cpp(code, j['id'], syntax_only=True)
                return [dict(id=j['id'], status='OK' if rc == 0 else 'COMPILE_FAIL', err=se[:250])]
            if lang == 'python':
                f = os.path.join(T, 'b_' + hashlib.md5(code.encode()).hexdigest()[:8] + '.py'); open(f, 'w').write(code)
                rc, so, se = run(['python3', f], timeout=20)
                if rc == 0: return [dict(id=j['id'], status='OK')]
                return [dict(id=j['id'], status='RUN_FAIL' if rc != 'TIMEOUT' else 'TIMEOUT', err=se[-300:])]
            return [dict(id=j['id'], status='SKIP_' + str(lang))]
    except Exception as e:
        return [dict(id=j.get('id', j.get('slug')), status='EXC', err=str(e)[:200])]

jobs = []
for f in sorted(glob.glob(root + '/content/problems/*.json')):
    d = json.load(open(f))
    jobs.append(dict(kind='problem', slug=d['slug'], solutions=d['solutions'], tests=d['tests'], examples=d.get('examples', []), tl=d.get('timeLimitMs', 2000)))
for f in sorted(glob.glob(root + '/content/lessons/*/*.json')):
    d = json.load(open(f))
    for q in d['quiz']:
        if q['type'] == 'code-output': jobs.append(dict(kind='code-output', id=d['id'] + ':' + q['id'], lang=q.get('language'), code=q['code'], answer=q['answer']))
    for i, b in enumerate(d['blocks']):
        if b['type'] == 'code': jobs.append(dict(kind='block', id=d['id'] + ':b' + str(i), lang=b.get('lang'), code=b['code']))
    for k in ('guidedExercise', 'independentExercise'):
        sol = (d.get(k) or {}).get('solution', '')
        for m in re.finditer(r'```(\w+)\n(.*?)```', sol, re.S):
            lang = {'c++': 'cpp'}.get(m.group(1), m.group(1))
            jobs.append(dict(kind='block', id=d['id'] + ':' + k, lang=lang, code=m.group(2)))
print('jobs', len(jobs), flush=True)
with Pool(2) as p: results = p.map(job, jobs, chunksize=4)
flat = [r for rs in results for r in rs]
json.dump(flat, open(outp, 'w'), indent=1)
c = collections.Counter(r['status'] for r in flat); print(c)
