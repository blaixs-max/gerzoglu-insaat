'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const { importSite } = require('../scripts/import-projects.cjs');
const { renderPage } = require('../lib/cms-render.cjs');
const root = path.resolve(__dirname, '..');
const { projects, templates } = importSite(root);
const copy = value => structuredClone(value);
const parse = result => cheerio.load(result.body);

test('migration keeps all 27 distinct URLs, ordering, the four heroes and eight featured cards', () => {
  assert.equal(projects.length, 27);
  assert.equal(new Set(projects.map(project => project.slug)).size, 27);
  assert.deepEqual(projects.map(project => project.listOrder), Array.from({ length: 27 }, (_, index) => index + 1));
  assert.deepEqual(Object.fromEntries(['teslim', 'devam', 'planlanan', 'satista'].map(status => [status, projects.filter(project => project.status === status).length])), { teslim: 18, devam: 1, planlanan: 8, satista: 0 });
  assert.equal(projects.filter(project => project.home.hero).length, 4);
  assert.equal(projects.filter(project => project.home.card).length, 8);
  const azna = projects.find(project => project.slug === 'idealtepe-zeynep-azna');
  const azra = projects.find(project => project.slug === 'idealtepe-zeynep-azra');
  assert.equal(azna.name, azra.name);
  assert.notEqual(azna.cover.src, azra.cover.src);
  assert.equal(azna.constructionArea, 3400);
  assert.equal(azra.constructionArea, 3900);
  assert.notEqual(azna.legacy.locationLabel, azra.legacy.locationLabel);
  for (const project of projects) assert.ok(templates[project.legacy.detailPath]);
  assert.deepEqual(importSite(root), { projects, templates }, 'migration is deterministic');
});

test('migration retains the original facts, imagery and year-only date precision without inventing units', () => {
  const office = projects.find(project => project.slug === 'maltepe-gerzoglu-plaza');
  assert.equal(office.unitCount, 8);
  assert.equal(office.unitLabel, 'Ofis sayısı');
  assert.ok(office.facts.some(fact => fact.label === 'Dükkân sayısı' && fact.value === '1'));
  assert.ok(office.facts.some(fact => fact.label === 'Not' && fact.value === 'Genel müdürlüğümüz'));
  const villa = projects.find(project => project.slug === 'tuzla-tepeoren-villa');
  assert.equal(villa.unitCount, null);
  assert.equal(villa.structureType, 'Müstakil villa');
  const planned = projects.find(project => project.slug === 'kartal-karabas-apartmani');
  assert.deepEqual(planned.start, { value: '2027', estimated: true });
  assert.equal(planned.cover.width, 1536);
  assert.match(planned.cover.srcset, /1536w/);
  assert.equal(projects.find(project => project.slug === 'uskudar-yilmaz-apartmani').cover, null);
  const dermanci = projects.find(project => project.slug === 'kucuktur-yolu-dermanci-apartmani');
  assert.equal(dermanci.gallery.length, 5);
  assert.ok(dermanci.gallery.some(image => image.label === 'Mevcut bina'));
  for (const project of projects) {
    const source = cheerio.load(templates[project.legacy.detailPath]);
    assert.equal(project.cover?.src || '', source('.phero__media img').attr('src') || '');
    assert.equal(project.summary, source('.about__quote').text());
    const images = source('.gallery img, .ba img, .rooms img').map((_, node) => source(node).attr('src')).get();
    assert.deepEqual([...project.gallery, ...project.interiors].map(image => image.src), images);
    const rendered = parse(renderPage(project.legacy.detailPath, projects));
    assert.equal(rendered('h1').text(), project.name);
    assert.equal(rendered('.phero__media img').attr('src') || '', project.cover?.src || '');
    for (const fact of project.facts) assert.ok(rendered('.kunye__board').text().includes(fact.value));
  }
  const renderedVilla = parse(renderPage(villa.legacy.detailPath, projects));
  assert.ok(!renderedVilla('.kunye__board dt').toArray().some(node => renderedVilla(node).text() === 'Daire sayısı'));
});

