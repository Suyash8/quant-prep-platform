import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { LessonUnavailable } from '@/components/v5/lesson-unavailable';
import type { Lesson,Question } from '@/lib/v5/types';
import { AuthoredPreview } from '@/components/v5/authored-preview';
export const metadata={title:'Authored lesson interface preview | QuantFoundry',robots:{index:false,follow:false}};
export default async function AuthoredPreviewPage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^qf5-[a-z0-9-]+$/.test(id))return <LessonUnavailable reason="unknown" returnHref="/v5/preview"/>;const root=path.join(process.cwd(),'content-v5');const file=path.join(root,'lessons',id+'.json');if(!fs.existsSync(file)){const map=JSON.parse(fs.readFileSync(path.join(root,'curriculum','map.json'),'utf8'));const found=map.modules?.flatMap((m:{lessons: {id:string;title:string;status?:string}[]})=>m.lessons).find((l:{id:string})=>l.id===id);return <LessonUnavailable reason={found?.status==='planned'?'planned':found?'not-stored':'unknown'} lessonTitle={found?.title} returnHref="/v5/preview"/>;}const lesson=JSON.parse(fs.readFileSync(file,'utf8')) as Lesson;const questions:Question[]=fs.readdirSync(path.join(root,'items')).filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'items',f),'utf8')).items??[]);const fixturePackSha=createHash('sha256').update(JSON.stringify(questions)).digest('hex');return <AuthoredPreview lesson={lesson} questions={questions} fixturePackSha={fixturePackSha}/>;}
