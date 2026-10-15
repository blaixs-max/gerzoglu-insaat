'use strict';
const { getStore, settings, isLocal } = require('../lib/cms-store.cjs');
const { CmsError, normalizeDocument, adminProject } = require('../lib/cms-model.cjs');
const { createProject } = require('../lib/cms-projects.cjs');
const media = require('../lib/cms-media.cjs');
const { renderPage } = require('../lib/cms-render.cjs');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function send(res, status, body) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
async function body(req, limit = 524288, raw = false) {
  if (req.body !== undefined) {
    if (raw) { const b = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body); if (b.length > limit) throw new CmsError(413,'TOO_LARGE','Dosya çok büyük.'); return b; }
    const b = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(b) > limit) throw new CmsError(413,'TOO_LARGE','İstek çok büyük.');
    try { const value = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(b); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Object required'); return value; } catch { throw new CmsError(400,'INVALID_JSON','İstek okunamadı. JSON nesnesi gönderin.'); }
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new CmsError(413,'TOO_LARGE','İstek çok büyük.'); chunks.push(chunk); }
  const b = Buffer.concat(chunks);
  if (raw) return b;
  try { const value = b.length ? JSON.parse(b.toString('utf8')) : {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Object required'); return value; } catch { throw new CmsError(400,'INVALID_JSON','İstek okunamadı. JSON nesnesi gönderin.'); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  try { if (new URL(origin).host === req.headers.host) return; } catch {}
  throw new CmsError(403,'ORIGIN_DENIED','Bu kaynaktan işlem yapılamaz.');
}
function version(value) { if (!Number.isInteger(value) || value < 1) throw new CmsError(422,'VALIDATION','Güncel kayıt sürümü gerekli.'); return value; }
async function responseProject(store, row) { const project = adminProject(row); project.draft = await media.decorateDraftImages(store, project.draft); return project; }
module.exports = async function cms(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag','noindex, nofollow');
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = url.searchParams.has('__adminPath') ? '/api/admin/' + url.searchParams.get('__adminPath') : url.pathname.replace(/^\/api\/cms\/?/, '/api/admin/');
    if (route === '/api/admin/config' && req.method === 'GET') {
      const cfg = settings(), localPreview = isLocal(req);
      return send(res, 200, { configured: localPreview || !!(cfg.url && cfg.key), url: cfg.url || '', publishableKey: cfg.key || '', localPreview, recoveryAvailable: process.env.CMS_RECOVERY_ENABLED === '1' });
    }
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    const store = await getStore(req);
    const user = await store.authorize(token);
    if (!['GET','HEAD'].includes(req.method)) sameOrigin(req);
    if (route === '/api/admin/session' && req.method === 'GET') return send(res,200,{ user, isAdmin:true });
    if (route === '/api/admin/projects') {
      if (req.method === 'GET') return send(res,200,{ projects: await Promise.all((await store.list()).map(r => responseProject(store,r))) });
      if (req.method === 'POST') { const input = await body(req); const row = await createProject(store,input.draft); return send(res,201,{project:await responseProject(store,row)}); }
    }
    if (route === '/api/admin/projects/order' && req.method === 'POST') {
      const input = await body(req);
      if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 500 || input.ids.some(id => !UUID.test(id))) throw new CmsError(422,'VALIDATION','Proje sıralaması geçersiz.');
      const current = await store.list();
      const versions = input.expectedVersions || Object.fromEntries(current.map(r => [r.id,r.version]));
      const rows = await store.rpc('cms_reorder_projects',{p_ids:input.ids,p_expected_versions:versions});
      return send(res,200,{projects:await Promise.all(rows.map(r => responseProject(store,r)))});
    }
    let match = /^\/api\/admin\/projects\/([a-f0-9-]{36})(?:\/(publish|archive|restore|discard|restore-revision|preview))?$/.exec(route);
    if (match && UUID.test(match[1])) {
      const [,id,action] = match;
      const row = await store.getRow(id);
      if (!action && req.method === 'GET') return send(res,200,{project:await responseProject(store,row),history:await store.history(id)});
      if (action === 'preview' && req.method === 'GET') {
        const preview = await media.decorateDraftImages(store,row.draft);
        const catalog = await store.publicCatalog();
        const page = renderPage('/proje/'+row.slug+'.html',catalog,{previewDocument:preview});
        res.statusCode = 200; res.setHeader('Content-Type',page.contentType); return res.end(page.body.replace('<head>','<head><base href="/">'));
      }
      if (!action && req.method === 'PUT') {
        const input = await body(req);
        const doc = normalizeDocument(input.draft,{slug:row.slug,allowPlaceholder:!!row.published && !row.published.cover});
        const saved = await store.rpc('cms_save_project',{p_id:id,p_expected_version:version(input.expectedVersion),p_document:doc});
        return send(res,200,{project:await responseProject(store,saved)});
      }
      if (!action && req.method === 'DELETE') {
        const input = await body(req);
        const expectedVersion = version(input.expectedVersion);
        if (row.version !== expectedVersion) throw new CmsError(409,'VERSION_CONFLICT','Bu proje başka bir işlemde değişti. Güncel kaydı yeniden yükleyin.');
        if (row.publication_state !== 'archived') throw new CmsError(409,'ARCHIVE_REQUIRED','Yalnızca arşivdeki projeler silinebilir. Önce projeyi arşivleyin.');
        if (typeof input.confirmationName !== 'string' || !input.confirmationName.trim() || input.confirmationName.trim() !== row.draft.name?.trim()) throw new CmsError(422,'CONFIRMATION_MISMATCH','Silmek için proje adını eksiksiz ve aynı şekilde yazın.');
        const result = await store.rpc('cms_delete_project',{p_id:id,p_expected_version:expectedVersion,p_confirmation_name:input.confirmationName.trim()});
        return send(res,200,result);
      }
      if (action && req.method === 'POST') {
        if (action === 'preview') { res.setHeader('Allow','GET'); throw new CmsError(405,'METHOD_NOT_ALLOWED','Önizleme için GET kullanın.'); }
        const input = await body(req);
        if (action === 'publish') normalizeDocument(row.draft,{publish:true,slug:row.slug,allowPlaceholder:!!row.published && !row.published.cover});
        const names = {publish:'cms_publish_project',archive:'cms_archive_project',restore:'cms_restore_project',discard:'cms_discard_draft','restore-revision':'cms_restore_revision'};
        const args = {p_id:id,p_expected_version:version(input.expectedVersion)};
        if (action === 'restore-revision') { if (!UUID.test(input.revisionId || '')) throw new CmsError(422,'VALIDATION','Geçmiş sürümü seçin.'); args.p_revision_id = input.revisionId; }
        const saved = await store.rpc(names[action],args); return send(res,200,{project:await responseProject(store,saved)});
      }
      res.setHeader('Allow',!action?'GET, PUT, DELETE':action==='preview'?'GET':'POST');
      throw new CmsError(405,'METHOD_NOT_ALLOWED','Bu işlem için uygun istek yöntemini kullanın.');
    }
    if (route === '/api/admin/media/sign' && req.method === 'POST') return send(res,200,await media.signMedia(store,await body(req),user));
    match = /^\/api\/admin\/media\/([a-f0-9-]{36})\/(finalize|upload|preview)$/.exec(route);
    if (match && UUID.test(match[1])) {
      const [,id,action] = match;
      if (action === 'finalize' && req.method === 'POST') return send(res,200,{media:await media.finalizeMedia(store,id,user)});
      if (action === 'upload' && req.method === 'PUT' && store.local) return send(res,200,await media.acceptLocalUpload(store,id,await body(req,media.MAX_UPLOAD_BYTES,true),req.headers['content-type']));
      if (action === 'preview' && req.method === 'GET' && store.local) { const image = await media.getMediaPreview(store,id,Number(url.searchParams.get('width'))); res.setHeader('Content-Type',image.contentType); return res.end(image.buffer); }
    }
    throw new CmsError(404,'NOT_FOUND','İşlem bulunamadı.');
  } catch (error) {
    const known = error instanceof CmsError;
    send(res,known?error.status:500,{error:{code:known?error.code:'SERVER_ERROR',message:known?error.message:'İşlem tamamlanamadı. Lütfen tekrar deneyin.',...(known&&error.fields?{fields:error.fields}:{})}});
  }
};
module.exports.body = body;
