'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { CmsError } = require('./cms-model.cjs');

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_INPUT_PIXELS = 64 * 1024 * 1024;
const ORIGINAL_BUCKET = 'project-media-originals';
const VARIANT_BUCKET = 'project-media-variants';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_FORMATS = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const finalizing = new Set();

function assertId(id) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  return id.toLowerCase();
}
function localFile(store, id, file) {
  assertId(id);
  const base = path.resolve(store.localDir, 'media', id);
  const target = path.resolve(base, file);
  if (path.dirname(target) !== base) throw new CmsError(400, 'MEDIA_PATH', 'Görsel yolu geçersiz.');
  return target;
}
async function mediaRow(store, id) {
  assertId(id);
  const row = await store.getMedia(id);
  if (!row) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  return row;
}
function validateUpload({ fileName, type, size }) {
  if (!Object.hasOwn(TYPES, type)) throw new CmsError(422, 'MEDIA_TYPE', 'JPEG, PNG veya WebP biçiminde bir görsel seçin.');
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) throw new CmsError(422, 'MEDIA_SIZE', 'Görselin boyutu en fazla 20 MB olabilir.');
  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255 || /[\u0000-\u001f\u007f]/.test(fileName)) throw new CmsError(422, 'MEDIA_NAME', 'Dosya adı geçersiz.');
}
async function signMedia(store, input, user) {
  validateUpload(input || {});
  const projectId = assertId(input.projectId);
  const project = await store.getRow(projectId);
  if (!project) throw new CmsError(404, 'PROJECT_NOT_FOUND', 'Proje bulunamadı.');
  if (project.publication_state === 'archived') throw new CmsError(409, 'PROJECT_ARCHIVED', 'Görsel eklemek için projeyi arşivden geri yükleyin.');
  const id = randomUUID();
  const storagePath = `${projectId}/${id}/original.${TYPES[input.type]}`;
  const row = {
    id, project_id: projectId, bucket: ORIGINAL_BUCKET, path: storagePath,
    file_name: input.fileName.replaceAll('\\', '/').split('/').at(-1).trim(),
    mime_type: input.type, size_bytes: input.size, status: 'pending',
    width: null, height: null, variants: [], image: null,
    created_by: user?.id || null, published_at: null,
  };
  await store.createMedia(row);
  if (store.local) {
    return { mediaId: id, bucket: ORIGINAL_BUCKET, path: storagePath, token: '', signedUrl: `/api/admin/media/${id}/upload`, localPreviewUpload: true };
  }
  const { data, error } = await store.service.storage.from(ORIGINAL_BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data?.token || !data?.signedUrl) {
    await store.updateMedia(id, { status: 'failed', updated_at: new Date().toISOString() });
    throw new CmsError(503, 'MEDIA_SIGN_FAILED', 'Görsel yükleme bağlantısı oluşturulamadı. Yeniden deneyin.');
  }
  return { mediaId: id, bucket: ORIGINAL_BUCKET, path: data.path || storagePath, token: data.token, signedUrl: data.signedUrl };
}

async function acceptLocalUpload(store, id, buffer, contentType) {
  if (!store.local) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  const row = await mediaRow(store, id);
  if (row.status !== 'pending') throw new CmsError(409, 'MEDIA_IMMUTABLE', 'Bu görsel için yeni bir yükleme başlatın.');
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_UPLOAD_BYTES || buffer.length !== Number(row.size_bytes)) throw new CmsError(422, 'MEDIA_SIZE', 'Yüklenen dosyanın boyutu beklenen boyutla eşleşmiyor.');
  if (type !== row.mime_type) throw new CmsError(422, 'MEDIA_TYPE', 'Yüklenen dosyanın türü seçilen görselle eşleşmiyor.');
  const target = localFile(store, id, 'original');
  await fs.mkdir(path.dirname(target), { recursive: true });
  try { await fs.writeFile(target, buffer, { flag: 'wx' }); }
  catch (error) { if (error.code === 'EEXIST') throw new CmsError(409, 'MEDIA_IMMUTABLE', 'Görsel zaten yüklendi. Yeni bir görsel yüklemesi başlatın.'); throw error; }
  return { uploaded: true };
}

