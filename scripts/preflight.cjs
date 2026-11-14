// Startup check for the code judge's prerequisites. Prints what is missing; never blocks startup (everything except code judging works without them).
const { spawnSync } = require('node:child_process');
const need = [['bun', ['--version'], 'starts the code-runner service (mini-services/code-runner/index.ts)'], ['python3', ['--version'], 'runs Python submissions'], ['g++', ['--version'], 'compiles C++ submissions']];
let missing = 0;
for (const [cmd, args, why] of need) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error || r.status !== 0) { missing++; console.warn(`[preflight] MISSING on PATH: ${cmd} (${why}). Code checks will report "not judged" until it is installed.`); }
  else console.log(`[preflight] ok: ${cmd} ${(r.stdout || r.stderr).split('\n')[0]}`);
}
process.exit(0);
