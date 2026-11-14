#!/bin/sh
# builds /tmp/qfb/idb-store.js (window.QF5) for scripts/verify-v5-store.mjs; needs public/_blank.html (any html page)
set -e; mkdir -p /tmp/qfb
bun build src/lib/v5/idb-store.ts --format=esm --outfile=/tmp/qfb/idb-esm.js >/dev/null
python3 - <<'P'
s=open('/tmp/qfb/idb-esm.js').read(); i=s.index('\nexport {')
open('/tmp/qfb/idb-store.js','w').write('window.QF5=(()=>{'+s[:i]+'\nreturn {openV5Store};})();')
P