function newProject() {
  return {
    schemaVersion: 1, slug: 'yeni-test-apartmani', name: 'Yeni Test Apartmanı', district: 'Ataşehir', neighborhood: 'İçerenköy',
    status: 'satista', structureType: 'Konut', summary: 'Yeni proje özeti', description: 'Birinci paragraf.\n\nİkinci paragraf.',
    constructionArea: 1234, unitCount: 14, unitLabel: 'Daire sayısı', start: { value: '2026-10-14', estimated: false }, end: { value: '2028', estimated: true },
    facts: [], cover: { id: null, src: '/assets/test-cover.webp', srcset: '/assets/test-cover-640.webp 640w, /assets/test-cover-1920.webp 1920w', width: 1920, height: 1280, alt: 'Yeni cephe', label: 'Proje görseli', focalX: 30, focalY: 75 }, gallery: [], interiors: [],
    home: { card: true, hero: true, cardOrder: 0, heroOrder: 0 }, listOrder: 0, legacy: { detailPath: '', locationLabel: '' }
  };
}

test('new publications are consistent across list, full HTML detail, metadata, counts, home and sitemap', () => {
  const project = newProject();
  const documents = [...projects, project];
  const list = parse(renderPage('/projeler.html', documents));
  assert.equal(list('.prow').length, 28);
  assert.equal(list('.prow__name a').first().text(), project.name);
  assert.equal(list('[data-project-count]').text(), '28 proje');
  assert.equal(list('[data-project-filter="satista"] .n').text(), '1');
  assert.match(list('meta[name="description"]').attr('content'), /28 projesi/);
  assert.equal(list('.dindex__list a[href="/proje/yeni-test-apartmani.html"]').length, 1);
  const response = renderPage('/proje/yeni-test-apartmani.html', documents);
  assert.equal(response.status, 200);
  const detail = parse(response);
  assert.equal(detail('h1').text(), project.name);
  assert.equal(detail('title').text(), 'Yeni Test Apartmanı · Ataşehir · Gerzoğlu İnşaat');
  assert.equal(detail('link[rel="canonical"]').attr('href'), 'https://gerzoglu.com/proje/yeni-test-apartmani.html');
  assert.equal(detail('meta[property="og:image"]').attr('content'), 'https://gerzoglu.com/assets/test-cover.webp');
  assert.match(detail('.kunye__board').text(), /14\.10\.2026/);
  assert.match(detail('.kunye__board').text(), /2028 \(hedef\)/);
  assert.equal(detail('.kunye__text > p.lead').length, 2);
  assert.equal(detail('.phero__media img').attr('style'), 'object-position:30% 75%');
  assert.match(detail('.phero__media img').attr('srcset'), /1920w/);
  assert.equal(JSON.parse(detail('script[data-cms-schema]').text()).name, project.name);
  const home = parse(renderPage('/', documents));
  assert.equal(home('.pcard').length, 9);
  assert.equal(home('.hero__slide').length, 5);
  assert.equal(home('.hero__slide').first().attr('data-name'), project.name);
  assert.equal(home('.hero__count').text(), '01 / 05');
  assert.equal(home('link[rel="stylesheet"]').first().attr('href'), '/assets/css/fonts.css?v=20261007-professional');
  assert.equal(home('.stat__n[data-count="2500"]').length, 1, 'historical company figures stay editorial');
  assert.match(home('#projeler h2').text(), /28/);
  assert.match(renderPage('/sitemap.xml', documents).body, /https:\/\/gerzoglu.com\/proje\/yeni-test-apartmani.html/);
  assert.match(renderPage('/llms.txt', documents).body, /Yeni Test Apartmanı.*Satışta/);
  const shared = parse(renderPage('/iletisim.html', documents));
  assert.equal(shared('.nav__drop a[href="/projeler.html#satista"] small').text(), '1');
});

