#!/usr/bin/env python3
"""Bounded content execution. No network; each sample gets an isolated directory.

A declared fragment/dependency is reported as deferred, never as an executed pass.
These checks execute trusted project content. They are not an untrusted-code sandbox.
"""
import concurrent.futures, glob, hashlib, importlib.util, json, os, pathlib, re, shutil, subprocess, sys, tempfile
ROOT = pathlib.Path(sys.argv[1]).resolve()
OUT = pathlib.Path(sys.argv[2])
CACHE = ROOT / '.cache/content-truth'
CACHE.mkdir(parents=True, exist_ok=True)
PYTHON = os.environ.get('QF_PYTHON', sys.executable)
CPP = os.environ.get('QF_CXX', 'g++')

def run(cmd, cwd, inp='', timeout=20):
    try:
        p = subprocess.run(cmd, cwd=cwd, input=inp, text=True, capture_output=True,
                           timeout=timeout, env={**os.environ, 'MPLBACKEND':'Agg', 'PYTHONHASHSEED':'0', 'OPENBLAS_NUM_THREADS':'1'})
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return 'TIMEOUT', '', 'Execution exceeded the time limit'
    except OSError as e:
        return 'UNAVAILABLE', '', str(e)

def norm(s):
    return '\n'.join(re.sub(r'[ \t]+', ' ', line.strip()) for line in str(s).replace('\r\n','\n').splitlines()).rstrip('\n')

def equal(got, want, tolerance=None):
    if norm(got)==norm(want): return True
    if tolerance is None: return False
    a,b=norm(got).split(),norm(want).split()
    if len(a)!=len(b): return False
    try:
        import math
        return all(math.isfinite(float(x)) and abs(float(x)-float(y))<=tolerance for x,y in zip(a,b))
    except ValueError: return False

def execute(j):
    # Cache includes runtime versions, input, expected values and all metadata.
    key=hashlib.sha256(json.dumps([VERSIONS,j],sort_keys=True).encode()).hexdigest()
    cached=CACHE/(key+'.json')
    if cached.exists(): return json.loads(cached.read_text())
    rows=[]
    def result(status,**extra):
        rows.append({'id':j['id'],'kind':j['kind'],'status':status,**extra})
    try:
        if j.get('snippet'):
            result('DECLARED_FRAGMENT',reason=j.get('caption','Explicit fragment'))
        else:
            with tempfile.TemporaryDirectory(prefix='qf-truth-') as tmp:
                tmp=pathlib.Path(tmp)
                for name,code in j.get('files',{}).items():
                    p=tmp/name
                    if not p.resolve().is_relative_to(tmp): raise ValueError('Unsafe relative file name')
                    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(code)
                lang=j['lang'];code=j['code']
                if lang in ('cpp','c++','c'):
                    suffix='.c' if lang=='c' else '.cpp';p=tmp/('sample'+suffix);p.write_text(code)
                    compiler='gcc' if lang=='c' else CPP
                    standard='-std=c11' if lang=='c' else '-std=c++20'
                    syntax=j['kind']=='block'
                    cmd=[compiler,standard,'-pthread',str(p)]
                    if 'pybind11' in j.get('requires',[]):
                        rc,includes,se=run([PYTHON,'-m','pybind11','--includes'],tmp)
                        if rc==0: cmd+=includes.split()
                    if any(m in j.get('requires',[]) for m in ['googletest','google-benchmark']):
                        result('DEPENDENCY_MISSING',requires=j['requires'])
                        cached.write_text(json.dumps(rows));return rows
                    cmd+=['-fsyntax-only'] if syntax else ['-O1','-o',str(tmp/'sample')]
                    rc,so,se=run(cmd,tmp,timeout=60)
                    if rc!=0: result('COMPILE_FAIL',error=se[-1200:])
                    elif syntax: result('OK',check='syntax-only')
                    else:
                        tests=j.get('cases',[{'input':'','expected':j.get('answer','')}])
                        for i,t in enumerate(tests):
                            rc,so,se=run([str(tmp/'sample')],tmp,t.get('input',''),max(10,j.get('timeLimitMs',2000)/1000*3))
                            result('OK' if rc==0 and equal(so,t['expected'],j.get('tolerance')) else ('WRONG' if rc==0 else 'RUN_FAIL'),case=i,exitCode=rc,got=so[:500],expected=t['expected'][:500],error=se[-500:])
                elif lang=='python':
                    p=tmp/j.get('file','sample.py');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(code)
                    rc,so,se=run([PYTHON,'-m','py_compile',str(p)],tmp)
                    if rc!=0:result('COMPILE_FAIL',error=se[-1200:])
                    else:
                        missing=[m for m in j.get('requires',[]) if run([PYTHON,'-c', 'import importlib.util; assert importlib.util.find_spec('+repr(m)+')'], tmp)[0]!=0]
                        if missing:result('DEPENDENCY_MISSING',requires=missing)
                        else:
                            tests=j.get('cases',[{'input':'','expected':j.get('answer')}])
                            for i,t in enumerate(tests):
                                command=[PYTHON,'-m','pytest','-q',str(p)] if j['kind']=='block' and ('import pytest' in code or 'def test_' in code) else [PYTHON,str(p)]
                                rc,so,se=run(command,tmp,t.get('input',''),max(10,j.get('timeLimitMs',2000)/1000*3))
                                ok=rc==0 and (t.get('expected') is None or equal(so,t['expected'],j.get('tolerance')))
                                result('OK' if ok else ('WRONG' if rc==0 else 'RUN_FAIL'),case=i,exitCode=rc,got=so[:500],expected=t.get('expected'),error=se[-700:])
                            if j['kind']=='code-output':
                                for other in ('python3.11','python3.12'):
                                    exe=shutil.which(other)
                                    if exe and pathlib.Path(exe).resolve()!=pathlib.Path(PYTHON).resolve():
                                        rc,so,se=run([exe,str(p)],tmp)
                                        result('OK' if rc==0 and equal(so,j['answer']) else 'VERSION_DEPENDENT',runtime=other,got=so[:500],error=se[-500:])
                else:
                    result('UNSUPPORTED_LANGUAGE',language=lang)
    except Exception as e:result('CHECK_ERROR',error=str(e))
    cached.write_text(json.dumps(rows));return rows

