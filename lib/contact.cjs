'use strict';

const { randomUUID, randomBytes, createHmac } = require('node:crypto');
const MAX_BYTES = 16384;
const RECIPIENT = 'info@gerzoglu.com';
const emailPattern = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]{2,}$/;
const topics = ['Satış ve daire bilgisi', 'Kentsel dönüşüm', 'Tedarik ve iş birliği', 'Diğer'];
const titles = ['Apartman yöneticisi', 'Kat maliki', 'Diğer'];
const labels = { ad_soyad: 'Ad soyad', ad: 'Ad', soyad: 'Soyad', telefon: 'Telefon', eposta: 'E-posta', konu: 'Konu', mesaj: 'Mesaj', unvan: 'Başvuran kişi', ada_parsel: 'Ada / parsel', adres: 'Bina adresi', daire_sayisi: 'Daire sayısı', arsa_m2: 'Arsa alanı (m²)', kat_sayisi: 'Kat sayısı', dukkan_sayisi: 'Dükkân sayısı' };

function validate(raw) {
  const errors = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: { form: 'Form verisi geçerli değil.' } };
  if (!['contact', 'urban'].includes(raw.formType)) return { errors: { formType: 'Form türü geçerli değil.' } };
  const data = { formType: raw.formType };
  const fields = raw.formType === 'contact'
    ? ['ad_soyad', 'telefon', 'eposta', 'konu', 'mesaj']
    : ['ad', 'soyad', 'telefon', 'eposta', 'unvan', 'ada_parsel', 'adres', 'daire_sayisi', 'arsa_m2', 'kat_sayisi', 'dukkan_sayisi'];
  for (const field of fields) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') { errors[field] = 'Bu alan geçerli değil.'; continue; }
    data[field] = (raw[field] || '').trim();
    const max = field === 'mesaj' ? 5000 : field === 'adres' ? 700 : field === 'eposta' ? 254 : 200;
    if (data[field].length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(data[field])) errors[field] = 'Bu alan çok uzun veya geçersiz karakter içeriyor.';
  }
  const required = raw.formType === 'contact' ? ['ad_soyad', 'telefon', 'konu', 'mesaj'] : ['telefon', 'eposta', 'unvan', 'ada_parsel', 'adres'];
  for (const field of required) if (!data[field]) errors[field] = 'Bu alan zorunlu.';
  if (!['on', 'true', true].includes(raw.kvkk)) errors.kvkk = 'Aydınlatma metnini okuduğunuzu belirtin.';
  if (data.eposta && (data.eposta.length > 254 || !emailPattern.test(data.eposta))) errors.eposta = 'Geçerli bir e-posta adresi yazın.';
  if (data.telefon && (!/^[+()\d\s.-]+$/.test(data.telefon) || !/^\d{10,15}$/.test(data.telefon.replace(/\D/g, '')))) errors.telefon = 'Telefon numarasını alan koduyla birlikte yazın.';
  if (raw.formType === 'contact' && data.konu && !topics.includes(data.konu)) errors.konu = 'Geçerli bir konu seçin.';
  if (raw.formType === 'urban' && data.unvan && !titles.includes(data.unvan)) errors.unvan = 'Geçerli bir başvuran kişi seçin.';
  for (const field of ['daire_sayisi', 'kat_sayisi', 'dukkan_sayisi']) if (data[field] && !/^\d{1,4}$/.test(data[field])) errors[field] = 'Pozitif tam sayı veya sıfır yazın.';
  if (data.arsa_m2 && (!/^\d{1,8}([.,]\d{1,2})?$/.test(data.arsa_m2) || Number(data.arsa_m2.replace(',', '.')) <= 0)) errors.arsa_m2 = 'Geçerli bir alan yazın.';
  if (raw._website) errors.form = 'Form doğrulanamadı.';
  return { data, errors };
}

function smtpConfig(env) {
  const port = Number(env.SMTP_PORT || 587);
  const from = env.SMTP_FROM || RECIPIENT;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || ![465, 587].includes(port) || !emailPattern.test(from)) return null;
  return { host: env.SMTP_HOST, port, secure: port === 465, requireTLS: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, from };
}

