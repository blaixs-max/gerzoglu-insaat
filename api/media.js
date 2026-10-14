'use strict';
const { readVariant } = require('../lib/cms-media.cjs');

module.exports = async function mediaHandler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end('Method not allowed');
  }
  try {
    const url = new URL(req.url, 'http://cms.local');
    const match = url.pathname.match(/^\/media\/([a-f0-9-]{36})\/([1-9]\d{0,4})\.webp$/i);
    const id = match?.[1] || req.query?.id || url.searchParams.get('id');
    const file = req.query?.file || url.searchParams.get('file');
    const width = match?.[2] || req.query?.width || url.searchParams.get('width') || (typeof file === 'string' && file.match(/^([1-9]\d{0,4})\.webp$/)?.[1]);
    if (typeof id !== 'string' || !width || Array.isArray(width)) { res.statusCode = 404; return res.end('Not found'); }
    const { getStore } = require('../lib/cms-store.cjs');
    const store = await getStore(req);
    // No query string or supplied token can relax the public publication gate.
    const media = await readVariant(store, id, width);
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', media.etag);
    if (req.headers['if-none-match'] === media.etag) { res.statusCode = 304; return res.end(); }
    res.setHeader('Content-Length', media.buffer.length);
    res.statusCode = 200;
    return res.end(req.method === 'HEAD' ? undefined : media.buffer);
  } catch (error) {
    res.statusCode = error.status === 404 ? 404 : 503;
    return res.end(res.statusCode === 404 ? 'Not found' : 'Media temporarily unavailable');
  }
};
