#!/usr/bin/env python3
"""Problem oracle tooling.

For each problem slug there are three files:
  specs/<slug>.py          independent oracle(inp)->str, gen(rng)->str (small random input),
                           EDGE (curated inputs), optional BIG() (large inputs), EXAMPLES (inputs)
  solutions/<slug>.py      reference Python solution (stdin -> stdout)
  solutions/<slug>.cpp     reference C++ solution
Commands:
  run.py check [slug ...]   compile and stress (oracle vs python vs c++, sanitizers on C++)
  run.py write [slug ...]   check, then regenerate expected outputs, examples and solutions in content/problems/<slug>.json
Oracles are deliberately simple (brute force, Fraction, Decimal). Inputs too large for the oracle
(len > ORACLE_MAX chars) take their expected output from the Python solution, which must agree
with the C++ solution byte for byte; those inputs are never used to prove a solution correct.
"""
import sys, os, json, random, subprocess, importlib.util, tempfile, hashlib, time, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TMP = tempfile.mkdtemp(prefix='qfprob_')
STRESS_N = int(os.environ.get('STRESS_N', '200'))
ORACLE_MAX = 6000

def norm(s):
    return '\n'.join(re.sub(r'[ \t]+', ' ', l.strip()) for l in s.replace('\r\n', '\n').split('\n')).rstrip('\n')

