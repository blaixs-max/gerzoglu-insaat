'use strict';
const { CmsError, normalizeDocument, slugify } = require('./cms-model.cjs');
const { redirects = [] } = require('../vercel.json');

// These URLs are already owned by permanent legacy redirects at the hosting layer.
const reservedSlugs = redirects.map(({ source }) => /^\/proje\/([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/.exec(source)?.[1]).filter(Boolean);
const MAX_CREATE_ATTEMPTS = 12;

async function createProject(store, input) {
  // Validate the name and other fields first. Client-supplied URLs never choose a new route.
  const document = normalizeDocument(input, { slug: 'proje' });
  const base = slugify(document.name).replace(/-+$/, '') || 'proje';
  const occupied = new Set([...reservedSlugs, ...await store.listSlugs()]);
  let suffix = 1;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    let slug;
    do {
      const ending = suffix === 1 ? '' : '-' + suffix;
      slug = base.slice(0, 120 - ending.length).replace(/-+$/, '') + ending;
      suffix++;
    } while (occupied.has(slug));
    const draft = { ...document, slug, legacy: { ...document.legacy, detailPath: '/proje/' + slug + '.html' } };
    try {
      // The database UNIQUE constraint makes concurrent inserts safe; never update an existing row.
      return await store.rpc('cms_create_project', { p_document: draft });
    } catch (error) {
      if (!(error instanceof CmsError) || error.code !== 'SLUG_EXISTS') throw error;
      occupied.add(slug);
    }
  }
  throw new CmsError(409, 'CREATE_RETRY', 'Proje adresi şu anda oluşturulamadı. Lütfen tekrar kaydedin.');
}

module.exports = { createProject };
