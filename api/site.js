'use strict';
const { getStore } = require('../lib/cms-store.cjs');
const { renderPage } = require('../lib/cms-render.cjs');
const seed = require('../data/projects.json');
module.exports = async function site(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  if (!['GET','HEAD'].includes(req.method)) { res.statusCode=405; res.setHeader('Allow','GET, HEAD'); return res.end(); }
  try {
    const url = new URL(req.url,'http://localhost');
    const pathname = url.searchParams.get('__path') || url.pathname;
    const store = await getStore(req,{optional:true});
    const catalog = store ? await store.publicCatalog() : seed;
    const page = renderPage(pathname,catalog);
    if (!page) { res.statusCode=404; return res.end('Sayfa bulunamadı.'); }
    res.statusCode=page.status; res.setHeader('Content-Type',page.contentType);
    return res.end(req.method==='HEAD'?undefined:page.body);
  } catch {
    // Never substitute old content after an archive or a successful CMS update.
    res.statusCode=503; res.setHeader('Retry-After','30'); res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Geçici erişim sorunu</title><body><h1>İçerik şu anda yüklenemiyor.</h1><p>Lütfen kısa süre sonra tekrar deneyin.</p></body></html>');
  }
};
