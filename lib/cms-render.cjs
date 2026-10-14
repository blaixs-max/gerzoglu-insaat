'use strict';

const cheerio = require('cheerio');
// A literal require ensures Vercel bundles the source templates with the function.
const templates = require('../data/site-templates.json');
const importedProjects = require('../data/projects.json');
const importedBySlug = new Map(importedProjects.map(project => [project.slug, project]));
const ORIGIN = 'https://gerzoglu.com';
const STATUSES = {
  teslim: { name: 'Teslim edildi', group: 'Teslim edilen projeler', short: 'Teslim edilen' },
  devam: { name: 'Devam ediyor', group: 'Devam eden projeler', short: 'Devam eden' },
  planlanan: { name: 'Planlanan', group: 'Planlanan projeler', short: 'Planlanan' },
  satista: { name: 'Satışta', group: 'Satıştaki projeler', short: 'Satıştaki' }
};
const ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const MARKS = '<span class="marks"><i></i><i></i><i></i><i></i></span>';

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function safeUrl(value) {
  const text = String(value || '');
  if (/^\/(?!\/)/.test(text) && !/[\\\u0000-\u0020]/.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function safeSrcset(value) {
  return String(value || '').split(',').map(part => {
    const match = part.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?[wx])$/);
    const url = match && safeUrl(match[1]);
    return url ? `${url} ${match[2]}` : '';
  }).filter(Boolean).join(', ');
}
function pathFor(project) { return `/proje/${project.slug}.html`; }
function location(project) { return [project.neighborhood, project.district].filter(Boolean).join(', '); }
function legacyLocation(project) {
  const original = importedBySlug.get(project.slug);
  // Keep editorial street labels until the administrator changes the location.
  const changed = original && (original.district !== project.district || original.neighborhood !== project.neighborhood);
  return !changed && project.legacy?.locationLabel || location(project);
}
function district(project) { return [project.district, project.neighborhood].filter(Boolean).join(' / '); }
function number(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(value)) : String(value); }
function date(value) {
  if (!value?.value) return '';
  const string = String(value.value);
  if (!/^\d{4}(?:-\d{2}-\d{2})?$/.test(string)) return '';
  const parts = string.split('-');
  return (parts.length === 1 ? string : `${parts[2]}.${parts[1]}.${parts[0]}`) + (value.estimated ? ' (hedef)' : '');
}
function imageMarkup(image, options = {}) {
  if (!image) return '';
  const src = safeUrl(options.preview && image.previewSrc || image.src);
  if (!src) return '';
  const srcset = options.preview && image.previewSrc ? '' : safeSrcset(image.srcset);
  const x = Math.max(0, Math.min(100, Number.isFinite(Number(image.focalX)) ? Number(image.focalX) : 50));
  const y = Math.max(0, Math.min(100, Number.isFinite(Number(image.focalY)) ? Number(image.focalY) : 50));
  const dimension = key => Number.isInteger(Number(image[key])) && Number(image[key]) > 0 ? ` ${key}="${Number(image[key])}"` : '';
  return `<img src="${escape(src)}"${srcset ? ` srcset="${escape(srcset)}"` : ''} sizes="${escape(options.sizes || '(max-width: 760px) 100vw, 90vw')}" alt="${escape(image.alt || '')}"${dimension('width')}${dimension('height')} style="object-position:${x}% ${y}%"${options.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
function placeholder(name, hero = false) {
  return `<div class="ph${hero ? ' ph--hero' : ''}" role="img" aria-label="${escape(name)}: proje görselleri hazırlanıyor"><svg class="ph__art" width="150" height="112" viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M6 112h148M40 112V44h58v68M40 58h58M40 72h58M40 86h58M40 100h58M59 44v68M79 44v68" stroke-dasharray="3 4"/><path d="M124 112V18M116 18h40M118 112l6-8 6 8"/></svg><span class="ph__t">Proje görselleri<br>hazırlanıyor</span></div>`;
}
function status(project, inline = false) {
  return `<span class="status status--${project.status}${inline ? ' status--inline' : ''}">${escape(STATUSES[project.status].name)}</span>`;
}
function fields(project, detail = false) {
  const result = [];
  if (detail) result.push(['Proje', project.name]);
  result.push(['İlçe', district(project)]);
  if (!detail) result.push(['Bina adı', project.name]);
  if (detail) result.push(['Durum', STATUSES[project.status].name], ['Yapı türü', project.structureType]);
  if (project.constructionArea != null && project.constructionArea !== '') result.push(['İnşaat alanı', `${number(project.constructionArea)} m²`]);
  if (project.unitCount != null && project.unitCount !== '') result.push([project.unitLabel || 'Daire sayısı', number(project.unitCount)]);
  if (detail) for (const fact of project.facts || []) result.push([fact.label, fact.value]);
  result.push(['Başlangıç tarihi', date(project.start)], ['Bitiş tarihi', date(project.end)]);
  return result.filter(([label, value]) => label && value !== null && value !== undefined && String(value) !== '').map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
}
function catalogue(documents) {
  const seen = new Set();
  return (Array.isArray(documents) ? documents : []).map(value => {
    if (value?.publicationState && value.publicationState !== 'published') return null;
    return value?.publicationState ? value.published : value;
  }).filter(value => {
    if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug || '') || !STATUSES[value.status] || seen.has(value.slug)) return false;
    seen.add(value.slug);
    return true;
  }).sort((a, b) => (Number(a.listOrder ?? 999) - Number(b.listOrder ?? 999)) || a.slug.localeCompare(b.slug));
}
function absoluteLinks($, sourcePath) {
  const resolve = value => {
    if (!value || /^(?:[a-z]+:|\/|#)/i.test(value)) return value;
    const url = new URL(value, ORIGIN + sourcePath);
    return url.pathname + url.search + url.hash;
  };
  $('[href], [src], [poster]').each((_, node) => {
    for (const key of ['href', 'src', 'poster']) {
      const value = $(node).attr(key);
      if (value) $(node).attr(key, resolve(value));
    }
  });
  $('[srcset], [imagesrcset]').each((_, node) => {
    for (const key of ['srcset', 'imagesrcset']) {
      const value = $(node).attr(key);
      if (value) $(node).attr(key, value.split(',').map(part => {
        const match = part.trim().match(/^(\S+)(.*)$/);
        return match ? resolve(match[1]) + match[2] : '';
      }).join(', '));
    }
  });
}
function shared($, projects) {
  const counts = Object.fromEntries(Object.keys(STATUSES).map(key => [key, projects.filter(project => project.status === key).length]));
  $('.nav__drop').html(Object.entries(STATUSES).map(([key, value]) => `<a href="/projeler.html#${key}"><span>${value.group}</span><small>${counts[key]}</small></a>`).join(''));
  $('.mnav .sub').html(Object.entries(STATUSES).map(([key, value]) => `<a href="/projeler.html#${key}">${value.short} <small>${counts[key]}</small></a>`).join(''));
  $('.ftr h3').each((_, node) => { if ($(node).text().trim() === 'Projeler') $(node).siblings('ul').html(Object.entries(STATUSES).map(([key, value]) => `<li><a href="/projeler.html#${key}">${value.group}</a></li>`).join('')); });
  $('.chips a.chip:not(.chip--cta)').each((_, node) => {
    const item = $(node);
    const key = item.attr('data-project-filter') || String(item.attr('href') || '').split('#')[1];
    if (!STATUSES[key] && key !== 'tumu' && key !== 'tum-projeler') return;
    const count = STATUSES[key] ? counts[key] : projects.length;
    item.find('.n').remove();
    item.append(` <span class="n">${count}</span>`);
  });
  return counts;
}
function setMeta($, selector, attributes) {
  const existing = $(selector).first();
  if (existing.length) existing.attr(attributes);
  else $('<meta>').attr(attributes).appendTo('head');
}
function structured($, data) {
  $('script[data-cms-schema]').remove();
  const serialized = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  $('head').append(`<script type="application/ld+json" data-cms-schema>${serialized}</script>`);
}
function pageMetadata($, project, preview) {
  const canonical = ORIGIN + pathFor(project);
  const title = [project.name, project.district, 'Gerzoğlu İnşaat'].filter(Boolean).join(' · ');
  const description = `${project.name}${project.district ? ` (${project.district})` : ''} — ${STATUSES[project.status].name}.${project.summary ? ` ${project.summary}` : ''}`;
  const image = safeUrl(project.cover?.src);
  const absoluteImage = image ? new URL(image, ORIGIN).href : ORIGIN + '/assets/logo/gerzoglu-logo-29-silver.png';
  $('title').text(title);
  $('link[rel="canonical"]').remove();
  $('<link>').attr({ rel: 'canonical', href: canonical }).appendTo('head');
  setMeta($, 'meta[name="description"]', { name: 'description', content: description });
  setMeta($, 'meta[name="robots"]', { name: 'robots', content: preview ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large' });
  for (const [key, content] of Object.entries({ title, description, url: canonical, image: absoluteImage, 'image:alt': project.cover?.alt || project.name })) setMeta($, `meta[property="og:${key}"]`, { property: `og:${key}`, content });
  for (const [key, content] of Object.entries({ title, description, image: absoluteImage, 'image:alt': project.cover?.alt || project.name })) setMeta($, `meta[name="twitter:${key}"]`, { name: `twitter:${key}`, content });
  structured($, { '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.name, description: project.summary || description, url: canonical, image: absoluteImage, creator: { '@id': ORIGIN + '/#organization' }, about: { '@type': 'Place', name: district(project) } });
}
function galleryFigure(image, index, options = {}) {
  const markup = imageMarkup(image, options);
  if (!markup) return '';
  return `<figure${options.interior ? '' : ` class="${index === 0 ? 'g-full' : 'g-half'}"`} data-reveal="img" style="--d:${(index % 3 * 0.08).toFixed(2)}s"><div class="frame ${options.interior ? 'frame--43' : 'frame--32'}">${markup}</div>${image.caption || image.label ? `<figcaption class="caption"><span>${escape(image.caption)}</span><span>${escape(image.label)}</span></figcaption>` : ''}</figure>`;
}
function renderDetail($, project, projects, preview) {
  $('.phero__media').html(imageMarkup(project.cover, { eager: true, sizes: '100vw', preview }) || placeholder(project.name, true));
  $('.phero__in .status').replaceWith(status(project, true));
  $('.phero h1').text(project.name);
  $('.phero__in > .lead').text([legacyLocation(project), project.structureType].filter(Boolean).join(' · '));
  $('.crumbs').html(`<a href="/">Anasayfa</a><span>/</span><a href="/projeler.html">Projeler</a><span>/</span><a href="/projeler.html#${project.status}">${STATUSES[project.status].group}</a><span>/</span><span>${escape(project.name)}</span>`);
  $('.kunye__board dl').html(fields(project, true));
  $('.kunye__text .about__quote, .kunye__text > p.lead').remove();
  const paragraphs = String(project.description || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
  const message = (project.summary ? `<p class="about__quote" data-split>${escape(project.summary)}</p>` : '') + paragraphs.map(value => `<p class="lead" data-reveal>${escape(value).replace(/\n/g, '<br>')}</p>`).join('');
  $('.kunye__text > .eyebrow').after(message);
  // All project-managed imagery comes from the document, including legacy comparisons.
  $('.gallery, .ba, .rooms').each((_, node) => $(node).closest('section').remove());
  const gallery = (project.gallery || []).map((image, index) => galleryFigure(image, index, { preview })).join('');
  const interiors = (project.interiors || []).map((image, index) => galleryFigure(image, index, { preview, interior: true })).join('');
  const sections = (gallery ? `<section class="sec--tight" style="padding-top:0"><div class="wrap gallery">${gallery}</div></section>` : '') + (interiors ? `<section class="sec bg-2"><div class="wrap"><div class="sec-head"><div class="sec-head__main"><span class="eyebrow">İç mekân</span><h2 class="h2" data-split>İç mekân görselleri</h2></div></div><div class="rooms">${interiors}</div></div></section>` : '');
  const position = projects.findIndex(item => item.slug === project.slug);
  const previous = position > 0 ? projects[position - 1] : null;
  const next = position >= 0 && position + 1 < projects.length ? projects[position + 1] : null;
  const navigation = `<nav class="wrap pnav" aria-label="Diğer projeler">${previous ? `<a href="${pathFor(previous)}"><span class="label">← Önceki proje</span><b>${escape(previous.name)}</b></a>` : ''}${next ? `<a href="${pathFor(next)}"><span class="label">Sonraki proje →</span><b>${escape(next.name)}</b></a>` : ''}</nav>`;
  $('.pnav').remove();
  $('main').append(sections + navigation);
  if (preview) $('main').prepend('<aside role="status" style="padding:18px;background:#ece7d9;color:#252729;text-align:center">Önizleme — bu değişiklikler henüz yayımlanmadı.</aside>');
  pageMetadata($, project, preview);
}
function renderList($, projects) {
  $('.plist').html(projects.map((project, index) => `<article class="prow" data-project-order="${index + 1}" data-status="${project.status}" data-reveal><a class="prow__media" href="${pathFor(project)}" tabindex="-1" aria-hidden="true">${imageMarkup(project.cover, { sizes: '(max-width: 1080px) 100vw, 66vw' }) || placeholder(project.name)}${project.cover?.label ? `<span class="media-tag">${escape(project.cover.label)}</span>` : ''}${MARKS}</a><div class="prow__body"><span class="prow__order num">${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}</span>${status(project, true)}<h3 class="prow__name"><a href="${pathFor(project)}">${escape(project.name)}</a></h3><dl class="specs">${fields(project)}</dl><div class="btns"><a class="btn btn--dark" href="${pathFor(project)}">Projeyi incele ${ARROW}</a></div></div></article>`).join(''));
  $('[data-project-count]').text(`${projects.length} proje`);
  $('.project-list-empty').attr('hidden', projects.length > 0 ? '' : null);
  const groups = new Map();
  for (const project of projects) { const key = project.district || 'Diğer'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(project); }
  $('#konumlar-t').text(`Anadolu Yakası’nda ${groups.size} semtte ${projects.length} proje`);
  $('.dindex').html([...groups].map(([name, items], index) => `<div class="dindex__row" data-reveal style="--d:${(index % 4 * 0.05).toFixed(2)}s"><h3 class="dindex__name">${escape(name)}<span class="num">${String(items.length).padStart(2, '0')}</span></h3><ul class="dindex__list">${items.map(project => `<li><a href="${pathFor(project)}"><i class="dot status--${project.status}" aria-hidden="true"></i><span>${escape(project.name)}</span>${project.neighborhood ? `<small>${escape(project.neighborhood)}</small>` : ''}</a></li>`).join('')}</ul></div>`).join(''));
  $('.map-legend').html(Object.entries(STATUSES).map(([key, value]) => `<span><i class="dot status--${key}" aria-hidden="true"></i>${value.name}</span>`).join(''));
  const description = `Üsküdar’dan Tuzla’ya Gerzoğlu İnşaat’ın ${projects.length} projesi: teslim edilen, devam eden, planlanan ve satıştaki konut, ticari ve ofis projeleri.`;
  setMeta($, 'meta[name="description"]', { name: 'description', content: description });
  setMeta($, 'meta[property="og:description"]', { property: 'og:description', content: description });
  setMeta($, 'meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  structured($, { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: projects.length, itemListElement: projects.map((project, index) => ({ '@type': 'ListItem', position: index + 1, name: project.name, url: ORIGIN + pathFor(project) })) });
}
function renderHome($, projects) {
  const cards = projects.filter(project => project.home?.card).sort((a, b) => Number(a.home.cardOrder ?? 999) - Number(b.home.cardOrder ?? 999) || projects.indexOf(a) - projects.indexOf(b));
  $('#pgrid-home').html(cards.map((project, index) => `<article class="pcard${index === 0 ? ' is-wide' : ''}" data-status="${project.status}" data-reveal style="--d:${(index % 3 * 0.08).toFixed(2)}s"><a class="pcard__media" href="${pathFor(project)}" tabindex="-1" aria-hidden="true">${imageMarkup(project.cover) || placeholder(project.name)}${MARKS}${status(project)}</a><div class="pcard__body"><span class="pcard__loc">${escape(legacyLocation(project))}</span><h3 class="pcard__name"><a href="${pathFor(project)}">${escape(project.name)}</a></h3><span class="tlink pcard__more">Projeyi incele ${ARROW}</span></div></article>`).join(''));
  $('#projeler .sec-head__main h2').text(`Üsküdar’dan Tuzla’ya ${projects.length} projemiz`);
  $('#projeler a.btn').each((_, node) => { if (/Tüm projeler/.test($(node).text())) $(node).html(`Tüm projeler (${projects.length}) ${ARROW}`); });
  const heroes = projects.filter(project => project.home?.hero && safeUrl(project.cover?.src)).sort((a, b) => Number(a.home.heroOrder ?? 999) - Number(b.home.heroOrder ?? 999) || projects.indexOf(a) - projects.indexOf(b));
  $('.hero__slides').html(heroes.length ? heroes.map((project, index) => `<figure class="hero__slide${index === 0 ? ' is-active' : ''}" data-name="${escape(project.name)}" data-loc="${escape(legacyLocation(project))}" data-st="${escape(STATUSES[project.status].name)}">${imageMarkup(project.cover, { sizes: '100vw', eager: index === 0 })}</figure>`).join('') : '<figure class="hero__slide is-active" data-name="Gerzoğlu İnşaat" data-loc="İstanbul" data-st="Projelerimiz"></figure>');
  $('.hero__prog').html(heroes.map(() => '<i></i>').join(''));
  $('.hero__count').html(`<b data-hero-count>${heroes.length ? '01' : '00'}</b> / ${String(heroes.length).padStart(2, '0')}`);
  $('.hero__count, .hero__prog, .hero__nav').attr('hidden', heroes.length ? null : '');
  $('[data-hero-prev], [data-hero-next]').attr('disabled', heroes.length < 2 ? '' : null);
  $('[data-hero-name]').text(heroes[0]?.name || 'Gerzoğlu İnşaat');
  $('[data-hero-loc]').text(heroes[0] ? legacyLocation(heroes[0]) : 'İstanbul');
  $('[data-hero-st]').text(heroes[0] ? STATUSES[heroes[0].status].name : 'Projelerimiz');
  const image = heroes[0]?.cover;
  const imageUrl = image ? new URL(safeUrl(image.src), ORIGIN).href : ORIGIN + '/assets/logo/gerzoglu-logo-29-silver.png';
  for (const key of ['og', 'twitter']) {
    const attribute = key === 'og' ? 'property' : 'name';
    setMeta($, `meta[${attribute}="${key}:image"]`, { [attribute]: `${key}:image`, content: imageUrl });
    setMeta($, `meta[${attribute}="${key}:image:alt"]`, { [attribute]: `${key}:image:alt`, content: image?.alt || 'Gerzoğlu İnşaat' });
  }
  $('link[rel="preload"][as="image"]').remove();
  if (image) $('<link>').attr({ rel: 'preload', as: 'image', href: safeUrl(image.src), imagesrcset: safeSrcset(image.srcset), imagesizes: '100vw', fetchpriority: 'high' }).appendTo('head');
}
function sitemap(projects) {
  const original = cheerio.load(templates['/sitemap.xml'], { xmlMode: true });
  const staticUrls = original('url > loc').map((_, node) => original(node).text()).get().filter(url => !new URL(url).pathname.startsWith('/proje/'));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [...staticUrls, ...projects.map(project => ORIGIN + pathFor(project))].map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n';
}
function llms(projects) {
  const source = templates['/llms.txt'];
  const intro = source.split('\n## Projeler')[0];
  const plain = value => String(value || '').replace(/[\[\]<>\r\n]/g, ' ').trim();
  return intro + '\n## Projeler\n\nProje durumları ve planlanan başlangıç/bitiş tarihleri ilgili proje sayfalarında belirtilir.\n\n' + projects.map(project => `- [${plain(project.name)} · ${plain(legacyLocation(project))}](https://gerzoglu.com${pathFor(project)}) — ${STATUSES[project.status].name}`).join('\n') + '\n';
}
function renderPage(pathname, documents, options = {}) {
  let requested;
  try { requested = new URL(pathname, ORIGIN).pathname; } catch { return null; }
  const projects = catalogue(documents);
  if (requested === '/sitemap.xml') return { status: 200, contentType: 'application/xml; charset=utf-8', body: sitemap(projects) };
  if (requested === '/llms.txt') return { status: 200, contentType: 'text/plain; charset=utf-8', body: llms(projects) };
  const key = requested === '/' ? '/index.html' : requested;
  const match = requested.match(/^\/proje\/([a-z0-9-]+)\.html$/);
  let source = templates[key];
  let statusCode = 200;
  let document;
  let preview = false;
  if (match) {
    preview = Boolean(options.previewDocument && options.previewDocument.slug === match[1] && STATUSES[options.previewDocument.status]);
    document = preview ? options.previewDocument : projects.find(project => project.slug === match[1]);
    if (!document) { source = templates['/404.html']; statusCode = 404; }
    else source = source || templates['/proje/idealtepe-sahil-damla.html'];
  }
  // A missing or archived project cannot fall through to an old static HTML file.
  if (requested.startsWith('/proje/') && !match) { source = templates['/404.html']; statusCode = 404; }
  if (!source || !key.endsWith('.html') && !requested.startsWith('/proje/')) return null;
  const $ = cheerio.load(source);
  absoluteLinks($, statusCode === 404 ? '/404.html' : key);
  shared($, projects);
  if (statusCode === 404) setMeta($, 'meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
  else if (document) renderDetail($, document, projects, preview);
  else if (key === '/projeler.html') renderList($, projects);
  else if (key === '/index.html') renderHome($, projects);
  return { status: statusCode, contentType: 'text/html; charset=utf-8', body: $.html() };
}

module.exports = { renderPage };
