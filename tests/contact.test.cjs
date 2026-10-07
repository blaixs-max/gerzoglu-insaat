'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createContactHandler, validate, smtpConfig } = require('../lib/contact.cjs');
const sample = { formType: 'contact', ad_soyad: 'Kontrol Kullanıcısı', telefon: '+90 532 000 00 00', eposta: 'test@example.com', konu: 'Diğer', mesaj: 'Yerel otomatik kontrol. Gerçek e-posta gönderilmez.', kvkk: 'on' };
const env = { NODE_ENV: 'production', SMTP_HOST: 'mail.example.com', SMTP_PORT: '587', SMTP_USER: 'info@gerzoglu.com', SMTP_PASS: 'test-only' };
function response() { return { code: 0, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, json(body) { this.body=body; return this; } }; }
function request(body=sample, extra={}) { return { method: 'POST', headers: { origin: 'https://gerzoglu-varyant-3.vercel.app', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' }, body, ...extra }; }
test('Reject missing required fields, non-string payloads, header injection and invalid building numbers',()=>{
  assert.equal(validate(sample).errors && Object.keys(validate(sample).errors).length,0);
  assert.ok(validate({...sample,telefon:'no'}).errors.telefon);
  assert.ok(validate({...sample,eposta:'test@example.com\r\nBcc: victim@example.com'}).errors.eposta);
  assert.ok(validate({...sample,ad_soyad:['name']}).errors.ad_soyad);
  assert.ok(validate({...sample,kvkk:false}).errors.kvkk);
  assert.ok(validate({formType:'urban',eposta:'test@example.com',telefon:sample.telefon,unvan:'Kat maliki',ada_parsel:'1/2',adres:'Örnek adres',kvkk:'on',kat_sayisi:'-2'}).errors.kat_sayisi);
});
test('Missing SMTP never reports successful delivery', async()=>{ let sent=0; const handler=createContactHandler({env:{NODE_ENV:'production'},sendMail:async()=>{sent++;}}); const res=response(); await handler(request(),res); assert.equal(res.code,503); assert.equal(res.body.ok,false); assert.equal(sent,0); });
test('Only server-approved recipient receives validated text; ignores injected recipient',async()=>{ let mail; const handler=createContactHandler({env,sendMail:async(config,message)=>{mail=message;assert.equal(config.requireTLS,true);assert.equal(config.tls.rejectUnauthorized,true);return {accepted:['info@gerzoglu.com']};}}); const res=response(); await handler(request({...sample,to:'attacker@example.com'}),res); assert.equal(res.code,200);assert.equal(mail.to,'info@gerzoglu.com');assert.equal(mail.replyTo,'test@example.com');assert.ok(res.body.reference);assert.equal(mail.html,undefined); });
test('Foreign origin, non-JSON and unsupported methods never send',async()=>{let sent=0;const h=createContactHandler({env,sendMail:async()=>{sent++;}}); for(const [req,code] of [[request(sample,{headers:{origin:'https://evil.example','content-type':'application/json'}}),403],[request(sample,{headers:{origin:'https://gerzoglu-varyant-3.vercel.app','content-type':'text/plain'}}),415],[request(sample,{method:'DELETE'}),405]]){const res=response();await h(req,res);assert.equal(res.code,code);}assert.equal(sent,0);});
test('SMTP rejection and exceptions preserve truthful failure response',async()=>{for(const sender of [async()=>({accepted:[]}),async()=>{throw Object.assign(new Error('not logged'),{code:'EAUTH'});}]){const h=createContactHandler({env,sendMail:sender});const r=response();await h(request(),r);assert.equal(r.code,502);assert.equal(r.body.ok,false);}});
test('Throttle sixth send, oversized body and honeypot input',async()=>{let sent=0;const h=createContactHandler({env,sendMail:async()=>{sent++;return {accepted:['info@gerzoglu.com']};}});for(let i=0;i<6;i++){const r=response();await h(request(),r);assert.equal(r.code,i<5?200:429);}assert.equal(sent,5);const huge=response();await h(request(sample,{headers:{origin:'https://gerzoglu-varyant-3.vercel.app','content-type':'application/json','content-length':'20000'}}),huge);assert.equal(huge.code,413);const bot=response();await h(request({...sample,_website:'https://spam.example'}),bot);assert.equal(bot.code,422);});
test('TLS configuration and status contain no secret values',async()=>{assert.equal(smtpConfig({...env,SMTP_PORT:'25'}),null);assert.equal(smtpConfig({...env,SMTP_PORT:'465'}).secure,true);const r=response();await createContactHandler({env,sendMail:async()=>{}})({method:'GET',headers:{}},r);assert.deepEqual(r.body,{available:true});});
