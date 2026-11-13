#!/usr/bin/env node
/** List US spelling in prose without touching executable code or quoted API names. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const protectedKeys=new Set(['code','solutionCode','solutions','tests','answer','expected','starterFiles','tex','params','url','id','slug','keywords','file','requires','moduleId','skills','prereqs','references','component','language','lang','type','variant']);
const pattern=/\b(?:optimiz|normaliz|standardiz|visualiz|minimiz|maximiz|initializ|serializ|randomiz|utiliz|realiz|recogniz|organiz|synchroniz|generaliz|parameteriz|lineariz|analyz)\w*\b|\b(?:behavior|behaviors|color|colors|center|centers|labeled|labeling|modeling)\b/gi;
const findings=[];
function inspect(node,file,location=''){
 if(typeof node==='string'){
  const visible=node.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'').replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g,'');
  for(const m of visible.matchAll(pattern))findings.push({file,location,word:m[0]});
 }else if(Array.isArray(node))node.forEach((v,i)=>inspect(v,file,`${location}[${i}]`));
 else if(node&&typeof node==='object')for(const[k,v]of Object.entries(node))if(!protectedKeys.has(k))inspect(v,file,location+'.'+k);
}
function walk(dir){for(const name of fs.readdirSync(dir)){if(name.startsWith('.'))continue;const p=path.join(dir,name);if(fs.statSync(p).isDirectory())walk(p);else if(p.endsWith('.json')&&!p.endsWith('registry.json'))inspect(JSON.parse(fs.readFileSync(p,'utf8')),path.relative(ROOT,p));}}
walk(path.join(ROOT,'content'));
if(process.argv.includes('--json'))console.log(JSON.stringify({count:findings.length,findings},null,2));
else {for(const f of findings)console.log(`${f.file}${f.location}: ${f.word}`);console.log(`US prose forms: ${findings.length}`);}
process.exitCode=findings.length?1:0;