function createContactHandler({ env = process.env, sendMail, now = Date.now } = {}) {
  // Per-instance throttling supplements the hosting platform's network protection.
  // Keys are ephemeral salted hashes, never written to logs or persistent storage.
  const salt = randomBytes(32);
  const requests = new Map();
  function allowedOrigin(req) {
    try {
      const origin = new URL(req.headers.origin || '');
      if (origin.protocol === 'https:' && ['gerzoglu-varyant-3.vercel.app', 'gerzoglu.com', 'www.gerzoglu.com'].includes(origin.hostname)) return true;
      if (env.VERCEL_URL && origin.origin === 'https://' + env.VERCEL_URL) return true;
      if (env.NODE_ENV !== 'production' && origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)) return true;
    } catch (_) { /* Reject missing and malformed origins. */ }
    return false;
  }
  return async function contact(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const respond = (code, body) => res.status(code).json(body);
    if (req.method === 'GET') return respond(200, { available: Boolean(smtpConfig(env)) });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return respond(405, { ok: false, message: 'Bu işlem desteklenmiyor.' }); }
    if (!allowedOrigin(req)) return respond(403, { ok: false, message: 'Bu kaynaktan gönderim kabul edilmiyor.' });
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return respond(415, { ok: false, message: 'Form verisi geçerli değil.' });
    if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return respond(413, { ok: false, message: 'Mesajınız çok uzun.' });
    let body = req.body;
    try {
      if (typeof body === 'string') { if (Buffer.byteLength(body) > MAX_BYTES) throw new RangeError(); body = JSON.parse(body); }
      if (Buffer.byteLength(JSON.stringify(body) || '') > MAX_BYTES) throw new RangeError();
    } catch (_) { return respond(400, { ok: false, message: 'Form verisi okunamadı.' }); }
    const { data, errors } = validate(body);
    if (Object.keys(errors).length) return respond(422, { ok: false, message: 'Lütfen işaretli alanları kontrol edin.', errors });
    const config = smtpConfig(env);
    if (!config) return respond(503, { ok: false, message: 'E-posta üzerinden gönderim şu anda kullanılamıyor. Bilgileriniz gönderilmedi. Lütfen telefon veya WhatsApp ile bize ulaşın.' });
    const time = now();
    for (const [key, value] of requests) if (time - value.start > 900000) requests.delete(key);
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const key = createHmac('sha256', salt).update(ip).digest('hex');
    const record = requests.get(key) || { count: 0, start: time };
    if (record.count >= 5 || requests.size >= 5000) { res.setHeader('Retry-After', '900'); return respond(429, { ok: false, message: 'Kısa sürede birden fazla gönderim yaptınız. Lütfen daha sonra tekrar deneyin veya bizi arayın.' }); }
    record.count++; requests.set(key, record);
    const reference = randomUUID();
    const subject = data.formType === 'urban' ? 'Yeni kentsel dönüşüm başvurusu' : 'Yeni iletişim talebi';
    const text = [subject, 'Referans: ' + reference, 'Tarih: ' + new Date(time).toISOString(), '', ...Object.entries(labels).filter(([field]) => data[field]).map(([field, label]) => label + ': ' + data[field]), '', 'Aydınlatma metni okundu: Evet'].join('\n');
    try {
      const result = await sendMail(config, { from: 'Gerzoğlu İnşaat <' + config.from + '>', to: RECIPIENT, replyTo: data.eposta || undefined, subject, text });
      if (!result || !Array.isArray(result.accepted) || !result.accepted.some(address => String(address).toLowerCase() === RECIPIENT)) throw new Error('NOT_ACCEPTED');
      return respond(200, { ok: true, reference, message: 'Talebiniz e-posta sunucusuna iletildi. Ekibimiz sizinle iletişime geçecektir.' });
    } catch (error) {
      // Do not log form contents, addresses, credentials, or SMTP error messages.
      console.error('contact_delivery_failed', reference, /^[A-Z_]+$/.test(error.code || '') ? error.code : 'DELIVERY_ERROR');
      return respond(502, { ok: false, message: 'E-posta gönderimi tamamlanamadı. Formdaki bilgilerinizi koruduk; tekrar deneyebilir veya bizi arayabilirsiniz.' });
    }
  };
}

module.exports = { createContactHandler, validate, smtpConfig };