def fences(solution):
    return list(re.finditer(r'```([\w+]+)[^\n]*\n(.*?)```',solution,re.S))

def split_named(code):
    matches=list(re.finditer(r'^(?://|#) ([A-Za-z_][\w/.-]*\.(?:py|cpp|h|hpp))[^\n]*\n',code,re.M))
    if len(matches)<2:return None
    return {m[1]:code[m.end():matches[i+1].start() if i+1<len(matches) else len(code)] for i,m in enumerate(matches)}

jobs=[]
for f in sorted((ROOT/'content/problems').glob('*.json')):
    d=json.loads(f.read_text())
    cases=d['tests']+[{'input':e['input'],'expected':e['output'],'example':True} for e in d.get('examples',[])]
    for lang,code in d['solutions'].items():
        jobs.append({'id':d['slug']+':'+lang,'kind':'problem','lang':lang,'code':code,'cases':cases,'timeLimitMs':d.get('timeLimitMs',2000),'tolerance':d.get('outputTolerance')})
for f in sorted((ROOT/'content/lessons').glob('*/*.json')):
    d=json.loads(f.read_text());lid=d['id']
    sibling={b['file']:b['code'] for b in d['blocks'] if b['type']=='code' and b.get('file') and not b.get('snippet')}
    for q in d['quiz']:
        if q['type']=='code-output':jobs.append({'id':lid+':'+q['id'],'kind':'code-output','lang':q.get('language'),'code':q['code'],'answer':q['answer']})
    for i,b in enumerate(d['blocks']):
        if b['type']=='code':
            named=split_named(b['code'])
            if named and b.get('lang') in ('cpp','c++'):
                for name,code in named.items():
                    if name.endswith(('.cpp','.cc')):jobs.append({**b,'code':code,'snippet':False,'id':lid+':b'+str(i)+':'+name,'kind':'block','files':{**sibling,**named}})
            else:jobs.append({**b,'id':lid+':b'+str(i),'kind':'block','files':sibling})
    for k in ('guidedExercise','independentExercise'):
        ex=d.get(k,{})
        matches=fences(ex.get('solution',''))
        named={}
        for m in matches:
            prefix=ex.get('solution','')[:m.start()]
            filename=re.search(r'`([\w.-]+\.(?:h|hpp|cpp|py))`:\s*$',prefix)
            if filename:named[filename[1]]=m[2]
        for i,m in enumerate(matches):
            jobs.append({'id':lid+':'+k+':'+str(i),'kind':'block','lang':m[1],'code':m[2],'files':named,**{key:ex[key] for key in ('requires','snippet','file') if key in ex}})
VERSIONS={name:run([exe,'--version'],ROOT)[1].splitlines()[:1] for name,exe in [('python',PYTHON),('cpp',CPP)]}
VERSIONS['checker']='v4.2.3'
VERSIONS['packages']=run([PYTHON,'-c',"import importlib.metadata as m,json; print(json.dumps({p:m.version(p) for p in ['numpy','pandas','scipy','matplotlib','statsmodels','pytest','pybind11'] if m.packages_distributions().get(p)}))"],ROOT)[1]
VERSIONS['comparisonRuntimes']={v:run([shutil.which(v),'--version'],ROOT)[1] if shutil.which(v) else None for v in ['python3.11','python3.12']}
print('Executable jobs:',len(jobs),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    flat=[r for rows in pool.map(execute,jobs) for r in rows]
from collections import Counter
report={'versions':VERSIONS,'jobs':len(jobs),'counts':dict(Counter(r['status'] for r in flat)),'results':flat,'crossVersionRuntimes':{v:shutil.which(v) for v in ['python3.11','python3.12']}}
OUT.write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'}),flush=True)