def load_spec(slug):
    p = os.path.join(HERE, 'specs', slug + '.py')
    spec = importlib.util.spec_from_file_location('spec_' + slug.replace('-', '_'), p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def sh(cmd, inp='', timeout=60):
    try:
        p = subprocess.run(cmd, input=inp, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return 'TIMEOUT', '', ''

def build_cpp(slug, sanitize):
    src = os.path.join(HERE, 'solutions', slug + '.cpp')
    exe = os.path.join(TMP, slug + ('.san' if sanitize else '.opt'))
    args = ['g++', '-std=c++20', '-pthread', '-Wall', '-Wextra'] + (['-O1', '-g', '-fsanitize=address,undefined', '-fno-sanitize-recover=all'] if sanitize else ['-O1']) + [src, '-o', exe]
    rc, so, se = sh(args, timeout=120)
    if rc != 0: raise SystemExit(f'{slug}: C++ compile failed\n{se[:1500]}')
    if se.strip(): print(f'  warning in {slug}.cpp:\n{se[:600]}')
    return exe

def run_py(slug, inp, timeout=30):
    return sh(['python3', os.path.join(HERE, 'solutions', slug + '.py')], inp, timeout)

def collect_inputs(slug, m, content):
    ins = []
    for e in getattr(m, 'EXAMPLES', []): ins.append(e)
    for e in getattr(m, 'EDGE', []): ins.append(e)
    return ins

def check(slug, quick=False):
    m = load_spec(slug)
    cpp_san = build_cpp(slug, True); cpp_opt = build_cpp(slug, False)
    fixed = list(getattr(m, 'EXAMPLES', [])) + list(getattr(m, 'EDGE', []))
    jp = os.path.join(ROOT, 'content', 'problems', slug + '.json')
    if os.path.exists(jp):
        d = json.load(open(jp))
        fixed += [t['input'] for t in d['tests']] if getattr(m, 'KEEP_OLD_TESTS', True) else []
    if hasattr(m, 'BIG'): fixed += list(m.BIG())
    r = random.Random(hashlib.md5(slug.encode()).hexdigest())
    slow = [0.0, 0.0]
    rand = [] if quick else [m.gen(r) for _ in range(STRESS_N)]
    bad = 0; n = 0
    for kind, inputs in (('fixed', fixed), ('random', rand)):
        for inp in inputs:
            n += 1
            small = len(inp) <= getattr(m, 'ORACLE_MAX', ORACLE_MAX)
            want = m.oracle(inp) if small else None
            t0 = time.time(); rc1, o1, e1 = run_py(slug, inp, 40); t1 = time.time()
            rc2, o2, e2 = sh([cpp_san if small and len(inp) < 20000 else cpp_opt], inp, 60); t2 = time.time()
            slow[0] = max(slow[0], t1 - t0); slow[1] = max(slow[1], t2 - t1)
            msg = None
            if rc1 != 0: msg = f'python rc={rc1} {e1[-300:]}'
            elif rc2 != 0: msg = f'cpp rc={rc2} {e2[-400:]}'
            elif norm(o1) != norm(o2): msg = f'py/cpp differ\npy={o1[:200]!r}\ncpp={o2[:200]!r}'
            elif want is not None and norm(o1) != norm(want): msg = f'oracle differs\norc={want[:200]!r}\npy={o1[:200]!r}'
            if msg:
                bad += 1
                if bad <= 3: print(f'  FAIL {slug} [{kind}] input={inp[:200]!r}\n   {msg}')
    print(f'{slug}: {"OK" if not bad else "FAILED"} ({n} inputs: {len(fixed)} fixed, {len(rand)} random, {bad} bad; slowest py {slow[0]:.2f}s, cpp {slow[1]:.2f}s)')
    return bad == 0

def write(slug):
    m = load_spec(slug)
    jp = os.path.join(ROOT, 'content', 'problems', slug + '.json')
    is_new = not os.path.exists(jp)
    if is_new:
        N = m.NEW
        d = dict(slug=slug, title=N['title'], difficulty=N['difficulty'], category=N['category'], tags=N['tags'], statement=N['statement'],
                 inputFormat=N['inputFormat'], outputFormat=N['outputFormat'], constraints=N['constraints'], examples=[], hints=N['hints'],
                 editorial=N['editorial'], lessons=N['lessons'], solutions={}, tests=[], timeLimitMs=N.get('timeLimitMs', 4000),
                 memoryLimitMb=N.get('memoryLimitMb', 256), estMinutes=N.get('estMinutes', 30))
    else:
        d = json.load(open(jp))
    cpp_opt = build_cpp(slug, False)
    def expected(inp):
        if len(inp) <= getattr(m, 'ORACLE_MAX', ORACLE_MAX): return m.oracle(inp)
        rc, o, e = run_py(slug, inp, 60)
        assert rc == 0, e
        rc2, o2, e2 = sh([cpp_opt], inp, 60)
        assert rc2 == 0 and norm(o) == norm(o2), f'{slug}: big input py/cpp mismatch'
        return o
    def fin(s):
        s = s.rstrip('\n'); return (s + '\n') if s else '\n'
    old = d['tests']
    tests = []
    seen = set()
    for t in old:
        if not getattr(m, 'KEEP_OLD_TESTS', True): break
        tests.append(dict(input=t['input'], expected=fin(expected(t['input'])), hidden=t['hidden'])); seen.add(t['input'])
    new_inputs = list(getattr(m, 'EDGE', []))
    if hasattr(m, 'BIG'):
        # keep the package small: at most two stress-size inputs per problem, each under 1.2 MB (all of them still run in `check`)
        big = [b for b in m.BIG() if len(b) <= 1_200_000][:2]
        new_inputs += big
    for inp in new_inputs:
        if inp in seen: continue
        tests.append(dict(input=inp, expected=fin(expected(inp)), hidden=True)); seen.add(inp)
    if is_new:
        rr = random.Random(slug)
        while len(tests) + len(getattr(m, 'EXAMPLES', [])) < 10:
            g = m.gen(rr)
            if g not in seen: tests.append(dict(input=g, expected=fin(expected(g)), hidden=True)); seen.add(g)
    ex_in = list(getattr(m, 'EXAMPLES', [])) or [e['input'] for e in d['examples']]
    exs = []
    old_expl = {e['input']: e.get('explanation') for e in d['examples']}
    expl = getattr(m, 'EXPLAIN', {})
    for i, inp in enumerate(ex_in):
        e = dict(input=inp, output=fin(m.oracle(inp)))
        x = expl.get(i) or old_expl.get(inp)
        if x: e['explanation'] = x
        exs.append(e)
    # examples are also visible tests at the front
    vis = []
    for e in exs:
        vis.append(dict(input=e['input'], expected=e['output'], hidden=False)); seen.add(e['input'])
    rest = [t for t in tests if t['input'] not in {e['input'] for e in exs}]
    # visible: examples; keep original visibility of the rest, then ensure ~80 percent hidden
    for t in rest[:0]: pass
    allt = vis + rest
    # hidden ratio: at least 70 percent hidden overall; examples are the visible ones
    nvis = sum(1 for t in allt if not t['hidden'])
    while nvis > max(len(exs), round(0.3 * len(allt))):
        for t in reversed(allt):
            if not t['hidden']: t['hidden'] = True; nvis -= 1; break
    oldmap = {t['input']: t['expected'] for t in old}
    changed = [i for i, t in enumerate(allt) if t['input'] in oldmap and norm(oldmap[t['input']]) != norm(t['expected'])]
    print(f'{slug}: {len(changed)} of {len(old)} previous tests had a different expected output')
    d['tests'] = allt; d['examples'] = exs
    d['solutions'] = dict(python=open(os.path.join(HERE, 'solutions', slug + '.py')).read().rstrip('\n'),
                          cpp=open(os.path.join(HERE, 'solutions', slug + '.cpp')).read().rstrip('\n'))
    for k, v in getattr(m, 'META', {}).items(): d[k] = v
    for old_s, new_s in getattr(m, 'PATCH', []):
        hits = [0]
        def walk(o):
            if isinstance(o, str):
                if old_s in o: hits[0] += 1
                return o.replace(old_s, new_s)
            if isinstance(o, list): return [walk(x) for x in o]
            if isinstance(o, dict): return {k: (v if k in ('tests', 'solutions') else walk(v)) for k, v in o.items()}
            return o
        d = walk(d)
        assert hits[0], f'{slug}: PATCH text not found: {old_s[:60]!r}'
    json.dump(d, open(jp, 'w'), indent=2, ensure_ascii=False); open(jp, 'a').write('\n')
    print(f'{slug}: wrote {len(allt)} tests ({sum(t["hidden"] for t in allt)} hidden), {len(exs)} examples')

if __name__ == '__main__':
    cmd = sys.argv[1]; slugs = sys.argv[2:] or sorted(f[:-3] for f in os.listdir(os.path.join(HERE, 'specs')) if f.endswith('.py') and not f.startswith('_'))
    ok = True
    for s in slugs:
        good = check(s, quick=os.environ.get('QUICK') == '1')
        ok &= good
        if cmd == 'write' and good: write(s)
    sys.exit(0 if ok else 1)