async function originalBuffer(store, row) {
  if (store.local) {
    try { return await fs.readFile(localFile(store, row.id, 'original')); }
    catch (error) { if (error.code === 'ENOENT') throw new CmsError(422, 'MEDIA_UPLOAD_MISSING', 'Dosya yüklemesi henüz tamamlanmadı.'); throw error; }
  }
  const { data, error } = await store.service.storage.from(ORIGINAL_BUCKET).download(row.path);
  if (error || !data) throw new CmsError(422, 'MEDIA_UPLOAD_MISSING', 'Dosya yüklemesi tamamlanmadı. Dosyayı yeniden yükleyin.');
  return Buffer.from(await data.arrayBuffer());
}
function defaultVariant(row) {
  const variants = [...(row.variants || [])].sort((a, b) => a.width - b.width);
  return variants.find(variant => variant.width >= 1280) || variants.at(-1);
}
async function imageWithPreview(store, row, originalImage = row.image) {
  const image = { ...originalImage };
  if (row.published_at) return image;
  const variant = defaultVariant(row);
  if (!variant) return image;
  if (store.local) image.previewSrc = `/api/admin/media/${row.id}/preview?width=${variant.width}`;
  else {
    const { data, error } = await store.service.storage.from(VARIANT_BUCKET).createSignedUrl(variant.path, 900);
    if (error || !data?.signedUrl) throw new CmsError(503, 'MEDIA_PREVIEW_FAILED', 'Özel görsel önizlemesi hazırlanamadı. Yeniden deneyin.');
    image.previewSrc = data.signedUrl;
  }
  return image;
}
async function removeVariants(store, row, variants) {
  if (!variants.length) return;
  if (store.local) {
    await Promise.all(variants.map(variant => fs.unlink(localFile(store, row.id, `${variant.width}.webp`)).catch(() => {})));
  } else {
    await store.service.storage.from(VARIANT_BUCKET).remove(variants.map(variant => variant.path));
  }
}
async function finalizeMedia(store, id) {
  let row = await mediaRow(store, id);
  if (row.status === 'ready') return imageWithPreview(store, row);
  if (finalizing.has(id) || row.status === 'processing') throw new CmsError(409, 'MEDIA_PROCESSING', 'Bu görsel hâlen hazırlanıyor. Biraz sonra yeniden deneyin.');
  // Claim in the persistent store before entering the cleanup/error path. A
  // losing request in another server instance must never overwrite ready media.
  const claimed = await store.claimMedia(id);
  if (!claimed) throw new CmsError(409, 'MEDIA_PROCESSING', 'Bu görsel hâlen hazırlanıyor. Biraz sonra yeniden deneyin.');
  row = typeof claimed === 'object' ? claimed : { ...row, status: 'processing' };
  finalizing.add(id);
  const uploaded = [];
  let ready = false;
  try {
    const input = await originalBuffer(store, row);
    if (input.length > MAX_UPLOAD_BYTES || input.length !== Number(row.size_bytes)) throw new CmsError(422, 'MEDIA_SIZE', 'Dosyanın boyutu beklenen boyutla eşleşmiyor veya 20 MB sınırını aşıyor.');
    let metadata;
    try { metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).metadata(); }
    catch { throw new CmsError(422, 'MEDIA_DECODE', 'Görsel okunamadı. Geçerli bir JPEG, PNG veya WebP dosyası yükleyin.'); }
    if (metadata.format !== MIME_FORMATS[row.mime_type]) throw new CmsError(422, 'MEDIA_TYPE', 'Dosyanın gerçek biçimi bildirilen görsel türüyle eşleşmiyor.');
    if ((metadata.pages || 1) > 1) throw new CmsError(422, 'MEDIA_ANIMATED', 'Lütfen hareketli görsel yerine tek kare fotoğraf yükleyin.');
    const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (!width || !height || width > 30000 || height > 30000 || width * height > MAX_INPUT_PIXELS) throw new CmsError(422, 'MEDIA_DIMENSIONS', 'Görsel boyutları desteklenen sınırları aşıyor.');
    // Clamp to the original dimensions: never upscale a smaller source.
    const widths = [...new Set([640, 1280, 1920].map(value => Math.min(value, width)))].sort((a, b) => a - b);
    const variants = [];
    for (const variantWidth of widths) {
      let output;
      try {
        output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).rotate()
          .resize({ width: variantWidth, withoutEnlargement: true })
          .webp({ quality: 90, effort: 4, smartSubsample: true }).toBuffer({ resolveWithObject: true });
      } catch { throw new CmsError(422, 'MEDIA_DECODE', 'Görselin tamamı okunamadı. Farklı bir dosyayla yeniden deneyin.'); }
      // Sharp strips EXIF/location metadata unless explicitly asked to retain it.
      const variant = { bucket: VARIANT_BUCKET, path: `${row.project_id}/${id}/${output.info.width}.webp`, width: output.info.width, height: output.info.height, mime_type: 'image/webp', size_bytes: output.data.length };
      if (store.local) {
        const target = localFile(store, id, `${variant.width}.webp`);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, output.data, { flag: 'wx' });
      } else {
        const { error } = await store.service.storage.from(VARIANT_BUCKET).upload(variant.path, output.data, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
        if (error) throw new CmsError(503, 'MEDIA_VARIANT_FAILED', 'Görsel boyutları kaydedilemedi. Biraz sonra yeniden deneyin.');
      }
      uploaded.push(variant); variants.push(variant);
    }
    const primary = variants.find(variant => variant.width >= 1280) || variants.at(-1);
    const image = {
      id, src: `/media/${id}/${primary.width}.webp`,
      srcset: variants.map(variant => `/media/${id}/${variant.width}.webp ${variant.width}w`).join(', '),
      width, height, alt: '', caption: '', label: '', kind: 'exterior', focalX: 50, focalY: 50,
    };
    const patch = { status: 'ready', width, height, variants, image, updated_at: new Date().toISOString() };
    await store.updateMedia(id, patch); ready = true;
    return await imageWithPreview(store, { ...row, ...patch });
  } catch (error) {
    if (!ready) {
      await removeVariants(store, row, uploaded).catch(() => {});
      await store.updateMedia(id, { status: 'failed', updated_at: new Date().toISOString() }).catch(() => {});
    }
    if (error instanceof CmsError) throw error;
    throw new CmsError(503, 'MEDIA_PROCESS_FAILED', 'Görsel hazırlanamadı. Biraz sonra yeniden deneyin.');
  } finally { finalizing.delete(id); }
}

