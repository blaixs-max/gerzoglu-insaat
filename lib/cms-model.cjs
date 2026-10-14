'use strict';
const { randomUUID } = require('node:crypto');
const STATUSES = ['teslim', 'devam', 'planlanan', 'satista'];
class CmsError extends Error {
  constructor(status, code, message, fields) { super(message); Object.assign(this, { status, code, fields }); }
}
const fail = (message, fields) => { throw new CmsError(422, 'VALIDATION', message, fields); };
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function slugify(value) {
  return text(value, 200).toLocaleLowerCase('tr').replaceAll('ı', 'i').replaceAll('ğ', 'g')
    .replaceAll('ü', 'u').replaceAll('ş', 's').replaceAll('ö', 'o').replaceAll('ç', 'c')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}
function numeric(value, name, { nullable = true, integer = false, min = 0, max = 1e9 } = {}) {
  if (value === '' || value === null || value === undefined) return nullable ? null : min;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) fail('Sayısal alanı kontrol edin.', { [name]: 'Geçerli bir değer girin.' });
  return n;
}
function date(value, name) {
  const result = { value: text(value?.value, 10), estimated: value?.estimated === true };
  if (!result.value) return result;
  if (!/^(19|20|21)\d{2}(?:-\d{2}-\d{2})?$/.test(result.value)) fail('Tarih yıl veya gün/ay/yıl olarak girilmelidir.', { [name]: 'Örnek: 2026 veya 2026-10-14' });
  if (result.value.length === 10) {
    const d = new Date(result.value + 'T00:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== result.value) fail('Tarih geçersiz.', { [name]: 'Gerçek bir takvim tarihi girin.' });
  }
  return result;
}
function safeUrl(value) {
  const url = text(value, 2048);
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !/[\u0000-\u0020]/.test(url)) return url;
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href; } catch (_) {}
  fail('Görsel adresi geçersiz.');
}
function image(value) {
  if (!value || typeof value !== 'object') return null;
  const src = safeUrl(value.src);
  if (!src) return null;
  const id = value.id || null;
  if (id && !/^[a-f0-9-]{36}$/i.test(id)) fail('Görsel kimliği geçersiz.');
  const srcset = text(value.srcset, 8000);
  if (srcset) for (const part of srcset.split(',')) {
    const match = part.trim().match(/^(\S+)\s+([1-9]\d{0,4})w$/);
    if (!match) fail('Görsel boyut bilgisi geçersiz.');
    safeUrl(match[1]);
  }
  return { id, src, srcset, width: numeric(value.width, 'image.width', { integer: true, min: 0, max: 30000 }) || 0,
    height: numeric(value.height, 'image.height', { integer: true, min: 0, max: 30000 }) || 0,
    alt: text(value.alt, 400), caption: text(value.caption, 400), label: text(value.label, 200),
    kind: ['exterior', 'interior', 'plan', 'other'].includes(value.kind) ? value.kind : 'exterior',
    focalX: numeric(value.focalX ?? 50, 'focalX', { nullable: false, max: 100 }),
    focalY: numeric(value.focalY ?? 50, 'focalY', { nullable: false, max: 100 }) };
}
function normalizeDocument(input, { publish = false, allowPlaceholder = false, slug } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Proje bilgileri eksik.');
  const name = text(input.name, 180);
  const result = {
    schemaVersion: 1, slug: slug || text(input.slug, 120) || slugify(name), name,
    district: text(input.district, 120), neighborhood: text(input.neighborhood, 120),
    status: input.status || 'planlanan', structureType: text(input.structureType, 100) || 'Konut',
    description: text(input.description, 6000), summary: text(input.summary, 1200),
    constructionArea: numeric(input.constructionArea, 'constructionArea'),
    unitCount: numeric(input.unitCount, 'unitCount', { integer: true, max: 1000000 }),
    unitLabel: text(input.unitLabel, 80) || 'Daire sayısı', start: date(input.start, 'start'), end: date(input.end, 'end'),
    facts: (Array.isArray(input.facts) ? input.facts : []).slice(0, 30).map(f => ({ label: text(f.label, 100), value: text(f.value, 1000) })).filter(f => f.label && f.value),
    cover: image(input.cover), gallery: (Array.isArray(input.gallery) ? input.gallery : []).slice(0, 60).map(image).filter(Boolean),
    interiors: (Array.isArray(input.interiors) ? input.interiors : []).slice(0, 30).map(image).filter(Boolean),
    home: { card: input.home?.card === true, hero: input.home?.hero === true,
      cardOrder: numeric(input.home?.cardOrder ?? 999, 'cardOrder', { nullable: false, integer: true, max: 1000000 }),
      heroOrder: numeric(input.home?.heroOrder ?? 999, 'heroOrder', { nullable: false, integer: true, max: 1000000 }) },
    listOrder: numeric(input.listOrder ?? 999, 'listOrder', { nullable: false, integer: true, min: 1, max: 1000000 }),
    legacy: { detailPath: '/proje/' + (slug || text(input.slug, 120) || slugify(name)) + '.html',
      locationLabel: text(input.legacy?.locationLabel, 240), placeholder: allowPlaceholder === true },
  };
  if (!name) fail('Bina adı zorunludur.', { name: 'Bina adını girin.' });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) fail('Proje bağlantısı geçersiz.', { slug: 'Küçük harf, rakam ve tire kullanın.' });
  if (!STATUSES.includes(result.status)) fail('Dört proje durumundan birini seçin.', { status: 'Geçersiz proje durumu.' });
  if (result.start.value && result.end.value && result.end.value.slice(0, 4) < result.start.value.slice(0, 4)) fail('Bitiş başlangıçtan önce olamaz.', { end: 'Tarih sırasını kontrol edin.' });
  if (result.start.value.length === 10 && result.end.value.length === 10 && result.end.value < result.start.value) fail('Bitiş başlangıçtan önce olamaz.', { end: 'Tarih sırasını kontrol edin.' });
  if (publish && !result.district) fail('Yayın için ilçe zorunludur.', { district: 'İlçeyi girin.' });
  if (publish && !result.cover && !allowPlaceholder) fail('Yayın için kapak görseli yükleyin.', { cover: 'Kapak görseli zorunludur.' });
  return result;
}
function mediaIds(document) { return [...new Set([document.cover, ...document.gallery, ...document.interiors].filter(Boolean).map(m => m.id).filter(Boolean))]; }
function adminProject(row) {
  return { id: row.id, slug: row.slug, version: Number(row.version), publicationState: row.publication_state,
    draft: row.draft, published: row.published, hasUnpublishedChanges: JSON.stringify(row.draft) !== JSON.stringify(row.published),
    updatedAt: row.updated_at, publishedAt: row.published_at };
}
module.exports = { STATUSES, CmsError, normalizeDocument, slugify, safeUrl, image, mediaIds, adminProject, randomUUID };
