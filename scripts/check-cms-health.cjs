'use strict';
const { setTimeout: wait } = require('node:timers/promises');

class HealthCheckError extends Error {
  constructor(code, retryable = false) { super(code); this.code = code; this.retryable = retryable; }
}

function publicKey(key) {
  if (typeof key !== 'string') return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return true;
  // Legacy anon keys are JWTs. Do not accidentally put a privileged JWT in repo variables.
  try {
    const pieces = key.split('.');
    return pieces.length === 3 && JSON.parse(Buffer.from(pieces[1], 'base64url').toString()).role === 'anon';
  } catch (_) { return false; }
}

function httpsUrl(value) {
  let url;
  try { url = new URL(value); } catch (_) { throw new HealthCheckError('HEALTH_CONFIGURATION_INVALID'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new HealthCheckError('HEALTH_CONFIGURATION_INVALID');
  }
  return url;
}

function configuration(env) {
  const headers = { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' };
  if (env.CMS_HEALTH_URL) {
    const url = httpsUrl(env.CMS_HEALTH_URL);
    const secret = env.CMS_HEALTH_SECRET || env.CRON_SECRET;
    if (typeof secret !== 'string' || secret.length < 16) throw new HealthCheckError('HEALTH_SECRET_REQUIRED');
    return { url, headers: { ...headers, Authorization: `Bearer ${secret}` }, source: 'website' };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new HealthCheckError('HEALTH_CONFIGURATION_REQUIRED');
  const url = httpsUrl(env.SUPABASE_URL);
  if (url.pathname !== '/' || !publicKey(env.SUPABASE_PUBLISHABLE_KEY)) throw new HealthCheckError('HEALTH_PUBLIC_KEY_REQUIRED');
  url.pathname = '/rest/v1/cms_public_projects';
  url.search = 'select=id&limit=1';
  // apikey works with modern publishable keys and legacy anon JWT keys. No service/admin key.
  return { url, headers: { ...headers, apikey: env.SUPABASE_PUBLISHABLE_KEY }, source: 'supabase-rest' };
}

async function runHealthCheck(options = {}) {
  const config = configuration(options.env || process.env);
  const fetchImpl = options.fetch || globalThis.fetch;
  const sleep = options.wait || wait;
  const started = Date.now();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchImpl(config.url, {
        method: 'GET', headers: config.headers,
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new HealthCheckError(`HEALTH_HTTP_${response.status}`, response.status >= 500 || [408, 429].includes(response.status));
      }
      let data;
      try { data = await response.json(); }
      catch (_) { throw new HealthCheckError('HEALTH_INVALID_JSON'); }
      if (config.source === 'supabase-rest' ? !Array.isArray(data) : data?.ok !== true || data?.mode !== 'cloud' || data?.database !== 'ok') {
        throw new HealthCheckError('HEALTH_INVALID_RESPONSE');
      }
      return { ok: true, source: config.source, attempts: attempt, elapsedMs: Date.now() - started };
    } catch (error) {
      // Network failure and timeout may recover; configuration, access and invalid body errors do not.
      const failure = error instanceof HealthCheckError ? error : new HealthCheckError('HEALTH_NETWORK_FAILED', true);
      if (!failure.retryable || attempt === 3) throw failure;
      await sleep(attempt * 1000);
    }
  }
}

if (require.main === module) {
  runHealthCheck().then(result => {
    console.log(`[cms-health] OK (${result.source}, ${result.elapsedMs}ms, attempt ${result.attempts}).`);
  }).catch(error => {
    // Never print response bodies, URLs, request headers, keys or the raw network exception.
    console.error(`[cms-health] FAILED: ${error.code || 'HEALTH_CHECK_FAILED'}.`);
    process.exitCode = 1;
  });
}

module.exports = { runHealthCheck, configuration, HealthCheckError };