async function decorateDraftImages(store, document) {
  if (!document) return document;
  const result = JSON.parse(JSON.stringify(document));
  const cache = new Map();
  const decorate = async image => {
    if (!image?.id) return image;
    if (!cache.has(image.id)) cache.set(image.id, mediaRow(store, image.id));
    const row = await cache.get(image.id);
    if (row.status !== 'ready') return image;
    return imageWithPreview(store, row, image);
  };
  result.cover = await decorate(result.cover);
  result.gallery = await Promise.all((result.gallery || []).map(decorate));
  result.interiors = await Promise.all((result.interiors || []).map(decorate));
  return result;
}

async function readVariant(store, id, requestedWidth, { allowPrivate = false } = {}) {
  const row = await mediaRow(store, id);
  if (row.status !== 'ready' || (!row.published_at && !allowPrivate)) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  const width = Number(requestedWidth);
  if (!Number.isInteger(width) || width < 1 || width > 30000) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  const variant = (row.variants || []).find(item => item.width === width);
  if (!variant || variant.bucket !== VARIANT_BUCKET || !variant.path?.startsWith(`${row.project_id}/${id}/`)) throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.');
  let buffer;
  if (store.local) {
    try { buffer = await fs.readFile(localFile(store, id, `${width}.webp`)); }
    catch { throw new CmsError(404, 'MEDIA_NOT_FOUND', 'Görsel bulunamadı.'); }
  } else {
    const { data, error } = await store.service.storage.from(VARIANT_BUCKET).download(variant.path);
    if (error || !data) throw new CmsError(503, 'MEDIA_READ_FAILED', 'Görsel şu anda okunamıyor.');
    buffer = Buffer.from(await data.arrayBuffer());
  }
  return { buffer, contentType: 'image/webp', width, etag: `"${createHash('sha256').update(buffer).digest('hex').slice(0, 32)}"` };
}
const getMediaPreview = (store, id, width) => readVariant(store, id, width, { allowPrivate: true });

module.exports = { MAX_UPLOAD_BYTES, ORIGINAL_BUCKET, VARIANT_BUCKET, signMedia, acceptLocalUpload, finalizeMedia, decorateDraftImages, readVariant, getMediaPreview };
