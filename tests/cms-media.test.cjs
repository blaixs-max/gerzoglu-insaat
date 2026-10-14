'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { signMedia, acceptLocalUpload, finalizeMedia, readVariant, getMediaPreview, decorateDraftImages, MAX_UPLOAD_BYTES, ORIGINAL_BUCKET, VARIANT_BUCKET } = require('../lib/cms-media.cjs');

async function fixture(t, cloud = false) {
  const localDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gerzoglu-media-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(localDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(localDir).startsWith('gerzoglu-media-test-'));
    await fs.rm(localDir, { recursive: true, force: true });
  });
  const projectId = randomUUID(), user = { id: randomUUID() }, rows = new Map(), objects = new Map();
  const store = {
    local: !cloud, localDir,
    getRow: async id => id === projectId ? { id, publication_state: 'draft' } : null,
    getMedia: async id => rows.get(id),
    createMedia: async row => { rows.set(row.id, structuredClone(row)); return row; },
    updateMedia: async (id, patch) => { const row = { ...rows.get(id), ...structuredClone(patch) }; rows.set(id, row); return row; },
    claimMedia: async id => {
      const row = rows.get(id);
      if (!row || !['pending', 'failed'].includes(row.status)) return null;
      const claimed = { ...row, status: 'processing', updated_at: new Date().toISOString() };
      rows.set(id, claimed); return true;
    },
  };
  if (cloud) store.service = { storage: { from(bucket) {
    return {
      createSignedUploadUrl: async key => ({ data: { path: key, token: 'test-upload-token', signedUrl: `https://test.supabase.co/upload/${key}` }, error: null }),
      upload: async (key, data) => {
        const location = `${bucket}/${key}`;
        if (objects.has(location)) return { error: new Error('exists') };
        objects.set(location, Buffer.from(data)); return { data: { path: key }, error: null };
      },
      download: async key => objects.has(`${bucket}/${key}`) ? { data: new Blob([objects.get(`${bucket}/${key}`)]), error: null } : { data: null, error: new Error('missing') },
      createSignedUrl: async key => ({ data: { signedUrl: `https://test.supabase.co/private/${key}?token=test-preview-token` }, error: null }),
      remove: async keys => { keys.forEach(key => objects.delete(`${bucket}/${key}`)); return { error: null }; },
    };
  } } };
  return { store, projectId, user, rows, objects };
}
function input(projectId, buffer, type = 'image/jpeg') { return { projectId, fileName: 'proje-fotografi.jpg', type, size: buffer.length }; }

test('local upload keeps original, corrects orientation and strips metadata without upscaling', async t => {
  const { store, projectId, user, rows } = await fixture(t);
  const original = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#8e7561' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const signed = await signMedia(store, input(projectId, original), user);
  assert.equal(signed.localPreviewUpload, true);
  assert.match(signed.signedUrl, /^\/api\/admin\/media\/[a-f0-9-]+\/upload$/);
  await acceptLocalUpload(store, signed.mediaId, original, 'image/jpeg');
  await assert.rejects(acceptLocalUpload(store, signed.mediaId, original, 'image/jpeg'), { status: 409 });
  const image = await finalizeMedia(store, signed.mediaId, user);
  assert.equal(image.width, 40); assert.equal(image.height, 80);
  assert.equal(image.src, `/media/${signed.mediaId}/40.webp`);
  assert.match(image.previewSrc, /\/preview\?width=40$/);
  assert.deepEqual(rows.get(signed.mediaId).variants.map(v => v.width), [40]);
  const privateImage = await getMediaPreview(store, signed.mediaId, 40);
  const metadata = await sharp(privateImage.buffer).metadata();
  assert.equal(metadata.width, 40); assert.equal(metadata.height, 80); assert.equal(metadata.exif, undefined);
  assert.deepEqual(await fs.readFile(path.join(store.localDir, 'media', signed.mediaId, 'original')), original);
});

test('private derivatives cannot be read publicly until a successful publication marks the media', async t => {
  const { store, projectId, user, rows } = await fixture(t);
  const original = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#d5c9a9' } }).jpeg().toBuffer();
  const signed = await signMedia(store, input(projectId, original), user);
  await acceptLocalUpload(store, signed.mediaId, original, 'image/jpeg');
  const image = await finalizeMedia(store, signed.mediaId, user);
  assert.deepEqual(rows.get(signed.mediaId).variants.map(v => v.width), [640, 900]);
  await assert.rejects(readVariant(store, signed.mediaId, 900), { status: 404 });
  await store.updateMedia(signed.mediaId, { published_at: new Date().toISOString() });
  const published = await readVariant(store, signed.mediaId, 900);
  assert.equal(published.contentType, 'image/webp'); assert.match(published.etag, /^"[a-f0-9]{32}"$/);
  assert.equal((await sharp(published.buffer).metadata()).width, 900);
  await assert.rejects(readVariant(store, signed.mediaId, 1280), { status: 404 });
  const repeated = await finalizeMedia(store, signed.mediaId, user);
  assert.equal(repeated.previewSrc, undefined); assert.equal(repeated.src, image.src);
});

