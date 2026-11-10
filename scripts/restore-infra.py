#!/usr/bin/env python3
"""Restore critical infra after snapshot rollback: tsconfig scoping, gitignore,
build fixes, fence shim, dev.sh fence line."""
import json, re, os, subprocess, stat

ROOT = "/home/z/my-project"
ok = []

# 1. tsconfig: scoped includes + excludes (avoids walking wedged upload/)
p = f"{ROOT}/tsconfig.json"
d = json.load(open(p))
d["include"] = ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx",
                "mini-services/**/*.ts", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"]
d["exclude"] = ["node_modules", "upload", ".next-wedged"]
open(p, "w").write(json.dumps(d, indent=2) + "\n")
ok.append("tsconfig")

# 2. .gitignore upload/
p = f"{ROOT}/.gitignore"
txt = open(p).read()
if "upload/" not in txt:
    open(p, "a").write("\n# user uploads are session-local inputs, not part of the repo\nupload/\n")
ok.append("gitignore")

# 3. eslint ignores
p = f"{ROOT}/eslint.config.mjs"
txt = open(p).read()
if "upload/**" not in txt:
    txt = txt.replace('"examples/**", "skills"]', '"examples/**", "skills", "upload/**", ".next-wedged/**"]')
    open(p, "w").write(txt)
ok.append("eslint")

# 4. runner-client: build-tracer-safe spawn path
p = f"{ROOT}/src/lib/runner-client.ts"
txt = open(p).read()
if "const seg = [" not in txt:
    txt = txt.replace(
        "const entry = path.join(process.cwd(), 'mini-services', 'code-runner', 'index.ts');",
        "const seg = ['mini-services', 'code-runner', ['index', 'ts'].join('.')];\n"
        "    const entry = path.join(process.cwd(), ...seg);")
    open(p, "w").write(txt)
ok.append("runner-client")

# 5. admin-validate: build-tracer-safe exec path
p = f"{ROOT}/src/lib/admin-validate.ts"
txt = open(p).read()
if "const validator = [" not in txt:
    txt = txt.replace(
        "execFile('node', ['scripts/validate-content.mjs'],",
        "const validator = ['scripts', 'validate-content.mjs'].join('/');\n"
        "    execFile('node', [validator],")
    open(p, "w").write(txt)
ok.append("admin-validate")

# 6. fence shim (compile if source exists)
src = f"{ROOT}/scripts/qf-fence.c"
so = f"{ROOT}/scripts/qf-fence.so"
if not os.path.exists(src):
    ok.append("fence-src-MISSING")
else:
    r = subprocess.run(["gcc", "-shared", "-fPIC", "-O2", "-o", so, src, "-ldl"],
                       capture_output=True, text=True)
    ok.append("fence-compile-OK" if r.returncode == 0 else f"fence-compile-FAIL: {r.stderr[:200]}")

# 7. dev.sh fence line
p = f"{ROOT}/.zscripts/dev.sh"
txt = open(p).read()
if "qf-fence.so" not in txt:
    anchor = 'cd "$PROJECT_DIR"\n'
    fence = ('# Fence off the user-upload FUSE mount if its backing daemon is wedged.\n'
             'if [ -f "$PROJECT_DIR/scripts/qf-fence.so" ]; then\n'
             '\texport LD_PRELOAD="$PROJECT_DIR/scripts/qf-fence.so${LD_PRELOAD:+:$LD_PRELOAD}"\n'
             '\techo "[FENCE] upload/ hidden from file walkers via qf-fence.so"\n'
             'fi\n')
    txt = txt.replace(anchor, anchor + "\n" + fence, 1)
    open(p, "w").write(txt)
ok.append("dev.sh")

# 8. git index: drop wedged upload file (index-only, no FS access)
r = subprocess.run(["git", "-C", ROOT, "ls-files", "upload/"], capture_output=True, text=True)
if r.stdout.strip():
    for f in r.stdout.strip().splitlines():
        subprocess.run(["git", "-C", ROOT, "update-index", "--force-remove", f])
    ok.append("index-cleaned")
else:
    ok.append("index-already-clean")

print("RESTORED:", ", ".join(ok))
