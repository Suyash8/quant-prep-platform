#!/usr/bin/env node
/** Calculate the specification's study-time rule; --write updates lesson data, --map also refreshes map metadata. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const timeById=new Map();let changes=0;
for(const phase of fs.readdirSync(path.join(ROOT,'content/lessons'))){
 const dir=path.join(ROOT,'content/lessons',phase);if(!fs.statSync(dir).isDirectory())continue;
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){
  const file=path.join(dir,name),lesson=JSON.parse(fs.readFileSync(file,'utf8'));
  const words=lesson.blocks.reduce((n,b)=>n+(b.type==='p'||b.type==='callout'?(b.md??''):['h2','h3'].includes(b.type)?b.text:['list','steps'].includes(b.type)?b.items.join(' '):b.type==='table'?[...b.headers,...b.rows.flat()].join(' '):'').split(/\s+/).filter(Boolean).length,0);
  const minutes=Math.max(10,Math.min(60,Math.round((words/200+lesson.quiz.length+(lesson.guidedExercise?8:0)+(lesson.independentExercise?12:0)+3*lesson.blocks.filter(b=>b.type==='interactive').length)/5)*5));
  timeById.set(lesson.id,minutes);
  if(minutes!==lesson.estMinutes){changes++;console.log(`${lesson.id}: ${lesson.estMinutes} -> ${minutes} (${words} body words)`);lesson.estMinutes=minutes;if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(lesson,null,2)+'\n');}
 }
}
if(process.argv.includes('--map')){
 const file=path.join(ROOT,'content/map/curriculum.json'),map=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const p of map.phases)for(const m of p.modules)for(const l of m.lessons)if(typeof l==='object'&&timeById.has(l.id))l.estMinutes=timeById.get(l.id);
 if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(map,null,2)+'\n');
}
console.log(`Time-rule differences: ${changes}${process.argv.includes('--write')?' (written)':''}. This calculation does not imply human editorial sign-off.`);
process.exitCode=changes&&!process.argv.includes('--write')?1:0;
