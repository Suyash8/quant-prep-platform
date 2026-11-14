const B = process.argv[2] ?? 'http://127.0.0.1:3002';
let r=await fetch(B+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:(process.env.QF_DEMO_EMAIL || ''),password:(process.env.QF_DEMO_PASSWORD || '')})});
console.log('login',r.status);const ck=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
r=await fetch(B+'/api/judge/submit',{method:'POST',headers:{'content-type':'application/json',cookie:ck},body:JSON.stringify({slug:'anagram-groups',language:'python',code:'print(0)'})});
const j=await r.json();console.log(r.status,j.verdict,j.passed,'/',j.total);
console.log((j.results||[]).slice(0,12).map(x=>[x.index,x.passed,x.hidden,'expected' in x?'HAS_EXPECTED':'no_expected',x.exitCode].join(':')).join(' | '));
// sync double send
const ev={events:[{id:'t-'+Date.now(),kind:'drill_session',correct:3,answered:5,at:new Date().toISOString()}]};
const post=()=>fetch(B+'/api/sync',{method:'POST',headers:{'content-type':'application/json',cookie:ck},body:JSON.stringify(ev)}).then(r=>r.json());
const [a,b]=await Promise.all([post(),post()]);console.log('sync applied',a.applied,b.applied,'drills',a.snapshot.drills.sessions,b.snapshot.drills.sessions);
const bad=await fetch(B+'/api/sync',{method:'POST',headers:{'content-type':'application/json',cookie:ck},body:JSON.stringify({events:[{id:'x',kind:'evil'}]})});console.log('bad kind',bad.status);
