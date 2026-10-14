// Browser-only checks for the three project steps. The API remains authoritative.
export const STEPS = Object.freeze(['details', 'images', 'extra']);
const STATUSES = ['teslim', 'devam', 'planlanan', 'satista'];
const blank = value => value == null || (typeof value === 'string' && !value.trim());
const content = value => typeof value === 'string' ? value.trim() : '';

function numberErrors(errors, value, field, label, { required = false, integer = false, min = 0, max = 1e9 } = {}) {
  if (blank(value)) {
    if (required) errors.push({ field, message: `${label} girin.` });
    return;
  }
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    errors.push({ field, message: `${label} için ${min > 0 ? `${min} veya daha büyük` : 'sıfır veya daha büyük'} ${integer ? 'bir tam sayı' : 'geçerli bir sayı'} girin.` });
  }
}

function validDate(value) {
  if (blank(value)) return true;
  if (typeof value !== 'string' || !/^(19|20|21)\d{2}(?:-\d{2}-\d{2})?$/.test(value)) return false;
  if (value.length === 4) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return false;
  const url = value.trim();
  if (/[\u0000-\u0020\\]/.test(url)) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return !/(?:^|\/)\.\.(?:\/|$)/.test(url);
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch { return false; }
}

// These inherited room samples have no controls in the simplified editor.
function hiddenSample(image) {
  return !image?.id && /^\/(?:assets\/responsive|img)\/(?:yatak-odasi-3b77ec12|mutfak-c12724cf|banyo-e1f62517)(?:-|\.)/.test(image?.src || '');
}

function imageErrors(errors, image, field) {
  if (!image || typeof image !== 'object' || Array.isArray(image)) {
    errors.push({ field, message: 'Geçerli bir görsel seçin.' });
    return;
  }
  if (!safeImageUrl(image.src)) errors.push({ field: `${field}.src`, message: 'Görsel yüklenemiyor. Görseli yeniden yükleyin veya başka bir görsel seçin.' });
  if (image.id && !/^[a-f0-9-]{36}$/i.test(image.id)) errors.push({ field, message: 'Görsel kaydı geçersiz. Görseli yeniden yükleyin.' });
  for (const axis of ['focalX', 'focalY']) {
    numberErrors(errors, image[axis] ?? 50, `${field}.${axis}`, 'Görsel odağı', { max: 100 });
  }
  for (const dimension of ['width', 'height']) {
    numberErrors(errors, image[dimension], `${field}.${dimension}`, 'Görsel boyutu', { integer: true, max: 30000 });
  }
  if (!blank(image.srcset)) {
    if (typeof image.srcset !== 'string' || image.srcset.length > 8000 || image.srcset.split(',').some(part => {
      const match = part.trim().match(/^(\S+)\s+([1-9]\d{0,4})w$/);
      return !match || !safeImageUrl(match[1]);
    })) errors.push({ field: `${field}.srcset`, message: 'Görsel boyutları geçersiz. Görseli yeniden yükleyin.' });
  }
  if (image.kind && !['exterior', 'interior', 'plan', 'other'].includes(image.kind)) {
    errors.push({ field: `${field}.kind`, message: 'Görsel türünü seçin.' });
  }
}

