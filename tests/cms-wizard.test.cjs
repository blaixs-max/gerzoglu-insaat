'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const wizard = import(pathToFileURL(path.join(__dirname, '../assets/admin/project-wizard.mjs')));
const image = () => ({ src: '/assets/projeler/front.webp', width: 1920, height: 1280, kind: 'exterior', focalX: 50, focalY: 50 });
const project = overrides => ({ name: 'Yılmaz Apartmanı', district: 'Üsküdar', status: 'planlanan', listOrder: 1, constructionArea: null, unitCount: null,
  start: { value: '' }, end: { value: '' }, cover: image(), gallery: [], interiors: [], facts: [], legacy: {}, ...overrides });
const fields = errors => errors.map(error => error.field);

test('Project steps require their own fields without blocking on a later step', async () => {
  const { STEPS, validateStep, validateAll } = await wizard;
  assert.deepEqual(STEPS, ['details', 'images', 'extra']);
  const draft = project({ cover: null, facts: [{ label: 'Dükkân', value: '' }] });
  assert.deepEqual(validateStep(draft, 'details'), []);
  assert.deepEqual(fields(validateStep(draft, 'images')), ['cover']);
  assert.deepEqual(fields(validateStep(draft, 'extra')), ['facts.0.value']);
  assert.deepEqual(validateAll(draft).map(error => error.step), ['images', 'extra']);
  assert.deepEqual(fields(validateStep(project({ name: ' ', district: '', status: 'sale' }), 'details')), ['name', 'district', 'status']);
});

test('Date checks reject impossible and reversed dates while respecting year precision', async () => {
  const { validateStep } = await wizard;
  for (const value of ['2026-02-29', '2026-04-31', '2026-00-10', '1899', '2200', '14/10/2026']) {
    assert.ok(fields(validateStep(project({ start: { value } }), 'details')).includes('start.value'), value);
  }
  assert.deepEqual(validateStep(project({ start: { value: '2024-02-29' }, end: { value: '2024' } }), 'details'), []);
  assert.deepEqual(validateStep(project({ start: { value: '2026' }, end: { value: '2026-01-01' } }), 'details'), []);
  for (const [start, end] of [['2026', '2025'], ['2026-10-15', '2026-10-14']]) {
    assert.ok(fields(validateStep(project({ start: { value: start }, end: { value: end } }), 'details')).includes('end.value'));
  }
});

test('Numeric fields accept optional blanks but enforce finite counts and positive ordering', async () => {
  const { validateStep } = await wizard;
  assert.deepEqual(validateStep(project({ constructionArea: '', unitCount: undefined }), 'details'), []);
  for (const constructionArea of [-1, Infinity, NaN, true, 'abc', 1e10]) assert.ok(fields(validateStep(project({ constructionArea }), 'details')).includes('constructionArea'));
  for (const unitCount of [-1, 1.5, 1000001]) assert.ok(fields(validateStep(project({ unitCount }), 'details')).includes('unitCount'));
  for (const listOrder of [0, '', null, -1, 1.2, 1000001]) assert.ok(fields(validateStep(project({ listOrder }), 'details')).includes('listOrder'));
  assert.deepEqual(validateStep(project({ constructionArea: '2400.5', unitCount: '24', listOrder: '3' }), 'details'), []);
});

test('Cover and upload completion are required, with an explicit existing-project exception', async () => {
  const { validateStep } = await wizard;
  assert.deepEqual(fields(validateStep(project({ cover: null }), 'images')), ['cover']);
  assert.deepEqual(validateStep(project({ cover: null, legacy: { placeholder: true } }), 'images', { allowCoverless: true }), []);
  assert.deepEqual(fields(validateStep(project({ cover: null, legacy: { placeholder: true } }), 'images')), ['cover']);
  assert.deepEqual(fields(validateStep(project(), 'images', { uploading: true })), ['gallery']);
  assert.deepEqual(validateStep(project({ cover: { ...image(), previewSrc: 'https://private.example/signed?token=temporary' } }), 'images'), []);
});

test('Image validation checks persisted URLs, srcset, dimensions and focal values', async () => {
  const { validateStep } = await wizard;
  for (const src of ['javascript:alert(1)', 'http://example.com/front.jpg', '//example.com/front.jpg', '/assets/../private.jpg', '/assets\\bad.jpg', 'https://u:p@example.com/front.jpg']) {
    assert.ok(fields(validateStep(project({ cover: { ...image(), src } }), 'images')).includes('cover.src'), src);
  }
  const invalid = { ...image(), focalX: 101, focalY: -1, width: 1.5, height: 30001, srcset: '/assets/front.webp 1280x' };
  assert.deepEqual(fields(validateStep(project({ gallery: [invalid] }), 'images')), ['gallery.0.focalX', 'gallery.0.focalY', 'gallery.0.width', 'gallery.0.height', 'gallery.0.srcset']);
  assert.deepEqual(validateStep(project({ gallery: [{ ...image(), srcset: '/assets/front-640.webp 640w, /assets/front.webp 1920w' }] }), 'images'), []);
  assert.deepEqual(validateStep(project({ interiors: [{ src: '/img/mutfak-c12724cf.jpg', focalX: 999 }] }), 'images'), []);
});

test('Extra information rejects incomplete pairs and preserves empty optional rows', async () => {
  const { validateStep } = await wizard;
  assert.deepEqual(validateStep(project({ facts: [{ label: ' ', value: '' }, { label: 'Dükkân', value: '2' }] }), 'extra'), []);
  assert.deepEqual(fields(validateStep(project({ facts: [{ label: 'Dükkân', value: '' }, { label: '', value: '36' }] }), 'extra')), ['facts.0.value', 'facts.1.label']);
  assert.deepEqual(fields(validateStep(project({ facts: [{ label: 'x'.repeat(101), value: 'y'.repeat(1001) }], legacy: { locationLabel: 'x'.repeat(241) } }), 'extra')), ['facts.0.label', 'facts.0.value', 'legacy.locationLabel']);
  assert.ok(fields(validateStep(project({ facts: Array.from({ length: 31 }, () => ({ label: '', value: '' })) }), 'extra')).includes('facts'));
});

test('Step access never skips an unvalidated preceding step', async () => {
  const { canVisitStep } = await wizard;
  assert.equal(canVisitStep(0), true);
  assert.equal(canVisitStep('images'), false);
  assert.equal(canVisitStep('images', ['details']), true);
  assert.equal(canVisitStep('extra', new Set(['images'])), false);
  assert.equal(canVisitStep(2, new Set(['details', 'images'])), true);
  assert.equal(canVisitStep(3, ['details', 'images', 'extra']), false);
  assert.equal(canVisitStep('unknown', ['details', 'images', 'extra']), false);
});

test('Validation does not rewrite draft data or private previews', async () => {
  const { validateAll } = await wizard;
  const draft = project({ cover: { ...image(), previewSrc: 'https://private.example/signed' }, facts: [{ label: 'Ofis', value: '8' }] });
  const before = structuredClone(draft);
  assert.deepEqual(validateAll(draft), []);
  assert.deepEqual(draft, before);
});
