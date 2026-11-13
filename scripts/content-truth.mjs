#!/usr/bin/env node
/** Full content gate. Detailed failures are data, never substituted with an all-green summary. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import katex from 'katex';
import ts from 'typescript';
import vm from 'node:vm';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONTENT=path.join(ROOT,'content');
const failures=[]; const deferred=[]; const counts={};
function fail(rule,id,detail){failures.push({rule,id,detail});counts[rule]=(counts[rule]??0)+1;}
function walk(dir){return fs.existsSync(dir)?fs.readdirSync(dir).flatMap(name=>{const p=path.join(dir,name);return fs.statSync(p).isDirectory()?walk(p):p.endsWith('.json')?[p]:[];}):[];}
const lessons=walk(path.join(CONTENT,'lessons')).map(file=>({file,...JSON.parse(fs.readFileSync(file,'utf8'))}));
const assessments=walk(path.join(CONTENT,'assessments')).map(file=>({file,...JSON.parse(fs.readFileSync(file,'utf8'))}));
const map=JSON.parse(fs.readFileSync(path.join(CONTENT,'map/curriculum.json'),'utf8'));
const order=map.phases.flatMap(p=>p.modules.flatMap(m=>m.lessons.map(l=>typeof l==='string'?l:l.id)));
const ids=new Set(lessons.map(l=>l.id)); const position=new Map(order.map((id,i)=>[id,i]));
const gradingSource=fs.readFileSync(path.join(ROOT,'src/lib/grading.ts'),'utf8');
const gradingModule={exports:{}};
const gradingJs=ts.transpileModule(gradingSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(gradingJs,{exports:gradingModule.exports,module:gradingModule},{timeout:1000});
const {gradeAnswer}=gradingModule.exports;
const urls=new Set();
const banned=/\b(delve|leverage|seamless|crucial|pivotal|myriad|plethora|tapestry|holistic|streamline|elevate|empower)\b/i;
function prose(node,cb,location=''){
 if(typeof node==='string')cb(node,location);
 else if(Array.isArray(node))node.forEach((v,i)=>prose(v,cb,`${location}[${i}]`));
 else if(node&&typeof node==='object')for(const [k,v]of Object.entries(node)){
  if(['code','tests','solutions','starterFiles','id','slug','file','requires','keywords','answer','answerIndex','answerIndices','params'].includes(k))continue;
  prose(v,cb,location+'.'+k);
 }
}
function checkMath(text,id,location){
 const s=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'').replace(/\\\$/g,'\u0001');
 if(location.endsWith('.tex')){try{katex.renderToString(text,{throwOnError:true,strict:'ignore'});}catch(e){fail('math_parse',id,{location,message:e.message});}return;}
 if((s.match(/\$/g)||[]).length%2)fail('math_delimiters',id,{location,text});
 for(const m of s.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)){
  const tex=(m[1]??m[2]).replace(/\u0001/g,'\\$');
  try{katex.renderToString(tex,{throwOnError:true,strict:'ignore'});}catch(e){fail('math_parse',id,{location,tex,message:e.message});}
  // \text{...} is intentional prose inside math; English outside it is a currency delimiter leak.
  const outside=tex.replace(/\\(?:text|textrm|textbf|mathrm|operatorname)\{[^{}]*\}/g,'').replace(/\\[A-Za-z]+/g,'');
  if(/\b[a-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}\b/.test(outside))fail('currency_in_math',id,{location,tex});
 }
}
function questions(items,id,objectives){
 const seen=new Set();
 for(const q of items){
  const qid=id+':'+q.id;const key=q.prompt.trim().toLowerCase();
  if(seen.has(key))fail('duplicate_prompt',qid,q.prompt);seen.add(key);
  if((q.explanation??'').length<80)fail('short_explanation',qid,(q.explanation??'').length);
  if(/\b(?:option|choice|answer)\s+[A-D]\b/.test(q.explanation??''))fail('letter_reference',qid,q.explanation);
  if(q.type==='mcq'){
   const options=q.options??[];const lengths=options.map(s=>s.length);const correct=lengths[q.answerIndex];
   const other=Math.max(...lengths.filter((_,i)=>i!==q.answerIndex));
   if(correct>1.25*other)fail('length_tell',qid,{correct,nextLongest:other});
   if(options.some(s=>/all of the above|none of the above/i.test(s)))fail('all_none_option',qid,options);
   if(new Set(options.map(s=>s.trim().toLowerCase())).size!==options.length)fail('duplicate_options',qid,options);
  }
  if(q.type==='ms'&&(q.answerIndices.length<2||q.answerIndices.length>=q.options.length))fail('multiselect_count',qid,q.answerIndices);
  if(q.type==='numeric'&&!Number.isInteger(q.answer)&&(!Number.isFinite(q.tolerance)||q.tolerance<=0))fail('numeric_tolerance',qid,q.answer);
  if(q.type==='short'){
   if(!q.modelAnswer)fail('short_model_answer',qid,'Missing modelAnswer');
   else if(!gradeAnswer(q,q.modelAnswer))fail('short_model_rejected',qid,{modelAnswer:q.modelAnswer,keywords:q.keywords});
   if((q.keywords??[]).length<3)fail('short_keyword_groups',qid,q.keywords);
  }
  if(objectives&&(!Number.isInteger(q.objective)||q.objective<0||q.objective>=objectives.length))fail('objective_mapping',qid,q.objective??'missing');
 }
 if(objectives)for(let i=0;i<objectives.length;i++)if(!items.some(q=>q.objective===i))fail('objective_coverage',id,{objective:i,text:objectives[i]});
}
function distribution(group,label){
 const qs=group.flatMap(l=>l.quiz??l.sections.flatMap(s=>s.questions)).filter(q=>q.type==='mcq');
 const dist=[0,0,0,0];for(const q of qs)dist[q.answerIndex]++;
 for(let i=0;i<4;i++)if(qs.length&&((dist[i]/qs.length)<.22||(dist[i]/qs.length)>.28))fail('answer_position',label,{index:i,count:dist[i],total:qs.length});
 for(const l of group){const local=(l.quiz??l.sections.flatMap(s=>s.questions)).filter(q=>q.type==='mcq');if(local.length>1&&new Set(local.map(q=>q.answerIndex)).size===1)fail('same_position',l.id,local.map(q=>q.answerIndex));}
 return dist;
}
function bodyWords(l){return l.blocks.reduce((n,b)=>n+(b.type==='p'||b.type==='callout'?(b.md??''):['h2','h3'].includes(b.type)?b.text:['list','steps'].includes(b.type)?b.items.join(' '):b.type==='table'?[...b.headers,...b.rows.flat()].join(' '):'').split(/\s+/).filter(Boolean).length,0);}
for(const l of lessons){
 questions(l.quiz,l.id,l.objectives);
 const words=bodyWords(l);
 if(words<600||words>1100)fail('lesson_length',l.id,{words,min:600,max:1100});
 const time=Math.max(10,Math.min(60,Math.round((words/200+l.quiz.length+(l.guidedExercise?8:0)+(l.independentExercise?12:0)+3*l.blocks.filter(b=>b.type==='interactive').length)/5)*5));
 if(l.estMinutes!==time)fail('estimated_minutes',l.id,{actual:l.estMinutes,expected:time});
 for(const p of l.prereqs){if(!ids.has(p))fail('missing_prerequisite',l.id,p);else if(position.get(p)>=position.get(l.id))fail('prerequisite_order',l.id,p);}
 if(!l.prereqs.length&&l.id!==order[0])fail('rootless_lesson',l.id,'Needs an explicit entry-point or dependency review');
 for(const k of ['guidedExercise','independentExercise']){
  if((l[k]?.hints??[]).length<3)fail('exercise_hints',l.id+':'+k,l[k]?.hints?.length??0);
  if(!l[k]?.successCheck)fail('exercise_success_check',l.id+':'+k,'Missing explicit successCheck');
 }
 const fronts=new Set();for(const c of l.flashcards){if(fronts.has(c.front))fail('duplicate_flashcard',l.id,c.front);fronts.add(c.front);if(c.back.length>250)fail('long_flashcard',l.id,{front:c.front,length:c.back.length});}
 if(l.flashcards.length<4||l.flashcards.length>6)fail('flashcard_count',l.id,l.flashcards.length);
 const types=new Set(l.quiz.map(q=>q.type));if(l.quiz.length<6||types.size<3)fail('quiz_diversity',l.id,{questions:l.quiz.length,types:[...types]});
}
// Graph cycle detection is independent of curriculum ordering.
const byId=new Map(lessons.map(l=>[l.id,l]));const colours=new Map();
function dfs(id){colours.set(id,1);for(const p of byId.get(id)?.prereqs??[]){if(colours.get(p)===1)fail('prerequisite_cycle',id,p);else if(!colours.has(p)&&byId.has(p))dfs(p);}colours.set(id,2);}
for(const id of ids)if(!colours.has(id))dfs(id);
for(const a of assessments){questions(a.sections.flatMap(s=>s.questions),a.id);for(const q of a.sections.flatMap(s=>s.questions))if(!q.lessonId||!ids.has(q.lessonId))fail('assessment_lesson_link',a.id+':'+q.id,q.lessonId??'missing');if(typeof a.passMark!=='number')fail('assessment_pass_mark',a.id,'missing');if(!(a.scoreBands??a.resultBands)?.length)fail('assessment_result_bands',a.id,'missing');}
for(const f of walk(CONTENT).filter(f=>!path.relative(CONTENT,f).split(path.sep).some(part=>part.startsWith('.'))&&!f.endsWith('registry.json'))){
 const data=JSON.parse(fs.readFileSync(f,'utf8'));prose(data,(text,location)=>{
  if(location.endsWith('.url')){try{const u=new URL(text);if(!['http:','https:'].includes(u.protocol))throw new Error();urls.add(text);}catch{fail('reference_url_syntax',path.relative(CONTENT,f),text);}return;}
  checkMath(text,path.relative(CONTENT,f),location);
  const visible=text.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'');
  if(/[\u2013\u2014]/.test(visible))fail('dash',path.relative(CONTENT,f),location);
  if(banned.test(visible))fail('banned_word',path.relative(CONTENT,f),{location,word:visible.match(banned)[0]});
  if(/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(visible))fail('placeholder',path.relative(CONTENT,f),location);
 });
}
const distributions={lessons:distribution(lessons,'lessons'),assessments:distribution(assessments,'assessments')};
const execPath=path.join(CONTENT,'.truth-exec.json');
const run=spawnSync(process.env.QF_PYTHON??'python3',[path.join(ROOT,'scripts/audit/truth_exec.py'),ROOT,execPath],{cwd:ROOT,encoding:'utf8',timeout:600000,env:process.env});
process.stdout.write(run.stdout??'');if(run.stderr)process.stderr.write(run.stderr);
let execution=null;
if(run.status!==0)fail('execution_checker','tool',{status:run.status,error:run.error?.message});
else{
 execution=JSON.parse(fs.readFileSync(execPath,'utf8'));
 for(const r of execution.results){if(['DECLARED_FRAGMENT','DEPENDENCY_MISSING'].includes(r.status))deferred.push(r);else if(r.status==='UNSUPPORTED_LANGUAGE'){if(r.kind==='code-output')fail('unsupported_code_output',r.id,r);else deferred.push(r);}else if(r.status!=='OK')fail('execution',r.id,r);}
 const py=execution.versions.python[0]?.match(/(\d+)\.(\d+)/);if(!py||+py[1]<3||(+py[1]===3&&+py[2]<11))fail('runtime_version','Python',execution.versions.python);
 const gcc=execution.versions.cpp[0]?.match(/(\d+)\.(\d+)/);if(!gcc||+gcc[1]<12)fail('runtime_version','GCC',execution.versions.cpp);
 if(!Object.values(execution.crossVersionRuntimes).every(Boolean))deferred.push({id:'python_cross_version',reason:'Both Python 3.11 and 3.12 were not available for comparison',runtimes:execution.crossVersionRuntimes});
}
let network={status:'not-run',reason:'Run node scripts/check-content-urls.mjs. Reachability is not claimed.'};
const networkFile=path.join(CONTENT,'.truth-urls.json');
if(fs.existsSync(networkFile)){
 const stored=JSON.parse(fs.readFileSync(networkFile,'utf8'));
 network={status:'transport-only',generatedAt:stored.generatedAt,checked:0,pending:[],redirects:[],unverifiable:[]};
 for(const url of urls){
  const r=stored.results[url];
  if(!r){network.pending.push(url);continue;}
  network.checked++;
  if(r.status===404)fail('reference_url_404',url,{status:r.status,checkedAt:r.checkedAt});
  else if(!r.ok)network.unverifiable.push({url,...r});
  if(r.resolvedUrl&&r.resolvedUrl!==url)network.redirects.push({from:url,to:r.resolvedUrl});
 }
 // A successful HTTP response does not establish that a page is relevant or not a soft 404.
 deferred.push({id:'reference_url_content',reason:'Transport checks are cached evidence only; owning-source content/relevance review remains open.'});
 if(network.pending.length||network.unverifiable.length)deferred.push({id:'reference_url_network',pending:network.pending.length,unverifiable:network.unverifiable.length});
}else deferred.push({id:'reference_url_network',...network});
const report={schemaVersion:1,generatedAt:new Date().toISOString(),passed:failures.length===0&&deferred.length===0,lessonCount:lessons.length,assessmentCount:assessments.length,counts,failures,deferred,distributions,execution:execution?{jobs:execution.jobs,counts:execution.counts,versions:execution.versions}:null,network};
fs.writeFileSync(path.join(CONTENT,'.truth-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failures:failures.length,deferred:deferred.length,counts,distributions},null,2));
process.exitCode=report.passed?0:1;
