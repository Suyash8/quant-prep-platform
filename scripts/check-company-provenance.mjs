#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'content/companies');
const map=JSON.parse(fs.readFileSync(path.join(root,'content/map/curriculum.json')));
const modules=new Set(map.phases.flatMap(p=>p.modules.map(m=>m.id)));
const assessments=new Set(fs.readdirSync(path.join(root,'content/assessments')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)));
const profiles=fs.readdirSync(dir).filter(f=>!f.startsWith('_')&&f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f))));
const byId=new Map(profiles.map(p=>[p.slug,p]));
const matrix=JSON.parse(fs.readFileSync(path.join(dir,'_matrix.json')));const errors=[];
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s??'');
for(const p of profiles){
 for(const c of [...p.publishedExpectations,...p.roles,...p.competencyEvidence,p.preparationProvenance]){
  if(!date(c.asOf)||!/^https:\/\//.test(c.sourceUrl??'')) errors.push(`${p.slug}: undated or unsourced claim`);
  if(!['sourced','inferred'].includes(c.confidence)) errors.push(`${p.slug}: invalid confidence`);
 }
 for(const m of p.prepModules)if(!modules.has(m))errors.push(`${p.slug}: missing module ${m}`);
 for(const a of p.prepAssessments)if(!assessments.has(a))errors.push(`${p.slug}: missing assessment ${a}`);
 for(const c of p.publishedExpectations){
  if(c.confidence==='sourced'&&c.verificationStatus!=='verified-page')errors.push(`${p.slug}: sourced without page verification`);
  if(/\blive in\b|salary|hiring odds/i.test(c.claim))errors.push(`${p.slug}: time-sensitive or forbidden claim`);
  for(const m of c.claim.matchAll(/"([^\"]+)"/g))if(m[1].split(/\s+/).length>25)errors.push(`${p.slug}: long quotation`);
 }
}
for(const r of matrix.companyRows){const p=byId.get(r.company);const included=p?.competencyAreas.includes(r.skill);if(!p||r.inCompetencyAreas!==included||(included?r.tier!=='role-dependent':r.tier!=='varies'))errors.push(`${r.company}/${r.skill}: matrix/profile mismatch`);}
if(matrix.companyRows.length!==profiles.length*matrix.rows.length)errors.push('Incomplete company matrix');
if(!date(matrix.generatedAt))errors.push('Undated matrix');
console.log(JSON.stringify({profiles:profiles.length,claims:profiles.reduce((n,p)=>n+p.publishedExpectations.length,0),companyMatrixCells:matrix.companyRows.length,unverified:profiles.filter(p=>p.verificationStatus==='unverified-recent').map(p=>p.slug),errors},null,2));
process.exitCode=errors.length?1:0;
