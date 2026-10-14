'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.resolve(root, 'dist');
const marker = path.join(output, '.gerzoglu-generated');
// Bundle the pinned browser Auth/Storage client; no third-party script CDN.
require('esbuild').buildSync({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: root },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
  outfile: path.join(root, 'assets/vendor/supabase.mjs'),
});
// Delete only a verified, previously generated output directory.
if (path.relative(root, output) !== 'dist') throw new Error('Invalid output directory');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink()) throw new Error('Output directory cannot be a symbolic link');
  const disposable = fs.existsSync(marker) || fs.readdirSync(output).length === 0 || process.env.VERCEL === '1';
  if (!disposable) throw new Error('Output directory is not a generated build');
  fs.rmSync(output, { recursive: true, force: true });
}
fs.mkdirSync(output);
fs.writeFileSync(marker, 'Gerzoglu static build output\n');
for (const file of fs.readdirSync(root)) {
  // Vercel resolves physical files before fallback rewrites. Managed HTML and
  // discovery pages live exclusively in the CMS function, including old URLs.
  if (['admin.html', '404.html', 'robots.txt'].includes(file)) fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Public admin/assets prepared; managed pages resolve through the CMS function.');
