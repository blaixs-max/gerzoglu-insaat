import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Read-only: verifies public build output without submitting a form or an email.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const base = new URL(process.argv[2] || 'https://gerzoglu.com/');
if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Expected an HTTP(S) base URL.');
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const files = [];
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), relative + '/');
    else if (entry.isFile()) files.push(relative);
  }
}
await collect(output);
if (!files.includes('index.html') || !files.includes('404.html')) {
  throw new Error('Missing public build pages. Run npm run build before verifying.');
}
const hash = data => createHash('sha256').update(data).digest('hex');
function normalize(data, file) {
  return /\.(?:html|css|js|svg|txt|xml)$/.test(file)
    ? Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n')) : data;
}
let index = 0;
const results = [];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (index < files.length) {
    const file = files[index++];
    const pathname = file === 'index.html' ? '/' : file === '404.html'
      ? '/__gerzoglu_verification_missing_page__' : '/' + file;
    try {
      const response = await fetch(new URL(pathname, base), {
        redirect: 'manual', signal: AbortSignal.timeout(30000),
      });
      const redirect = config.redirects?.find(rule => rule.source === pathname);
      if (redirect) {
        const location = response.headers.get('location');
        results.push({ file, status: response.status,
          match: [307, 308].includes(response.status) &&
            new URL(location || '/', base).pathname === redirect.destination });
        await response.body?.cancel();
        continue;
      }
      const expected = normalize(await readFile(path.join(output, file)), file);
      const actual = normalize(Buffer.from(await response.arrayBuffer()), file);
      const expectedStatus = file === '404.html' ? 404 : 200;
      results.push({ file, status: response.status,
        match: response.status === expectedStatus && hash(expected) === hash(actual) });
    } catch (error) {
      results.push({ file, match: false, error: error.message });
    }
  }
}));
const failures = results.filter(result => !result.match).sort((a, b) => a.file.localeCompare(b.file));
console.log(JSON.stringify({ base: base.origin, checked: results.length,
  matched: results.length - failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