test('invalid sizes, MIME spoofing, corrupt content and unknown projects are rejected', async t => {
  const { store, projectId, user, rows } = await fixture(t);
  await assert.rejects(signMedia(store, { projectId, fileName: 'x.jpg', type: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1 }, user), { status: 422 });
  await assert.rejects(signMedia(store, { projectId, fileName: 'x.svg', type: 'image/svg+xml', size: 100 }, user), { status: 422 });
  await assert.rejects(signMedia(store, { projectId: randomUUID(), fileName: 'x.jpg', type: 'image/jpeg', size: 100 }, user), { status: 404 });
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#abc' } }).png().toBuffer();
  const signed = await signMedia(store, input(projectId, png), user);
  await assert.rejects(acceptLocalUpload(store, signed.mediaId, png, 'image/png'), { status: 422 });
  await acceptLocalUpload(store, signed.mediaId, png, 'image/jpeg');
  await assert.rejects(finalizeMedia(store, signed.mediaId), { status: 422, code: 'MEDIA_TYPE' });
  assert.equal(rows.get(signed.mediaId).status, 'failed');
  const corrupt = Buffer.from('this is not a photograph');
  const corruptSigned = await signMedia(store, input(projectId, corrupt), user);
  await acceptLocalUpload(store, corruptSigned.mediaId, corrupt, 'image/jpeg');
  await assert.rejects(finalizeMedia(store, corruptSigned.mediaId), { status: 422, code: 'MEDIA_DECODE' });
  await assert.rejects(getMediaPreview(store, '../outside', 640), { status: 404 });
});

test('cloud flow signs only private originals, builds responsive variants and decorates only admin copies', async t => {
  const { store, projectId, user, rows, objects } = await fixture(t, true);
  const original = await sharp({ create: { width: 2000, height: 1300, channels: 3, background: '#8798a1' } }).jpeg().toBuffer();
  const signed = await signMedia(store, input(projectId, original), user);
  assert.equal(signed.bucket, ORIGINAL_BUCKET);
  objects.set(`${ORIGINAL_BUCKET}/${signed.path}`, original);
  await assert.rejects(acceptLocalUpload(store, signed.mediaId, original, 'image/jpeg'), { status: 404 });
  const image = await finalizeMedia(store, signed.mediaId, user);
  assert.deepEqual(rows.get(signed.mediaId).variants.map(v => v.width), [640, 1280, 1920]);
  assert.equal(image.src, `/media/${signed.mediaId}/1280.webp`);
  assert.match(image.previewSrc, /^https:\/\/test.supabase.co\/private\//);
  assert.ok([...objects.keys()].filter(key => key.startsWith(`${VARIANT_BUCKET}/`)).length === 3);
  const cleanImage = structuredClone(image); delete cleanImage.previewSrc;
  const document = { cover: cleanImage, gallery: [cleanImage], interiors: [] };
  const decorated = await decorateDraftImages(store, document);
  assert.ok(decorated.cover.previewSrc); assert.ok(decorated.gallery[0].previewSrc); assert.equal(document.cover.previewSrc, undefined);
  await assert.rejects(readVariant(store, signed.mediaId, 1280), { status: 404 });
  await store.updateMedia(signed.mediaId, { published_at: new Date().toISOString() });
  assert.equal((await readVariant(store, signed.mediaId, 1280)).buffer.length > 0, true);
});

test('two separate finalizer instances compete for one persistent claim without corrupting ready media', async t => {
  const { store, projectId, user, rows } = await fixture(t);
  const original = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#7d9aa1' } }).jpeg().toBuffer();
  const signed = await signMedia(store, input(projectId, original), user);
  await acceptLocalUpload(store, signed.mediaId, original, 'image/jpeg');
  // Reload only this module to reproduce independent process-local lock sets.
  const modulePath = require.resolve('../lib/cms-media.cjs');
  delete require.cache[modulePath];
  const otherInstance = require('../lib/cms-media.cjs');
  const results = await Promise.allSettled([finalizeMedia(store, signed.mediaId), otherInstance.finalizeMedia(store, signed.mediaId)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  assert.equal(rows.get(signed.mediaId).status, 'ready');
  assert.equal((await getMediaPreview(store, signed.mediaId, 900)).buffer.length > 0, true);
});
