import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ids=new Set(JSON.parse(fs.readFileSync(path.join(root,'content/new-lesson-insertions.json'))).map(x=>x.lesson.id));
const files=[];
for(const mod of fs.readdirSync(path.join(root,'content/lessons')))for(const f of fs.readdirSync(path.join(root,'content/lessons',mod)))if(ids.has(f.replace(/\.json$/,'')))files.push(path.join(root,'content/lessons',mod,f));
files.push(...fs.readdirSync(path.join(root,'content/assessments')).filter(x=>x.endsWith('.json')).map(x=>path.join(root,'content/assessments',x)));
let spans=0;const errors=[];
function walk(x,p=''){
 if(typeof x==='string'){
  if(/\.(code|url|sourceUrl|lessonUrl)$/.test(p))return;
  const text=x.replace(/```[\s\S]*?```/g,'').replace(/\\\$/g,'');
  if((text.match(/\$/g)||[]).length%2)errors.push({p,rule:'unbalanced dollars'});
  if(p.endsWith('.tex')){spans++;try{katex.renderToString(x,{throwOnError:true})}catch(e){errors.push({p,error:e.message})}return;}
  for(const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)){
   spans++;try{katex.renderToString(m[1]||m[2],{throwOnError:true})}catch(e){errors.push({p,error:e.message})}
  }
 }else if(Array.isArray(x))x.forEach((v,i)=>walk(v,p+'['+i+']'));
 else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x))walk(v,p+'.'+k);
}
for(const f of files)walk(JSON.parse(fs.readFileSync(f)),path.relative(root,f));
const report={files:files.length,spans,errors};fs.writeFileSync(path.join(root,'content/additions-math-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=errors.length?1:0;
