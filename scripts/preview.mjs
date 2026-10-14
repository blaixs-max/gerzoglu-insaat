import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import contact from '../api/contact.js';
import cms from '../api/cms.js';
import site from '../api/site.js';
import media from '../api/media.js';
import health from '../api/health.js';

// Loopback-only preview of the generated public output and contact API.
// POST /api/contact uses the real handler; SMTP must be deliberately configured.
// Rewritten media is streamed from its original URL, without replacing images.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'dist');
if (!(await stat(path.join(publicRoot, '.gerzoglu-generated')).catch(() => null))?.isFile()) {
  throw new Error('Run npm run build before npm run preview.');
}
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const port = Number(process.env.PREVIEW_PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const sourceMatches = (source, pathname) => source === pathname ||
  (source.endsWith('(.*)') && pathname.startsWith(source.slice(0, -4)));

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url, 'http://127.0.0.1').pathname;
    if (requestPath.startsWith('/api/admin/')) return await cms(req, res);
    if (requestPath === '/api/health') return await health(req, res);
    if (requestPath.startsWith('/media/')) return await media(req, res);
    if (requestPath === '/' || requestPath.startsWith('/proje/') ||
        ['projeler.html','kurumsal.html','iletisim.html','kentsel-donusum.html','cozum-ortaklarimiz.html','gizlilik.html','kvkk.html','kullanim-sartlari.html','sitemap.xml','llms.txt'].some(p => requestPath === '/' + p)) {
      const redirect = config.redirects?.find(rule => rule.source === requestPath);
      if (redirect) { res.writeHead(redirect.permanent ? 308 : 307, { Location: redirect.destination }); return res.end(); }
      return await site(req, res);
    }
    if (new URL(req.url, 'http://127.0.0.1').pathname === '/api/contact') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) { res.writeHead(413); res.end('Request too large'); return; } }
      try { req.body = body ? JSON.parse(body) : undefined; } catch (_) { res.writeHead(400); res.end('Invalid JSON'); return; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = data => res.end(JSON.stringify(data));
      await contact(req, res);
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Read-only preview');
    }
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname.includes('\0') || pathname.includes('\\') ||
        pathname.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const headers = {};
    for (const rule of config.headers || []) {
      if (sourceMatches(rule.source, pathname)) {
        for (const header of rule.headers) headers[header.key] = header.value;
      }
    }
    const redirect = config.redirects?.find(rule => rule.source === pathname);
    if (redirect) {
      res.writeHead(redirect.permanent ? 308 : 307, {
        ...headers, Location: redirect.destination + requestUrl.search,
      });
      return res.end();
    }
    const rewrite = config.rewrites?.find(rule => rule.source === pathname);
    if (rewrite && /^https?:\/\//.test(rewrite.destination)) {
      const upstream = await fetch(rewrite.destination, {
        method: req.method, signal: AbortSignal.timeout(30000),
      });
      for (const name of ['content-type', 'etag', 'last-modified']) {
        if (upstream.headers.has(name)) headers[name] = upstream.headers.get(name);
      }
      res.writeHead(upstream.status, headers);
      if (req.method === 'HEAD' || !upstream.body) return res.end();
      await pipeline(Readable.fromWeb(upstream.body), res);
      return;
    }
    let resolvedPath = path.resolve(publicRoot, '.' + (rewrite?.destination || pathname));
    if (!resolvedPath.startsWith(publicRoot + path.sep) && resolvedPath !== publicRoot) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    let details = await stat(resolvedPath).catch(() => null);
    if (details?.isDirectory()) {
      resolvedPath = path.join(resolvedPath, 'index.html');
      details = await stat(resolvedPath).catch(() => null);
    }
    if (!details?.isFile()) {
      const missingPage = await readFile(path.join(publicRoot, '404.html'));
      res.writeHead(404, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : missingPage);
    }
    res.writeHead(200, {
      ...headers,
      'Content-Type': mime[path.extname(resolvedPath)] || 'application/octet-stream',
      'Content-Length': details.size,
      // Each refresh shows current CSS/JS during design review.
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') return res.end();
    await pipeline(createReadStream(resolvedPath), res);
  } catch (error) {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    if (!res.writableEnded) res.end('Preview request failed');
    console.error(req.url, error.message);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
