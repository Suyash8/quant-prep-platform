#!/usr/bin/env node
/** Resumable URL audit: bounded batches, persisted after each response. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILE=path.join(ROOT,'content/.truth-urls.json');const urls=new Set();
function scan(value,key=''){
 if(key==='url'&&typeof value==='string'&&/^https?:\/\//.test(value))urls.add(value);
 else if(Array.isArray(value))value.forEach(v=>scan(v));
 else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))scan(v,k);
}
function walk(dir){for(const n of fs.readdirSync(dir)){if(n.startsWith('.'))continue;const p=path.join(dir,n);if(fs.statSync(p).isDirectory())walk(p);else if(p.endsWith('.json')&&n!=='registry.json')scan(JSON.parse(fs.readFileSync(p,'utf8')));}}
walk(path.join(ROOT,'content'));
const prior=fs.existsSync(FILE)?JSON.parse(fs.readFileSync(FILE,'utf8')):{results:{}};
const results=Object.fromEntries(Object.entries(prior.results).filter(([url])=>urls.has(url)));
const limit=Number(process.argv[2]??64);const queue=[...urls].filter(u=>!results[u]).slice(0,limit);let cursor=0;
function save(){fs.writeFileSync(FILE,JSON.stringify({generatedAt:new Date().toISOString(),total:urls.size,checked:Object.keys(results).length,pending:urls.size-Object.keys(results).length,results},null,2)+'\n');}
await Promise.all(Array.from({length:8},async()=>{
 while(cursor<queue.length){const url=queue[cursor++];try{let response=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(6000)});if([404,405].includes(response.status))response=await fetch(url,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(6000)});results[url]={checkedAt:new Date().toISOString(),status:response.status,resolvedUrl:response.url,ok:response.ok};}catch(e){results[url]={checkedAt:new Date().toISOString(),status:'unverifiable',error:e.message};}save();}
}));
save();console.log(JSON.stringify({total:urls.size,checked:Object.keys(results).length,pending:urls.size-Object.keys(results).length,notFound:Object.entries(results).filter(([,r])=>r.status===404).map(([url])=>url),unverifiable:Object.values(results).filter(r=>r.status==='unverifiable'||(typeof r.status==='number'&&!r.ok&&r.status!==404)).length}));
