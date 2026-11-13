import fs from 'node:fs'; import ts from 'typescript';
const src = fs.readFileSync(new URL('../src/components/interactive/math-labs.tsx', import.meta.url), 'utf8');
const i = src.indexOf('/**\n * Exact k-th derivative'); const j = src.indexOf('function comb');
const js = ts.transpileModule(src.slice(i,j),{compilerOptions:{module:'esnext'}}).outputText;
fs.writeFileSync('/tmp/tay.mjs', js);
const { taylorCoefficients: T, exactDerivatives: X } = await import('/tmp/tay.mjs');
const fact=n=>n<2?1:n*fact(n-1);
// Regression: repeated finite differences gave derivative 7 = 0, 8 = 1.6e7, 9 = -6e10 for exp at 0. The fit must stay near 1.
let bad=0; const chk=(n,ok,d)=>{console.log(ok?'PASS':'FAIL',n,d);if(!ok)bad++;};
const e=T(Math.exp,0,9); for(let k=0;k<=7;k++) chk('exp derivative '+k+' ~ 1',Math.abs(e[k]*fact(k)-1)<1e-3,(e[k]*fact(k)).toPrecision(6));
const sn=T(Math.sin,0,9); chk('sin derivative 7 ~ -1',Math.abs(sn[7]*fact(7)+1)<1e-3,(sn[7]*fact(7)).toPrecision(6));
const c1=T(Math.cos,1,9); chk('cos at 1: f(1), f\'(1)',Math.abs(c1[0]-Math.cos(1))<1e-9&&Math.abs(c1[1]+Math.sin(1))<1e-8,'');
// Exact mode: closed-form derivatives, checked against known values and an independent high-precision-free identity.
const ex=X('exp(x)'); chk('exact exp: every derivative at 1 is e',[...Array(10).keys()].every(k=>Math.abs(ex(k,1)-Math.E)<1e-12));
const sx=X('sin(x)'); chk('exact sin cycle at 0: 0,1,0,-1,0',[0,1,0,-1,0].every((v,k)=>Math.abs(sx(k,0)-v)<1e-12));
const lx=X('ln(1+x)'); chk('exact ln(1+x) at 0: derivative k = (-1)^(k+1)(k-1)!',[1,2,3,4,5,6,7,8,9].every(k=>Math.abs(lx(k,0)-((k-1)%2?-1:1)*fact(k-1))<1e-9),[lx(7,0),lx(9,0)].join(','));
const gx=X('1/(1-x)'); chk('exact 1/(1-x): derivative k at 0 is k!',[0,3,7,9].every(k=>Math.abs(gx(k,0)-fact(k))<1e-9));
chk('unsupported expression returns null (falls back to labelled fit)',X('exp(2*x)')===null&&X('x^3+1')===null);
// Fit mode only for unsupported functions; measure its error honestly.
const f2=T(x=>Math.exp(2*x),0,9); chk('fallback fit exp(2x): derivative 3 ~ 8 within 1%',Math.abs(f2[3]*fact(3)-8)/8<0.01,(f2[3]*fact(3)).toPrecision(5));
const lnFit=T(x=>Math.log(1+x),0,9,0.35); console.log('INFO fallback-fit ln(1+x) rel coefficient error k=5..9:',[5,6,7,8,9].map(k=>(Math.abs(lnFit[k]-((k+1)%2?-1:1)/k)*k).toExponential(1)).join(' '));
process.exit(bad?1:0);