test('archived and draft pages cannot fall through to legacy static files or discovery pages', () => {
  const removed = projects[0];
  const records = projects.map((project, index) => ({ publicationState: index === 0 ? 'archived' : 'published', published: project, draft: project }));
  records.push({ publicationState: 'draft', draft: newProject(), published: null });
  assert.equal(renderPage(removed.legacy.detailPath, records).status, 404);
  assert.equal(renderPage('/proje/yeni-test-apartmani.html', records).status, 404);
  assert.equal(renderPage('/proje/unknown.html', records).status, 404);
  assert.equal(renderPage('/proje/unknown', records).status, 404);
  assert.match(parse(renderPage('/proje/unknown.html', records))('source').first().attr('srcset'), /^\/assets\//);
  const list = parse(renderPage('/projeler.html', records));
  assert.equal(list('.prow').length, 26);
  assert.equal(list(`.prow a[href="${removed.legacy.detailPath}"]`).length, 0);
  const home = parse(renderPage('/', records));
  assert.ok(!home('.hero__slide').toArray().some(node => home(node).attr('data-name') === removed.name));
  assert.ok(!renderPage('/sitemap.xml', records).body.includes(removed.legacy.detailPath));
  assert.ok(!renderPage('/llms.txt', records).body.includes(removed.legacy.detailPath));
});

test('document fields are escaped, unsafe media URLs are rejected and schema cannot break its script', () => {
  const project = newProject();
  const payload = '</script><script>alert("owned")</script><img src=x onerror=alert(1)>';
  project.name = payload;
  project.summary = payload;
  project.description = payload;
  project.facts = [{ label: payload, value: payload }];
  project.cover.src = 'javascript:alert(1)';
  project.cover.srcset = 'javascript:alert(2) 640w';
  project.cover.alt = payload;
  project.gallery = [{ ...project.cover, src: '/safe.webp', srcset: '', focalX: '50%;background:url(evil)', label: payload, caption: payload }];
  const result = renderPage(`/proje/${project.slug}.html`, [project]);
  const $ = parse(result);
  assert.equal($('h1').text(), payload);
  assert.equal($('.kunye__text > p.lead').text(), payload);
  assert.equal($('script').toArray().filter(node => $(node).text().includes('alert("owned")')).length, 0);
  assert.equal($('img[onerror]').length, 0);
  assert.equal($('.phero__media img').length, 0);
  assert.equal($('.gallery img').attr('style'), 'object-position:50% 75%');
  assert.equal(JSON.parse($('script[data-cms-schema]').text()).name, payload);
  assert.equal($('.gallery figcaption span').first().text(), payload);
  assert.doesNotMatch(result.body, /src="javascript:/);
});

test('preview renders a private draft only on its matching route with noindex, without listing it', () => {
  const draft = newProject();
  draft.cover.previewSrc = 'https://example.supabase.co/storage/v1/object/sign/drafts/private.webp?token=short-lived';
  const detail = parse(renderPage(`/proje/${draft.slug}.html`, projects, { previewDocument: draft }));
  assert.match(detail('meta[name="robots"]').attr('content'), /noindex/);
  assert.match(detail('.phero__media img').attr('src'), /short-lived/);
  assert.equal(detail('.phero__media img').attr('srcset'), undefined);
  const list = parse(renderPage('/projeler.html', projects, { previewDocument: draft }));
  assert.equal(list('.prow').length, 27);
  assert.ok(!list.text().includes(draft.name));
  assert.equal(renderPage('/proje/unrelated.html', projects, { previewDocument: draft }).status, 404);
});

test('stable list order determines navigation and published source files are reproducible', () => {
  const documents = copy(projects);
  documents[2].listOrder = 0;
  documents[0].listOrder = 500;
  const list = parse(renderPage('/projeler.html', documents));
  assert.equal(list('.prow__name a').first().attr('href'), pathFor(documents[2]));
  const detail = parse(renderPage(pathFor(documents[2]), documents));
  assert.equal(detail('.pnav a').length, 1);
  assert.equal(detail('.pnav a').attr('href'), pathFor(documents[1]));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8')), projects);
  assert.equal(renderPage('/assets/not-a-page.css', documents), null);
  assert.equal(renderPage('/admin.html', documents), null);
});

test('edited locations replace imported street labels and an empty catalogue never exposes an archived hero', () => {
  const document = copy(projects.find(project => project.slug === 'idealtepe-zeynep-azra'));
  document.district = 'Ataşehir';
  document.neighborhood = 'İçerenköy';
  const $ = parse(renderPage(pathFor(document), [document]));
  assert.equal($('.phero__in > .lead').text(), 'İçerenköy, Ataşehir · Konut');
  const home = parse(renderPage('/', []));
  assert.equal(home('.pcard').length, 0);
  assert.equal(home('.hero__slide').attr('data-name'), 'Gerzoğlu İnşaat');
  assert.ok(home('.hero__count').is('[hidden]'));
  assert.equal(home('.hero__slides img').length, 0);
});

function pathFor(project) { return `/proje/${project.slug}.html`; }
