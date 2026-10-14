'use strict';

// The checked-in HTML is the migration source, never the current database state.
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

function text(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function assetUrl(value, sourcePath) {
  if (!value) return '';
  const url = new URL(value, `https://gerzoglu.com${sourcePath}`);
  return url.origin === 'https://gerzoglu.com' ? url.pathname + url.search + url.hash : url.href;
}
function slugFromHref(value) {
  const match = String(value || '').match(/(?:^|\/)proje\/([a-z0-9-]+)\.html(?:[?#].*)?$/);
  return match ? match[1] : null;
}
function numeric(value) {
  const number = Number(String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
  return value && Number.isFinite(number) ? number : null;
}
function date(value) {
  const found = String(value || '').match(/\b\d{4}(?:-\d{2}-\d{2})?\b/);
  return { value: found ? found[0] : '', estimated: /hedef|tahmin/i.test(value || '') };
}
function image($, node, sourcePath, kind = 'exterior') {
  const img = $(node);
  if (!img.length || !img.attr('src')) return null;
  const figure = img.closest('figure');
  const caption = figure.find('figcaption > span').map((_, item) => text($(item).text())).get();
  const position = (img.attr('style') || '').match(/object-position:\s*([\d.]+)%\s+([\d.]+)%/);
  return {
    id: null,
    src: assetUrl(img.attr('src'), sourcePath),
    srcset: String(img.attr('srcset') || '').split(',').map(part => {
      const match = part.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?[wx])$/);
      return match ? `${assetUrl(match[1], sourcePath)} ${match[2]}` : '';
    }).filter(Boolean).join(', '),
    width: Number(img.attr('width')) || null,
    height: Number(img.attr('height')) || null,
    alt: text(img.attr('alt')),
    caption: caption[0] || '',
    label: caption[1] || '',
    kind,
    focalX: position ? Number(position[1]) : 50,
    focalY: position ? Number(position[2]) : 50
  };
}

function importSite(root) {
  root = path.resolve(root);
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const listing = cheerio.load(read('projeler.html'));
  const home = cheerio.load(read('index.html'));
  const order = new Map();
  listing('.prow').each((index, row) => {
    const item = listing(row);
    const slug = slugFromHref(item.find('.prow__name a').attr('href'));
    if (!slug || order.has(slug)) throw new Error('Project listing has a missing or duplicate URL');
    order.set(slug, { order: Number(item.attr('data-project-order')) || index + 1, status: item.attr('data-status'), label: text(item.find('.media-tag').text()) });
  });
  const locations = new Map();
  listing('.dindex__list a').each((_, anchor) => {
    const item = listing(anchor);
    locations.set(slugFromHref(item.attr('href')), text(item.find('small').text()));
  });
  const homeCards = new Map();
  home('#pgrid-home .pcard').each((index, node) => homeCards.set(slugFromHref(home(node).find('.pcard__name a').attr('href')), index + 1));
  const heroImages = home('.hero__slide img').map((_, node) => assetUrl(home(node).attr('src'), '/index.html')).get();
  const templates = {};
  for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'admin.html').sort()) templates[`/${file}`] = read(file);
  for (const file of ['sitemap.xml', 'llms.txt']) templates[`/${file}`] = read(file);
  const projects = [];
  for (const file of fs.readdirSync(path.join(root, 'proje')).filter(file => file.endsWith('.html')).sort()) {
    const detailPath = `/proje/${file}`;
    const source = read(`proje/${file}`);
    templates[detailPath] = source;
    const $ = cheerio.load(source);
    const slug = file.slice(0, -5);
    const listed = order.get(slug);
    if (!listed) throw new Error(`Project ${slug} is absent from the public listing`);
    const facts = [];
    const values = new Map();
    $('.kunye__board dl > div').each((_, node) => values.set(text($(node).find('dt').text()), text($(node).find('dd').text())));
    const unitLabel = values.has('Daire sayısı') ? 'Daire sayısı' : values.has('Ofis sayısı') ? 'Ofis sayısı' : 'Daire sayısı';
    const known = new Set(['Proje', 'İlçe', 'Durum', 'Yapı türü', 'İnşaat alanı', unitLabel, 'Başlangıç tarihi', 'Bitiş tarihi']);
    for (const [label, value] of values) if (!known.has(label)) facts.push({ label, value });
    const districtParts = (values.get('İlçe') || '').split(/\s*\/\s*/);
    const cover = image($, $('.phero__media img').first(), detailPath);
    if (cover) cover.label = listed.label;
    const heroOrder = cover ? heroImages.indexOf(cover.src) + 1 : 0;
    const gallery = $('.gallery figure img, .ba figure img').map((_, node) => image($, node, detailPath, $(node).closest('.ba').length ? 'other' : 'exterior')).get();
    const interiors = $('.rooms figure img').map((_, node) => image($, node, detailPath, 'interior')).get();
    projects.push({
      schemaVersion: 1,
      slug,
      name: text($('.phero h1').text()),
      district: districtParts[0] || '',
      neighborhood: districtParts[1] || locations.get(slug) || '',
      status: listed.status,
      structureType: values.get('Yapı türü') || '',
      description: $('.kunye__text > p.lead').map((_, node) => text($(node).text())).get().join('\n\n'),
      summary: text($('.kunye__text .about__quote').text()),
      constructionArea: numeric(values.get('İnşaat alanı')),
      unitCount: values.has(unitLabel) ? numeric(values.get(unitLabel)) : null,
      unitLabel,
      start: date(values.get('Başlangıç tarihi')),
      end: date(values.get('Bitiş tarihi')),
      facts,
      cover,
      gallery,
      interiors,
      home: { card: homeCards.has(slug), hero: heroOrder > 0, cardOrder: homeCards.get(slug) || 999, heroOrder: heroOrder || 999 },
      listOrder: listed.order,
      legacy: { detailPath, locationLabel: text($('.phero__in > .lead').text()).split(' · ')[0] || '' }
    });
  }
  projects.sort((a, b) => a.listOrder - b.listOrder || a.slug.localeCompare(b.slug));
  if (projects.length !== order.size) throw new Error('Detail pages and project listing have different record counts');
  return { projects, templates };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const result = importSite(root);
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/projects.json'), JSON.stringify(result.projects, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'data/site-templates.json'), JSON.stringify(result.templates, null, 2) + '\n');
  console.log(`Imported ${result.projects.length} distinct project URLs and ${Object.keys(result.templates).length} public templates.`);
}

module.exports = { importSite };