function detailsErrors(document) {
  const errors = [];
  if (!content(document.name)) errors.push({ field: 'name', message: 'Bina adını girin.' });
  else if (document.name.trim().length > 180) errors.push({ field: 'name', message: 'Bina adı en fazla 180 karakter olabilir.' });
  if (!content(document.district)) errors.push({ field: 'district', message: 'İlçeyi girin.' });
  else if (document.district.trim().length > 120) errors.push({ field: 'district', message: 'İlçe en fazla 120 karakter olabilir.' });
  if (!STATUSES.includes(document.status)) errors.push({ field: 'status', message: 'Dört proje durumundan birini seçin.' });
  numberErrors(errors, document.constructionArea, 'constructionArea', 'İnşaat alanı');
  numberErrors(errors, document.unitCount, 'unitCount', 'Daire / bağımsız bölüm sayısı', { integer: true, max: 1000000 });
  numberErrors(errors, document.listOrder, 'listOrder', 'Listede gösterim sırası', { required: true, integer: true, min: 1, max: 1000000 });
  const start = document.start?.value ?? '';
  const end = document.end?.value ?? '';
  const startValid = validDate(start), endValid = validDate(end);
  if (!startValid) errors.push({ field: 'start.value', message: '1900–2199 arasında bir yıl veya gerçek bir tarih girin. Örnek: 2026 ya da 2026-10-14.' });
  if (!endValid) errors.push({ field: 'end.value', message: '1900–2199 arasında bir yıl veya gerçek bir tarih girin. Örnek: 2026 ya da 2026-10-14.' });
  if (startValid && endValid && start && end && (end.slice(0, 4) < start.slice(0, 4) || (start.length === 10 && end.length === 10 && end < start))) {
    errors.push({ field: 'end.value', message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.' });
  }
  return errors;
}

function imagesErrors(document, options) {
  const errors = [];
  if (options.uploading) errors.push({ field: 'gallery', message: 'Görsellerin yüklenmesi ve hazırlanması tamamlanana kadar bekleyin.' });
  if (!document.cover) {
    if (options.allowCoverless !== true) errors.push({ field: 'cover', message: 'Projeye bir görsel yükleyin ve kapak görselini seçin.' });
  } else imageErrors(errors, document.cover, 'cover');
  for (const [group, max] of [['gallery', 60], ['interiors', 30]]) {
    const images = document[group];
    if (images == null) continue;
    if (!Array.isArray(images)) { errors.push({ field: group, message: 'Görsel listesi geçersiz. Projeyi yeniden açın.' }); continue; }
    if (images.length > max) errors.push({ field: group, message: `Bu görsel grubunda en fazla ${max} fotoğraf olabilir.` });
    images.forEach((image, index) => { if (!hiddenSample(image)) imageErrors(errors, image, `${group}.${index}`); });
  }
  return errors;
}

function extraErrors(document) {
  const errors = [];
  const facts = document.facts ?? [];
  if (!Array.isArray(facts)) errors.push({ field: 'facts', message: 'Ek bilgi listesi geçersiz. Projeyi yeniden açın.' });
  else {
    if (facts.length > 30) errors.push({ field: 'facts', message: 'En fazla 30 ek bilgi satırı ekleyebilirsiniz.' });
    facts.forEach((fact, index) => {
      const label = content(fact?.label), value = content(fact?.value);
      if (value && !label) errors.push({ field: `facts.${index}.label`, message: 'Bu bilginin başlığını girin veya satırı kaldırın.' });
      if (label && !value) errors.push({ field: `facts.${index}.value`, message: 'Bu bilginin değerini girin veya satırı kaldırın.' });
      if (label.length > 100) errors.push({ field: `facts.${index}.label`, message: 'Bilgi başlığı en fazla 100 karakter olabilir.' });
      if (value.length > 1000) errors.push({ field: `facts.${index}.value`, message: 'Bilgi değeri en fazla 1000 karakter olabilir.' });
    });
  }
  if (content(document.legacy?.locationLabel).length > 240) errors.push({ field: 'legacy.locationLabel', message: 'Özel konum yazısı en fazla 240 karakter olabilir.' });
  return errors;
}

export function validateStep(document, step, options = {}) {
  if (!STEPS.includes(step)) throw new RangeError('Bilinmeyen proje adımı.');
  const draft = document && typeof document === 'object' && !Array.isArray(document) ? document : {};
  if (step === 'details') return detailsErrors(draft);
  if (step === 'images') return imagesErrors(draft, options);
  return extraErrors(draft);
}

export function validateAll(document, options = {}) {
  return STEPS.flatMap(step => validateStep(document, step, options).map(error => ({ ...error, step })));
}

export function canVisitStep(target, validatedSteps = []) {
  const index = typeof target === 'number' ? target : STEPS.indexOf(target);
  if (!Number.isInteger(index) || index < 0 || index >= STEPS.length) return false;
  const validated = new Set(validatedSteps);
  return STEPS.slice(0, index).every(step => validated.has(step));
}
