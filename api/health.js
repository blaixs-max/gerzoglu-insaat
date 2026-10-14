'use strict';
const { createHash, timingSafeEqual } = require('node:crypto');
const { getStore } = require('../lib/cms-store.cjs');

function sameSecret(received, expected) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

function createHealthHandler(options = {}) {
  const resolveStore = options.getStore || getStore;
  const environment = options.environment || (() => process.env);
  const logger = options.logger || console;
  const timeoutMs = options.timeoutMs || 10000;
  return async function health(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, body) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return reply(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
    }
    const env = environment();
    const secret = env.CMS_HEALTH_SECRET || env.CRON_SECRET;
    // Refuse missing/weak configuration instead of treating "Bearer undefined" as valid.
    if (typeof secret !== 'string' || secret.length < 16) {
      return reply(503, { ok: false, code: 'HEALTH_NOT_CONFIGURED' });
    }
    const header = req.headers?.authorization;
    if (typeof header !== 'string' || header.length > 8192 || !sameSecret(header, `Bearer ${secret}`)) {
      return reply(401, { ok: false, code: 'UNAUTHORIZED' });
    }
    let timer;
    try {
      const store = await resolveStore(req);
      // A local fixture or filesystem fallback must never report a healthy cloud database.
      if (!store || store.local !== false) return reply(503, { ok: false, code: 'CLOUD_DATABASE_REQUIRED' });
      const documents = await Promise.race([
        store.publicCatalog(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('CMS_HEALTH_TIMEOUT')), timeoutMs);
        }),
      ]);
      if (!Array.isArray(documents)) throw new Error('CMS_HEALTH_BAD_RESPONSE');
      return reply(200, {
        ok: true,
        mode: 'cloud',
        database: 'ok',
        projectCount: documents.length,
        checkedAt: new Date().toISOString(),
      });
    } catch (_) {
      logger.error('[cms-health] Cloud database check failed.');
      return reply(503, { ok: false, code: 'DATABASE_UNAVAILABLE' });
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

module.exports = createHealthHandler();
module.exports.createHealthHandler = createHealthHandler;
