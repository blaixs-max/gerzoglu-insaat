'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.resolve(root, 'dist');
const marker = path.join(output, '.gerzoglu-generated');
// Delete only a verified, previously generated output directory.
if (path.relative(root, output) !== 'dist') throw new Error('Invalid output directory');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink() || !fs.existsSync(marker)) throw new Error('Output directory is not a generated build');
  fs.rmSync(output, { recursive: true, force: true });
}
fs.mkdirSync(output);
fs.writeFileSync(marker, 'Gerzoglu static build output\n');
for (const file of fs.readdirSync(root)) {
  if (/\.html$/.test(file) || ['robots.txt', 'sitemap.xml', 'llms.txt'].includes(file)) fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
fs.mkdirSync(path.join(output, 'proje'));
for (const file of fs.readdirSync(path.join(root, 'proje'))) {
  if (/\.html$/.test(file)) fs.copyFileSync(path.join(root, 'proje', file), path.join(output, 'proje', file));
}
console.log('Public pages and assets prepared; server source stays outside the public directory.');
