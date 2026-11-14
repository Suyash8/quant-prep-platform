#!/usr/bin/env node
// Adversarial isolation checks against a RUNNING code-runner (default http://127.0.0.1:3010). Exit 1 on any failure.
// Every probe is a real program run through /run in Python and C++. Usage: node scripts/verify-runner-isolation.mjs [runnerUrl] [out.json]
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:3010'; const out = process.argv[3];
const results = []; const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' ' + String(detail).slice(0, 300))); };
const run = async (language, code, stdin = '', t = 8000, m = 256) => (await (await fetch(base + '/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language, code, stdin, timeLimitMs: t, memoryLimitMb: m }) })).json());
const health = await (await fetch(base + '/health')).json();
check('runner reports an ACTIVE namespace sandbox', health.sandbox?.active === true, JSON.stringify(health.sandbox));
const py = async (code, t, m) => { const r = await run('python', code, '', t, m); return { r, so: r.run?.stdout ?? '', v: r.verdict }; };
const cpp = async (code, t, m) => { const r = await run('cpp20', '#include <bits/stdc++.h>\n#include <unistd.h>\n#include <sys/socket.h>\n#include <netinet/in.h>\n#include <arpa/inet.h>\nusing namespace std;\n' + code, '', t, m); return { r, so: r.run?.stdout ?? '', v: r.verdict }; };
// 1. environment
let x = await py('import os\nprint(sorted(k for k in os.environ if k not in ("PATH","LC_CTYPE","LC_ALL","LANG")))'); check('python: no host environment variables', x.so.trim() === '[]', x.so);
x = await cpp('int main(){extern char**environ;int n=0;for(char**e=environ;*e;e++){string s=*e; if(s.rfind("PATH=",0)&&s.rfind("HOME=",0)&&s.rfind("LC_",0)) n++;}cout<<n;}'); check('c++: no host environment variables', x.so.trim() === '0', x.so);
// 2. filesystem view
x = await py('import os\nprint(sorted(os.listdir("/")))'); check('python: root holds only the minimal toolchain mounts (a /home directory may exist only as the mount point of a custom toolchain)', !/downloads|'root'|'var'|'opt'|'srv'|'mnt'|'media'/.test(x.so), x.so);
x = await py('import os,glob\nsecrets=[p for pat in ("/home/*/.ssh","/home/*/.bash_history","/home/*/.config","/home/*/.env","/home/*/.gitconfig","/home/*/.npm","/home/*/.cache","/home/*/Downloads","/home/*/downloads","/root","/downloads","/var","/opt","/srv","/mnt","/etc/passwd","/etc/shadow") for p in glob.glob(pat)]\nprint(secrets)'); check('python: no host secrets, home contents or other users\' files visible', x.so.trim() === '[]', x.so);
x = await py('try:\n    open("/usr/qf-x","w"); print("WRITABLE")\nexcept Exception as e: print("ro")\ntry:\n    open("/etc/qf-x","w"); print("WRITABLE")\nexcept Exception as e: print("ro")'); check('python: system dirs are read-only', x.so.trim() === 'ro\nro', x.so);
// 3. network
x = await py(`import socket
for h,p in (("127.0.0.1",3010),("127.0.0.1",3112),("1.1.1.1",53),("10.0.0.1",80)):
    try: socket.create_connection((h,p),timeout=2); print("OPEN",h,p)
    except Exception as e: print("blocked")
try: print("DNS", socket.gethostbyname("example.com"))
except Exception as e: print("dns blocked")`); check('python: no network (loopback services, internet, private net, DNS)', !/OPEN|DNS \d/.test(x.so) && /dns blocked/.test(x.so), x.so);
x = await cpp('int main(){int s=socket(AF_INET,SOCK_STREAM,0);sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(3010);inet_pton(AF_INET,"127.0.0.1",&a.sin_addr);int r=connect(s,(sockaddr*)&a,sizeof a);cout<<(r==0?"OPEN":"blocked");}'); check('c++: cannot connect to the runner on loopback', x.so.trim() === 'blocked', x.so);
// 4. process isolation and cleanup
x = await py('import os\nprint(len([p for p in os.listdir("/proc") if p.isdigit()]))'); check('python: sees only its own process tree (pid namespace)', Number(x.so.trim()) <= 6, x.so);
x = await py('import os,time\nif os.fork()==0:\n    time.sleep(60)\n    os._exit(0)\nprint("parent done")'); await new Promise((r) => setTimeout(r, 1500));
const h2 = await (await fetch(base + '/health')).json(); check('a background child left by a job does not keep running or blocking the runner', x.so.includes('parent done') && h2.active === 0, JSON.stringify(h2));
x = await py('import os\ntry:\n    while True: os.fork()\nexcept OSError as e: print("limited")\n', 8000); const h3 = await (await fetch(base + '/health')).json(); check('python: fork bomb is bounded and the runner stays healthy', h3.ok === true, x.v + ' ' + x.so.slice(0, 80));
x = await cpp('int main(){int n=0;for(;;){pid_t p=fork();if(p==0){for(;;)pause();}if(p<0)break;n++;}cout<<"limited "<<(n<2000);}', 8000); const h4 = await (await fetch(base + '/health')).json(); check('c++: fork bomb is bounded and the runner stays healthy', h4.ok === true && h4.active === 0, x.v + ' ' + x.so.slice(0, 80));
// 5. no state between jobs
await py('open("leak.txt","w").write("A")\nopen("/tmp/leak2","w").write("A")'); x = await py('import os\nprint(os.path.exists("leak.txt"), os.path.exists("/tmp/leak2"), os.listdir("."))'); check('files written by one job are not visible to the next', /^False False/.test(x.so), x.so);
// 6. resources
x = await py('while True: pass', 1500); check('infinite loop is killed by the wall clock', x.r.run?.timedOut === true || /time/i.test(x.v), x.v);
x = await py('x=bytearray(500*1024*1024)\nprint("allocated")', 8000, 128); check('500 MB allocation at a 128 MB limit is a runtime_error (address-space limit)', x.v === 'runtime_error' && !/allocated/.test(x.so), x.v);
x = await py('import sys\nsys.stdout.write("x"*(6*1024*1024))', 8000); check('runaway output is killed (output_limit)', x.v === 'output_limit' || x.r.run?.killedByLimit === true, x.v);
x = await py('f=open("big","wb")\ntry:\n    f.write(b"x"*(200*1024*1024)); f.flush(); print("wrote")\nexcept Exception as e: print("limited")', 15000); check('single-file writes are bounded (RLIMIT_FSIZE)', !/wrote/.test(x.so), x.so + x.v);
x = await py('import socket\nprint(socket.gethostname())'); check('hostname is not inherited from the host', x.so.trim() === 'qfjudge', x.so);
// 7. aggregate disk budget (one budget covers cwd, outputs and /tmp)
x = await py('import os\nfor i in range(40):\n    with open(f"/tmp/f{i}","wb") as f: f.write(b"x"*(30*1024*1024))\nprint("wrote-all")', 20000); check('aggregate writes to /tmp are cut off by the disk budget', !/wrote-all/.test(x.so) && (x.v === 'output_limit' || x.r.run?.killedByLimit), x.v + ' ' + x.so);
x = await py('import os\nfor i in range(40):\n    with open(f"f{i}","wb") as f: f.write(b"x"*(30*1024*1024))\nprint("wrote-all")', 20000); check('aggregate writes to the job directory are cut off by the disk budget', !/wrote-all/.test(x.so) && (x.v === 'output_limit' || x.r.run?.killedByLimit), x.v + ' ' + x.so);
x = await py('import os\nfor i in range(40):\n    with open(f"/dev/shm/f{i}","wb") as f: f.write(b"x"*(30*1024*1024))\nprint("wrote-all")', 20000); check('aggregate writes to /dev/shm are cut off by the disk budget', !/wrote-all/.test(x.so) && (x.v === 'output_limit' || x.r.run?.killedByLimit), x.v + ' ' + x.so);
x = await py('import os\nfor i in range(50000):\n    open(f"/tmp/n{i}","w").close()\nprint("made-all")', 20000); check('creating tens of thousands of files is cut off', !/made-all/.test(x.so), x.v + ' ' + x.so.slice(0, 60));
const tmpUsed = await py('import os\nprint([n for n in os.listdir("/tmp") if n[0] in "fnz"])'); check('the disk budget kill leaves nothing behind for the next job', tmpUsed.so.trim() === '[]', tmpUsed.so);
// 8. nothing persists between the tests of ONE submission
{ const sub = await (await fetch(base + '/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'python', code: 'import os\nopen("seen","a").write("x")\nopen("/tmp/seen2","a").write("x")\nprint(os.path.exists("seen") and os.path.getsize("seen")>1, os.path.exists("/tmp/seen2") and os.path.getsize("/tmp/seen2")>1)', tests: [{ input: '', expected: 'False False' }, { input: '', expected: 'False False' }, { input: '', expected: 'False False' }], timeLimitMs: 4000, memoryLimitMb: 128 }) })).json(); check('files written during one test are gone before the next test of the same submission', sub.verdict === 'passed' && sub.passed === 3, JSON.stringify({ v: sub.verdict, p: sub.passed })); }
// 9. concurrency and the bounded queue
{ const t0 = Date.now(); const good = (n) => fetch(base + '/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'cpp20', code: '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}', tests: [{ input: '1 2', expected: '3' }, { input: '5 7', expected: '12' }], timeLimitMs: 4000, memoryLimitMb: 128 }) }).then((r) => r.json());
  const hostile = [py('import os\ntry:\n    while True: os.fork()\nexcept OSError: pass', 6000), py('x=[]\nwhile True: x.append(bytearray(10**7))', 6000, 128), py('while True: pass', 1500), cpp('int main(){for(;;){pid_t p=fork();if(p==0)for(;;)pause();if(p<0)break;}}', 6000), py('open("/tmp/z","wb").write(b"x"*(60*1024*1024))\nwhile True: open("/tmp/z2","ab").write(b"x"*(5*1024*1024))', 10000)];
  const goods = [good(1), good(2), good(3), good(4)];
  const [gr, hr] = await Promise.all([Promise.all(goods), Promise.all(hostile)]);
  check('well-behaved submissions are judged correctly while hostile jobs run at the same time (4 good + 5 hostile in flight, within the 2 running + 8 queued cap)', gr.every((g) => g.verdict === 'passed' && g.passed === 2), gr.map((g) => g.verdict + ':' + g.passed).join(','));
  check('every hostile job ended with a bounded verdict, none hung', hr.every((h) => ['timeout', 'runtime_error', 'output_limit', 'ok'].includes(h.v)), hr.map((h) => h.v).join(',') + ` in ${Date.now() - t0} ms`);
  const hq = await (await fetch(base + '/health')).json(); check('after the concurrent burst the runner is idle and healthy', hq.ok && hq.active === 0, JSON.stringify(hq));
  const flood = await Promise.all(Array.from({ length: 80 }, () => fetch(base + '/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'python', code: 'import time\ntime.sleep(1.2)\nprint(1)', timeLimitMs: 3000 }) }).then((r) => r.status)));
  check('a flood of 80 parallel jobs is queued up to the cap and the excess is refused with 503 (never unbounded)', flood.filter((c) => c === 503).length >= 10 && flood.filter((c) => c === 200).length >= 8, JSON.stringify({ ok: flood.filter((c) => c === 200).length, busy: flood.filter((c) => c === 503).length }));
}
// 10. memory admission: jobs with big limits are not run side by side beyond the machine's RAM budget
{ const h0 = await (await fetch(base + '/health')).json(); const budget = h0.admission?.memBudgetMb; let worst = 0, alone = true; let stop = false;
  const poll = (async () => { while (!stop) { const h = await (await fetch(base + '/health')).json(); if (h.admission) { if (h.admission.reservedMb > budget && h.active > 1) alone = false; worst = Math.max(worst, h.admission.reservedMb); } await new Promise((r) => setTimeout(r, 60)); } })();
  const big = () => run('python', 'x=bytearray(300*1024*1024)\nimport time\ntime.sleep(0.6)\nprint("ok")', '', 8000, 1024);
  const rs = await Promise.all([big(), big(), big(), big()]); stop = true; await poll;
  check('four jobs at a 1024 MB limit never run side by side beyond the RAM budget (reserved <= budget, or a single job)', alone && rs.every((r) => r.verdict === 'ok'), JSON.stringify({ budget, worstReservedMb: worst, verdicts: rs.map((r) => r.verdict) })); }
check('runner still healthy after all probes', (await (await fetch(base + '/health')).json()).ok === true);
const failed = results.filter((r) => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} passed`); if (out) fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), runner: base, health, results }, null, 1)); process.exit(failed.length ? 1 : 0);
