# Code runtime requirements and qualification (v5)

Grounded in the project's own files: SETUP.md (Python 3.12+ and GCC 12.4+ on the machine that runs the runner, `python3` and `/usr/bin/g++`, Bun for the runner), VERCEL_DEPLOY.md section 6 (the judge is a separate long-lived service on a VM or container, reached through `CODE_RUNNER_URL`), and the runner header (production should run it in a gVisor or Docker sandbox with the same HTTP contract). The web app never runs learner code itself.

## Contract the app depends on
- `POST /run` and `POST /submit` on the runner, loopback or `CODE_RUNNER_URL`. Learner stdin and test inputs up to 4 MiB are delivered whole; larger is rejected (413), never truncated. Judged stdout is killed above 4 MiB (`output_limit`). `/run` returns at most 256 KiB of stdout with `stdoutTruncated`. Python gets a compile() syntax stage and returns `compile_error` without running the code.
- The app route enforces readiness (`content-v5/_build/code-readiness.json`): `production` is empty. Nothing is judged for learners until an entry is added with evidence.

## Qualification procedure (reproducible)
1. On the real target, start the runner as it will run in production (same image, same isolation, same CPU and memory limits).
2. `node scripts/qualify-runtime.mjs <runner url> <out.json>` records the runtime fingerprint, compares it with the baseline above, and runs every authored reference solution (Python and C++) against the stored tests, recording verdicts and wall times.
3. Qualified only if: baseline met, all references pass, isolation confirmed (no network, no env leakage, rlimits and process limits effective, job cleanup), and the problem's limits re-measured there with margin.
4. Only then may a `production` entry be added, together with teaching linkage and the integrated learner flow. The script never edits the readiness file.
5. Re-run after any change to the runner, interpreter or compiler version, image, or hardware class.

## Local result (this development machine, not the target)
Python 3.10.12 and g++ 11.4.0: BELOW the baseline, so this machine is not a qualifying target. References: all pass after the output-cap fix (see content-v5/_evidence/runtime-qualification-local.json). Limits in `_build/limits.json` stay provisional.

## Local baseline result (free tooling, still NOT the deployment target)
The runner reads `PYTHON_BIN` and `CXX_BIN` (defaults `python3`, `/usr/bin/g++`). With uv Python 3.12.15 and conda-forge g++ 12.4.0 on this development machine (2 vCPU, 1.9 GiB), `node scripts/qualify-runtime.mjs` reports meetsBaseline true for both and all 16 reference runs (8 problems, Python and C++) pass (content-v5/_evidence/runtime-qualification-baseline-local.json). This proves the procedure and the baseline toolchain only: isolation (container/gVisor), real hardware class and limits are not established here, so `qualified` stays false and the production readiness list stays empty.

## Unresolved hosting choice (user-owned)
Where the runner lives is not decided in the project. VERCEL_DEPLOY.md lists a VM or container host (Fly.io, Railway, a small VPS) and that is paid, so no provisioning is done here. Options: (a) a small self-managed Linux VM running the runner in Docker with gVisor, (b) a container host, (c) keep the runner off for launch so practice stays "not open yet" while lessons and review ship.

## Closing measurements (commit 2fdaa12 and later)

Prerequisites on the machine that runs the judge: `bun` (runs the code-runner and `npm start`), `python3` and `g++`. `npm run build` also generates the server-only problem packs from `content-v5/problems-src` (all 78 raw problems with hidden tests ship in the source; the build fails if any test input is over the judge's stdin cap).

Memory limit wording (exact): the judge's memory limit is an ADDRESS-SPACE limit (`ulimit -v`, clamped to 64-1024 MB). It is not a resident-set (RSS) limit. A run that exceeds it is reported as `runtime_error`, not as a separate memory verdict. Measured here: a 500 MB allocation at a 128 MB limit gives `runtime_error` in Python and C++ and runs at 1024 MB. Concurrent load and process-limit behaviour are NOT measured.

Stdin cap: the judge rejects input over 4 MiB (4,194,304 bytes) instead of judging it. The largest stored test input is 3,976,118 bytes (bit-count); `scripts/build-v5-packs.cjs` fails the build on any input over the cap.

Timing: `content-v5/_build/limits.json` was regenerated for all 78 problems with Python 3.12.15 and conda-forge GCC 12.4.0 (`PYTHON_BIN`/`CXX_BIN`, `scripts/measure-v5-limits.cjs`): 78/78 reference solutions pass every stored test in both languages. Limits are still provisional host timings (max(2 s, 5 x worst)), not a production guarantee. Separately, the reference solutions were run through the actual runner on Python 3.10.12 / g++ 11.4 (below baseline): 156/156 runs pass. Neither run is an isolation or cheat-resistance claim.

## Local runner: memory, admission and known limits

- Memory requirement: the runner reserves each job's address-space limit (at least 512 MB for a compile) against 70% of the machine's RAM (1387 MB on the 1.9 GiB measuring host). Jobs that would not fit wait in the queue, so two 1024 MB jobs never run side by side on that host. A job bigger than the whole budget runs alone. Plan for roughly 2 GiB of RAM for the runner; less is not tested.
- Request body cap is 16 MiB. The largest real /submit body (all stored tests of one problem, matrix-rotate and running-median) is 7.3 MB raw, so the cap leaves over 2x headroom. At most 8 requests wait (8 x 16 MiB = 128 MiB worst case); more get 503.
- The 64 MiB per-job disk cap is a polling cap (25 ms). Measured overshoot is 80/88/96 MiB. It is not a strict hard 64 MiB.
- The memory limit is an address-space limit (ulimit -v), not RSS. A run over it is reported as `runtime_error`.
- Port: set `QF_RUNNER_PORT` (default 3010). The generic `PORT` variable is deliberately not used, because the web app has its own.
- Scope: Linux namespace isolation (bubblewrap) for local single-user use. It is not a hypervisor or gVisor boundary and not a shared multi-user guarantee. It needs unprivileged user namespaces. Python >= 3.12 and g++ >= 12.4 must be given with PYTHON_BIN and CXX_BIN, otherwise the web gate keeps practice closed with a reason.
- The admission memory budget uses `os.totalmem()`, which is the host RAM, not a cgroup or container limit. Running the runner inside a memory-limited container is therefore not supported or claimed: set the limit through host RAM, not a cgroup. Local single-user use only.
- Production list: `node scripts/populate-readiness.mjs` writes it from a qualification evidence file and refuses unless qualified=true with every reference run, none skipped, an active sandbox and all probes passing. At run time the route still refuses unless the runner reports an active sandbox on Python >= 3.12 and g++ >= 12.4.
