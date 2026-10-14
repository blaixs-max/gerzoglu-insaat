'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { CmsError, randomUUID, normalizeDocument, mediaIds } = require('./cms-model.cjs');
const seed = require('../data/projects.json');
const ROOT = path.resolve(__dirname, '..');
const copy = value => JSON.parse(JSON.stringify(value));
const iso = () => new Date().toISOString();
const loopback = value => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(value);
function isLocal(req) {
  const host = String(req?.headers?.host || '').replace(/:\d+$/, '');
  return process.env.CMS_LOCAL_PREVIEW === '1' && !process.env.VERCEL && ['127.0.0.1', 'localhost'].includes(host) && loopback(req?.socket?.remoteAddress);
}
function settings() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    secret: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
function dbError(error) {
  if (!error) return;
  if (error.code === '40001' || error.message === 'CMS_STALE_VERSION') throw new CmsError(409, 'VERSION_CONFLICT', 'Bu proje başka bir işlemde değişti. Güncel kaydı yeniden yükleyin.');
  if (error.code === '42501') throw new CmsError(403, 'NOT_AUTHORIZED', 'Bu işlem için yönetici yetkiniz yok.');
  if (error.code === 'P0002') throw new CmsError(404, 'NOT_FOUND', 'Kayıt bulunamadı.');
  if (error.code === '23505') throw new CmsError(422, 'SLUG_EXISTS', 'Bu proje bağlantısı zaten kullanılıyor.');
  if (error.code === '22023') throw new CmsError(422, 'VALIDATION', error.message === 'CMS_MEDIA_NOT_READY' ? 'Görselin işlenmesini bekleyin.' : 'Proje bilgilerini ve görselleri kontrol edin.');
  throw new CmsError(503, 'UNAVAILABLE', 'Veritabanına şu anda ulaşılamıyor. Kaydınız değiştirilmedi.');
}
class CloudStore {
  constructor(config, token) {
    const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    this.local = false;
    this.public = createClient(config.url, config.key, opts);
    this.client = createClient(config.url, config.key, { ...opts, global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined });
    this.service = config.secret ? createClient(config.url, config.secret, opts) : null;
  }
  async authorize(token) {
    if (!token) throw new CmsError(401, 'UNAUTHENTICATED', 'Yönetici hesabınızla giriş yapın.');
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) throw new CmsError(401, 'UNAUTHENTICATED', 'Oturumunuz sona erdi. Tekrar giriş yapın.');
    const membership = await this.client.from('cms_admins').select('active').eq('user_id', data.user.id).maybeSingle();
    dbError(membership.error);
    if (!membership.data?.active) throw new CmsError(403, 'NOT_AUTHORIZED', 'Bu hesap yönetici olarak yetkilendirilmemiş.');
    return { id: data.user.id, email: data.user.email };
  }
  async publicCatalog() { const r = await this.public.from('cms_public_projects').select('document'); dbError(r.error); return r.data.map(row => row.document); }
  async list() { const r = await this.client.from('cms_projects').select('*').order('created_at'); dbError(r.error); return r.data; }
  async listSlugs() {
    const slugs = [], pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const r = await this.client.from('cms_projects').select('slug').order('slug').range(offset, offset + pageSize - 1);
      dbError(r.error); slugs.push(...r.data.map(row => row.slug));
      if (r.data.length < pageSize) return slugs;
    }
  }
  async getRow(id) { const r = await this.client.from('cms_projects').select('*').eq('id', id).maybeSingle(); dbError(r.error); if (!r.data) throw new CmsError(404, 'NOT_FOUND', 'Proje bulunamadı.'); return r.data; }
  async history(id) { const r = await this.client.from('cms_revisions').select('id,created_at,created_by,document').eq('project_id', id).order('created_at', { ascending: false }); dbError(r.error); return r.data.map(x => ({ id: x.id, createdAt: x.created_at, createdBy: x.created_by, document: x.document })); }
  async rpc(name, args) { const r = await this.client.rpc(name, args); dbError(r.error); return r.data; }
  async getMedia(id) { if (!this.service) throw new CmsError(503, 'UNAVAILABLE', 'Görsel servisi yapılandırılmamış.'); const r = await this.service.from('cms_media').select('*').eq('id', id).maybeSingle(); dbError(r.error); return r.data; }
  async createMedia(row) { if (!this.service) throw new CmsError(503, 'UNAVAILABLE', 'Görsel servisi yapılandırılmamış.'); const r = await this.service.from('cms_media').insert(row).select().single(); dbError(r.error); return r.data; }
  async claimMedia(id) {
    if (!this.service) throw new CmsError(503, 'UNAVAILABLE', 'Görsel servisi yapılandırılmamış.');
    const r = await this.service.from('cms_media').update({status:'processing',updated_at:iso()}).eq('id',id).in('status',['pending','failed']).select('*').maybeSingle();
    dbError(r.error); return r.data;
  }
  async updateMedia(id, patch) { const r = await this.service.from('cms_media').update(patch).eq('id', id).select().single(); dbError(r.error); return r.data; }
}
let queue = Promise.resolve();
class LocalStore {
  constructor(directory) { this.local = true; this.localDir = directory; this.file = path.join(directory, 'cms-local.json'); }
  async data() {
    try { return JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; return { rows: seed.map(document => ({ id: randomUUID(), slug: document.slug, version: 1, publication_state: 'published', draft: copy(document), published: copy(document), created_at: iso(), updated_at: iso(), published_at: iso() })), media: {}, history: {} }; }
  }
  async transaction(operation) {
    const task = queue.then(async () => { const data = await this.data(); const result = await operation(data); await fs.mkdir(this.localDir, { recursive: true }); const temporary = this.file + '.tmp'; await fs.writeFile(temporary, JSON.stringify(data)); await fs.rename(temporary, this.file); return copy(result); });
    queue = task.catch(() => {}); return task;
  }
  async authorize() { await this.transaction(() => null); return { id: '00000000-0000-4000-8000-000000000001', email: 'yerel-onizleme@localhost' }; }
  async list() { await this.transaction(() => null); return (await this.data()).rows; }
  async listSlugs() { return (await this.list()).map(row => row.slug); }
  async getRow(id) { const row = (await this.data()).rows.find(r => r.id === id); if (!row) throw new CmsError(404, 'NOT_FOUND', 'Proje bulunamadı.'); return row; }
  async publicCatalog() { return (await this.list()).filter(r => r.publication_state === 'published').map(r => r.published); }
  async history(id) { return (await this.data()).history[id] || []; }
  async getMedia(id) { return (await this.data()).media[id] || null; }
  async createMedia(row) { return this.transaction(data => (data.media[row.id] = row)); }
  async claimMedia(id) { return this.transaction(data => { const row=data.media[id]; if(!row) throw new CmsError(404,'NOT_FOUND','Görsel bulunamadı.'); if(!['pending','failed'].includes(row.status)) return null; row.status='processing'; row.updated_at=iso(); return row; }); }
  async updateMedia(id, patch) { return this.transaction(data => { if (!data.media[id]) throw new CmsError(404, 'NOT_FOUND', 'Görsel bulunamadı.'); return Object.assign(data.media[id], patch); }); }
  async rpc(name, args) {
    return this.transaction(data => {
      const get = (id, expected) => { const row = data.rows.find(r => r.id === id); if (!row) throw new CmsError(404, 'NOT_FOUND', 'Proje bulunamadı.'); if (row.version !== expected) throw new CmsError(409, 'VERSION_CONFLICT', 'Kayıt değişti; yeniden yükleyin.'); return row; };
      const revise = row => { (data.history[row.id] ||= []).unshift({ id: randomUUID(), createdAt: iso(), createdBy: 'Yerel önizleme', document: copy(row.published) }); };
      const touch = row => { row.version++; row.updated_at = iso(); return row; };
      if (name === 'cms_create_project') {
        const doc = args.p_document;
        if (data.rows.some(r => r.slug === doc.slug)) throw new CmsError(422, 'SLUG_EXISTS', 'Bu bağlantı kullanılıyor.');
        const row = { id: randomUUID(), slug: doc.slug, version: 1, publication_state: 'draft', draft: doc, published: null, created_at: iso(), updated_at: iso(), published_at: null }; data.rows.push(row); return row;
      }
      if (name === 'cms_reorder_projects') {
        if (new Set(args.p_ids).size !== args.p_ids.length) throw new CmsError(422, 'VALIDATION', 'Sıralama geçersiz.');
        const rows = args.p_ids.map(id => get(id, args.p_expected_versions[id]));
        rows.forEach((row, index) => { row.draft.listOrder = index + 1; if (row.publication_state === 'published') { row.published.listOrder = index + 1; revise(row); } touch(row); }); return rows;
      }
      const row = get(args.p_id, args.p_expected_version);
      if (name === 'cms_save_project') row.draft = args.p_document;
      else if (name === 'cms_publish_project') {
        const doc = normalizeDocument(row.draft, { publish: true, allowPlaceholder: !!row.published && !row.published.cover, slug: row.slug });
        for (const id of mediaIds(doc)) { const media = data.media[id]; if (!media || media.project_id !== row.id || media.status !== 'ready') throw new CmsError(422, 'MEDIA_NOT_READY', 'Görsel hazır değil.'); const images = [doc.cover, ...doc.gallery, ...doc.interiors].filter(x => x?.id === id); if (images.some(x => ['src','srcset','width','height'].some(key => x[key] !== media.image[key]))) throw new CmsError(422, 'VALIDATION', 'Görsel bilgisi geçersiz.'); media.published_at ||= iso(); }
        row.published = copy(doc); row.publication_state = 'published'; row.published_at = iso(); revise(row);
      } else if (name === 'cms_archive_project') row.publication_state = 'archived';
      else if (name === 'cms_restore_project') { if (row.publication_state !== 'archived') throw new CmsError(422,'VALIDATION','Proje arşivde değil.'); row.publication_state = 'draft'; }
      else if (name === 'cms_discard_draft') { if (!row.published) throw new CmsError(422,'VALIDATION','Yayınlanmış sürüm yok.'); row.draft = copy(row.published); }
      else if (name === 'cms_restore_revision') { const revision = data.history[row.id]?.find(r => r.id === args.p_revision_id); if (!revision) throw new CmsError(404,'NOT_FOUND','Sürüm bulunamadı.'); row.draft = copy(revision.document); }
      else throw new Error('Unknown local operation');
      return touch(row);
    });
  }
}
async function getStore(req, { optional = false } = {}) {
  if (isLocal(req)) return new LocalStore(path.join(ROOT, '.cache'));
  const config = settings();
  if (!config.url || !config.key) { if (optional && !process.env.VERCEL) return null; throw new CmsError(503, 'NOT_CONFIGURED', 'Proje yönetim bağlantısı henüz yapılandırılmamış.'); }
  const token = /^Bearer ([^\s]+)$/.exec(req?.headers?.authorization || '')?.[1];
  return new CloudStore(config, token);
}
module.exports = { getStore, settings, isLocal, LocalStore, CloudStore, dbError };
