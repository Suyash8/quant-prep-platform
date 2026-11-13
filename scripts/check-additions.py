#!/usr/bin/env python3
"""Focused reproducible checks for added lessons and all assessment content."""
import pathlib,json,re,subprocess,tempfile,collections,math
R=pathlib.Path(__file__).resolve().parents[1]
ids={x['id'] for x in json.loads((R/'content/new-lesson-insertions.json').read_text())} if False else {x['lesson']['id'] for x in json.loads((R/'content/new-lesson-insertions.json').read_text())}
lessons=[json.loads(p.read_text()) for p in (R/'content/lessons').glob('*/*.json') if p.stem in ids]
assess=[json.loads(p.read_text()) for p in (R/'content/assessments').glob('*.json')]
allids={p.stem for p in (R/'content/lessons').glob('*/*.json')}
errors=[];executed=[];counts={}
def run(code,lang,tag):
 with tempfile.TemporaryDirectory() as t:
  p=pathlib.Path(t)
  if lang in ('cpp','c++'):
   (p/'a.cpp').write_text(code)
   c=subprocess.run(['g++','-std=c++20','-O1','-pthread',str(p/'a.cpp'),'-o',str(p/'a')],capture_output=True,text=True,timeout=60)
   if c.returncode:errors.append([tag,'compile',c.stderr]);return ''
   cmd=[str(p/'a')]
  else:
   (p/'a.py').write_text(code);cmd=['python3',str(p/'a.py')]
  c=subprocess.run(cmd,capture_output=True,text=True,timeout=15)
  if c.returncode:errors.append([tag,'runtime',c.stderr])
  else:executed.append(dict(id=tag,output=c.stdout.strip()))
  return c.stdout.strip()
def quizzes(owner,qs,dist):
 seen=set()
 for q in qs:
  tag=owner+':'+q['id']
  if q['prompt'].lower() in seen:errors.append([tag,'duplicate prompt'])
  seen.add(q['prompt'].lower())
  if len(q['explanation'])<80:errors.append([tag,'short explanation'])
  if re.search(r'\boption\s+[A-D1-4]\b',q['explanation'],re.I):errors.append([tag,'position explanation'])
  if q['type']=='mcq':
   dist[q['answerIndex']]+=1;L=list(map(len,q['options']));other=max(n for i,n in enumerate(L) if i!=q['answerIndex'])
   if L[q['answerIndex']]>other*1.25:errors.append([tag,'length tell'])
  if q['type']=='numeric' and 'tolerance' not in q:errors.append([tag,'missing tolerance'])
  if q['type']=='short':
   if len(q['keywords'])<3 or not q.get('modelAnswer'):errors.append([tag,'short-answer contract'])
   # Whole-token phrase groups: a stronger check than the legacy substring grader.
   hit=[any(re.search(r'(?<!\w)'+re.escape(k)+r'(?!\w)',q.get('modelAnswer',''),re.I) for k in group.split('|')) for group in q['keywords']]
   if not all(hit):errors.append([tag,'model answer misses exact rubric group',hit])
  if q['type']=='ms' and not 2<=len(q['answerIndices'])<len(q['options']):errors.append([tag,'multi-select count'])
  if q['type']=='code-output':
   got=run(q['code'],q.get('language','python'),tag)
   if got!=str(q['answer']).strip():errors.append([tag,'wrong code output',got,q['answer']])
ld=collections.Counter();ad=collections.Counter()
for d in lessons:
 tag=d['id'];qs=d['quiz'];quizzes(tag,qs,ld)
 if len(qs)!=6 or len({q['type'] for q in qs})<3:errors.append([tag,'quiz coverage'])
 if set(q['objective'] for q in qs)!=set(range(len(d['objectives']))):errors.append([tag,'objective coverage'])
 if len(d['flashcards'])!=5:errors.append([tag,'flashcards'])
 for c in d['flashcards']:
  if not 12<=len(c['back'])<250:errors.append([tag,'flashcard length'])
 for i,b in enumerate(d['blocks']):
  if b['type']=='code':run(b['code'],b['lang'],tag+':block'+str(i))
 words=sum(len(b.get('md','').split()) for b in d['blocks'] if b['type'] in ('p','callout'))
 if not 700<=words<=1100:errors.append([tag,'body length',words])
 for name in ('guidedExercise','independentExercise'):
  e=d[name]
  if not e.get('successCheck') or len(e.get('hints',[]))<3:errors.append([tag+':'+name,'exercise fields'])
  for lang,code in re.findall(r'```(python|cpp)\n(.*?)```',e['solution'],re.S):run(code,lang,tag+':'+name)
for d in assess:
 qs=[q for s in d['sections'] for q in s['questions']];quizzes(d['id'],qs,ad)
 if d.get('passMarkPercent')!=80 or len(d.get('scoreBands',[]))!=3:errors.append([d['id'],'assessment metadata'])
 for q in qs:
  if q.get('lessonId') not in allids:errors.append([d['id'],q['id'],'lesson link'])
for label,dist in [('new-lessons',ld),('assessments',ad)]:
 total=sum(dist.values());counts[label]=dict(total=total,positions=dict(dist),shares={k:v/total for k,v in dist.items()})
 if any(not .22<=dist[i]/total<=.28 for i in range(4)):errors.append([label,'position balance'])
# Independent new-assessment arithmetic, separate from stored answer values.
new={
'assess-fixed-income':{'fi-q1':100/1.05,'fi-q2':5/1.05+105/1.05**2,'fi-q3':3/1.05,'fi-q4':2e6*4*.0001,'fi-q7':math.exp(-.02*5),'fi-q8':.02*.6*10000},
'assess-statistics-ml':{'sm-q1':12/math.sqrt(36),'sm-q2':8/14,'sm-q3':2/3,'sm-q7':10/(5+5),'sm-q8':(1+4)/2,'sm-q11':1.1/(1.1+.9)},
'assess-python-numerics':{'pn-q1':2*3*8,'pn-q2':1*4+2*5+3*6,'pn-q5':(0+1)/2,'pn-q7':((2-4)**2+(4-4)**2+(6-4)**2)/(3-1),'pn-q8':1,'pn-q11':6/2}}
for d in assess:
 for q in [q for sec in d['sections'] for q in sec['questions']]:
  if q['id'] in new.get(d['id'],{}):
   want=new[d['id']][q['id']]
   if abs(q['answer']-want)>q['tolerance']+1e-12:errors.append([d['id'],q['id'],'numeric',want,q['answer']])
# Exhaustive check of the corrected n=4 secretary strategy.
win=0
import itertools
for perm in itertools.permutations(range(4)):
 chosen=perm[-1]
 for i in range(1,4):
  if perm[i]>max(perm[:i]):chosen=perm[i];break
 win+=chosen==3
assert win==11
report=dict(lessons=len(lessons),assessments=len(assess),assessmentQuestions=sum(len(s['questions']) for d in assess for s in d['sections']),executableChecks=len(executed),counts=counts,errors=errors,executed=executed,secretaryIndependentCheck=dict(wins=win,permutations=24))
(R/'content/additions-check-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='executed'},indent=2))
raise SystemExit(bool(errors))
