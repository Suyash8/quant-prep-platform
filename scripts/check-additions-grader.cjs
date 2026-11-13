// Run against the actual current shared implementation, not a reimplementation.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const source=process.argv[2]||'src/lib/grading.ts';
const compiled=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{}};vm.runInNewContext(compiled,sandbox);
const ids=new Set(JSON.parse(fs.readFileSync('content/new-lesson-insertions.json','utf8')).map(x=>x.lesson.id));
const files=fs.readdirSync('content/assessments').filter(x=>x.endsWith('.json')).map(x=>'content/assessments/'+x);
for(const mod of fs.readdirSync('content/lessons'))for(const f of fs.readdirSync('content/lessons/'+mod))if(ids.has(f.replace(/\.json$/,'')))files.push('content/lessons/'+mod+'/'+f);
const results=[];let errors=[];
for(const f of files){const d=JSON.parse(fs.readFileSync(f,'utf8'));for(const q of d.quiz||d.sections.flatMap(s=>s.questions)){if(q.type!=='short')continue;const score=sandbox.exports.keywordsHit(q.modelAnswer,q.keywords);const pass=sandbox.exports.gradeAnswer(q,q.modelAnswer);results.push({id:d.id+':'+q.id,score,pass});if(!pass)errors.push(d.id+':'+q.id);}}
const report={source,files:files.length,shortModelAnswers:results.length,results,errors};fs.writeFileSync('content/additions-grader-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
