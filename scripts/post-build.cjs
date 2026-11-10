#!/usr/bin/env node
/**
 * Post-build step: when `output: "standalone"` is produced (local / Docker builds),
 * copy static assets and public files into the standalone bundle so `node server.js`
 * works. On Vercel, `output: "standalone"` is ignored and .next/standalone does not
 * exist — in that case this is a no-op so the build succeeds.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.log('[post-build] .next/standalone not found (hosted build, e.g. Vercel) — nothing to do.');
  process.exit(0);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(standalone, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyDir(staticSrc, staticDest);
  console.log('[post-build] copied .next/static -> .next/standalone/.next/static');
}

const publicSrc = path.join(root, 'public');
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(standalone, 'public'));
  console.log('[post-build] copied public -> .next/standalone/public');
}

// Content JSONs are needed at runtime by src/lib/content.ts (fs reads).
const contentSrc = path.join(root, 'content');
if (fs.existsSync(contentSrc)) {
  copyDir(contentSrc, path.join(standalone, 'content'));
  console.log('[post-build] copied content -> .next/standalone/content');
}
