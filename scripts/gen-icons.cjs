// Generate PWA icons from the SVG source
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const OUT = path.join(__dirname, '..', 'public', 'icons');

async function main() {
  const svg = fs.readFileSync(SRC);
  await sharp(svg, { density: 300 }).resize(192, 192).png().toFile(path.join(OUT, 'icon-192.png'));
  await sharp(svg, { density: 300 }).resize(512, 512).png().toFile(path.join(OUT, 'icon-512.png'));
  // maskable: pad the artwork onto a full-bleed background so the safe zone (central 80%) holds
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#0b0e14"/></svg>`);
  const art = await sharp(svg, { density: 300 }).resize(384, 384).png().toBuffer();
  await sharp(bg).composite([{ input: art, top: 64, left: 64 }]).png().toFile(path.join(OUT, 'maskable-512.png'));
  // favicon
  await sharp(svg, { density: 300 }).resize(64, 64).png().toFile(path.join(OUT, '..', 'favicon-64.png'));
  await sharp(svg, { density: 300 }).resize(32, 32).png().toFile(path.join(OUT, '..', 'favicon-32.png'));
  console.log('icons written:', fs.readdirSync(OUT));
}
main().catch(e => { console.error(e); process.exit(1); });
