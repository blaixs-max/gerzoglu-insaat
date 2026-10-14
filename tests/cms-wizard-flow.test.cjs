'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const sourcePath = path.join(__dirname, '../assets/admin/admin.js');
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\s*/, '')
  .replace(/\binit\(\);\s*$/, '');
const validators = import(pathToFileURL(path.join(__dirname, '../assets/admin/project-wizard.mjs')));
const copy = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
const image = () => ({ src: '/assets/projeler/front.webp', width: 1920, height: 1280, kind: 'exterior', focalX: 50, focalY: 50 });

// Test the real controller and registered events, replacing only DOM/rendering and network boundaries.
async function controller({ initialResponse } = {}) {
  const listeners = new Map(), nodes = new Map(), named = new Map();
  const calls = [], notifications = [], failures = [];
  let focus = null, renders = 0;
  function node(id, dataset = {}) {
    const attrs = new Map(), classes = new Set();
    return {
      id, dataset, disabled: false, innerHTML: '', outerHTML: '', hidden: false, children: [], value: '',
      classList: { toggle(name, force) { const on = force ?? !classes.has(name); if (on) classes.add(name); else classes.delete(name); return on; }, add(name) { classes.add(name); }, remove(name) { classes.delete(name); } },
      setAttribute(name, value) { attrs.set(name, value); }, removeAttribute(name) { attrs.delete(name); }, getAttribute(name) { return attrs.get(name); },
      querySelectorAll() { return this.children; }, focus() { focus = id; }, scrollIntoView() {},
      checkValidity() { return true; }, reportValidity() {}, remove() {},
      matches(selector) { return selector === '[role=tab]' && attrs.get('role') === 'tab'; },
      closest(selector) { return selector === '[data-action]' && this.dataset.action ? this : null; },
    };
  }
  for (const id of ['app', 'project-form', 'editor-notice', 'cover-section', 'save-status']) nodes.set(`#${id}`, node(id));
  for (const key of ['details', 'images', 'extra']) {
    nodes.set(`#panel-${key}`, node(`panel-${key}`));
    const tab = node(`tab-${key}`, { action: 'tab', tab: key }); tab.setAttribute('role', 'tab');
    nodes.set(`#tab-${key}`, tab);
  }
  for (const selector of ['.editor-steps', '.wizard-footer', '.editor-actions']) nodes.set(selector, node(selector));
  for (const name of ['name', 'district', 'status', 'listOrder', 'unitCount', 'constructionArea', 'start.value', 'end.value', 'legacy.locationLabel', 'facts.0.label', 'facts.0.value']) named.set(name, node(name));
  const document = {
    title: '',
    querySelector(selector) {
      if (selector === '#editor-notice .wizard-errors') {
        const notice = nodes.get('#editor-notice');
        return notice.innerHTML.includes('wizard-errors') ? { remove() { notice.innerHTML = ''; } } : null;
      }
      return nodes.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.tab-panel') return ['details', 'images', 'extra'].map(key => nodes.get(`#panel-${key}`));
      if (selector === '[role=tab]:not(:disabled)') return ['details', 'images', 'extra'].map(key => nodes.get(`#tab-${key}`)).filter(tab => !tab.disabled);
      if (selector === '[aria-invalid]') return [...named.values()].filter(input => input.getAttribute('aria-invalid'));
      return [];
    },
    getElementsByName(name) { return named.has(name) ? [named.get(name)] : []; },
    addEventListener(type, handler) { const handlers = listeners.get(type) || []; handlers.push(handler); listeners.set(type, handlers); },
  };
  const context = vm.createContext({
    ...await validators, document, window: { addEventListener() {}, scrollTo() {} }, location: { origin: 'https://gerzoglu.test' },
    console, URL, setTimeout, clearTimeout,
    __toast(message) { notifications.push(message); }, __error(error) { failures.push(error); }, __render() { renders++; },
    async __api(url, options = {}) {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, method: options.method || 'GET', body });
      if (initialResponse && calls.length === 1) return initialResponse({ url, options, body });
      return { project: { id: 'wizard-project', slug: 'yilmaz-apartmani', version: body?.expectedVersion ? body.expectedVersion + 1 : 1,
        publicationState: 'draft', draft: copy(body.draft), published: null, hasUnpublishedChanges: true } };
    },
  });
  vm.runInContext(`${source}\napi = __api; toast = __toast; showError = __error;
    renderEditor = function () { __render(); updateWizardChrome(); };
    globalThis.controller = { state, blankDocument, nextWizardStep, selectTab, resetWizard, mutation, markDirty,
      readyForPublication, editorActionButtons, updateWizardChrome, hydrateProject, documentForSave };`, context, { filename: sourcePath });
  const real = context.controller;
  real.state.config = { localPreview: true };
  function start(overrides = {}, existing = false) {
    real.state.draft = { ...real.blankDocument(), name: 'Yılmaz Apartmanı', district: 'Üsküdar', listOrder: 1, ...overrides };
    real.state.current = existing ? { id: 'wizard-project', version: 4, publicationState: 'draft', draft: copy(real.state.draft), published: null } : null;
    real.state.projects = real.state.current ? [real.state.current] : [];
    real.state.dirty = true; real.resetWizard(); real.updateWizardChrome();
  }
  async function dispatch(type, target, extra = {}) {
    const event = { target, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    await Promise.all((listeners.get(type) || []).map(handler => handler(event)));
    await settle();
    return event;
  }
  return { ...real, start, dispatch, calls, nodes, named, notifications, failures, get focus() { return focus; }, get renders() { return renders; } };
}

test('Next checks details and controller rejects clicking a later step directly', async () => {
  const h = await controller(); h.start({ name: '', district: '' });
  assert.equal(h.nodes.get('#tab-images').disabled, true);
  assert.equal(h.nodes.get('#tab-extra').disabled, true);
  assert.equal(h.selectTab('extra'), false);
  await h.nextWizardStep();
  assert.equal(h.state.tab, 'details'); assert.equal(h.calls.length, 0); assert.equal(h.focus, 'name');
  assert.match(h.nodes.get('#editor-notice').innerHTML, /Bina adını girin/);
  await h.dispatch('click', h.nodes.get('#tab-extra'));
  assert.equal(h.state.tab, 'details'); assert.deepEqual(copy(h.state.validatedSteps), []);
});

test('Enter validates the current early step, and Ctrl+S cannot bypass the final step', async () => {
  const h = await controller(); h.start({ name: '' });
  const submitted = await h.dispatch('submit', h.nodes.get('#project-form'));
  assert.equal(submitted.prevented, true); assert.equal(h.calls.length, 0); assert.equal(h.state.tab, 'details');
  h.state.draft.name = 'Yılmaz Apartmanı';
  const shortcut = await h.dispatch('keydown', h.named.get('name'), { ctrlKey: true, key: 's' });
  assert.equal(shortcut.prevented, true); assert.equal(h.calls.length, 0); assert.equal(h.state.wizardSaved, false);
  await h.dispatch('submit', h.nodes.get('#project-form'));
  assert.equal(h.state.tab, 'images'); assert.equal(h.calls.length, 1);
  await h.dispatch('keydown', h.named.get('name'), { metaKey: true, key: 's' });
  await h.dispatch('submit', h.nodes.get('#project-form'));
  assert.equal(h.state.tab, 'images'); assert.equal(h.calls.length, 1); assert.equal(h.state.wizardSaved, false);
});

test('First Next creates one private upload owner, keeps entered values and still requires final Save', async () => {
  const h = await controller({ initialResponse: ({ body }) => ({ project: { id: 'wizard-project', version: 1, publicationState: 'draft', published: null, draft: { ...body.draft, name: 'Sunucu kopyası' } } }) });
  h.start({ summary: 'Kullanıcının girdiği özet', cover: { ...image(), previewSrc: 'https://private.test/signed' } });
  const before = copy(h.state.draft);
  await h.nextWizardStep();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].method, 'POST'); assert.equal(h.calls[0].url, '/projects');
  assert.equal(h.calls[0].body.draft.cover.previewSrc, undefined);
  assert.deepEqual(copy(h.state.draft), before);
  assert.equal(h.state.current.publicationState, 'draft'); assert.equal(h.state.current.published, null);
  assert.equal(h.state.dirty, true); assert.equal(h.state.wizardSaved, false);
  assert.equal(h.selectTab('details'), true);
  await h.nextWizardStep();
  assert.equal(h.calls.length, 1); assert.equal(h.state.tab, 'images'); assert.equal(h.readyForPublication(), false);
});

test('Images require a cover and no pending upload before the extra step opens', async () => {
  const h = await controller(); h.start({}, true); h.state.tab = 'images'; h.state.validatedSteps = ['details'];
  await h.nextWizardStep();
  assert.equal(h.state.tab, 'images'); assert.equal(h.focus, 'cover-section'); assert.equal(h.calls.length, 0);
  h.state.draft.cover = image(); h.state.uploading = true;
  await h.nextWizardStep();
  assert.equal(h.selectTab('extra'), false);
  assert.equal(h.state.tab, 'images'); assert.equal(h.calls.length, 0);
  h.state.uploading = false;
  await h.nextWizardStep();
  assert.equal(h.state.tab, 'extra'); assert.deepEqual(copy(h.state.validatedSteps), ['details', 'images']);
  assert.equal(h.state.wizardSaved, false); assert.equal(h.calls.length, 0);
});

test('Final Save rejects incomplete extras, saves once with the version and opens publication only after success', async () => {
  const h = await controller(); h.start({ cover: image(), facts: [{ label: 'Dükkân', value: '' }] }, true);
  h.state.tab = 'extra'; h.state.validatedSteps = ['details', 'images'];
  await h.mutation('save');
  assert.equal(h.calls.length, 0); assert.equal(h.focus, 'facts.0.value'); assert.equal(h.state.wizardSaved, false);
  h.state.draft.facts[0].value = '2'; h.markDirty();
  await h.mutation('save');
  assert.equal(h.failures.length, 0); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].method, 'PUT'); assert.equal(h.calls[0].url, '/projects/wizard-project');
  assert.equal(h.calls[0].body.expectedVersion, 4); assert.equal(h.calls[0].body.draft.facts[0].value, '2');
  assert.equal(h.state.current.version, 5); assert.equal(h.state.dirty, false); assert.equal(h.state.wizardSaved, true);
  assert.equal(h.readyForPublication(), true); assert.match(h.editorActionButtons(false, false), /data-action="publish"/);
  assert.deepEqual(copy(h.state.validatedSteps), ['details', 'images', 'extra']);
  await h.mutation('save');
  assert.equal(h.calls.length, 1, 'unchanged final Save should not create another database version');
  h.state.draft.facts[0].value = '3'; h.markDirty();
  assert.equal(h.readyForPublication(), false); assert.equal(h.editorActionButtons(false, false), '');
  await h.mutation('publish');
  assert.equal(h.calls.length, 1, 'editing must not publish using the previous checkpoint');
  h.selectTab('details'); h.state.draft.name = 'Yeni ad'; h.markDirty();
  assert.deepEqual(copy(h.state.validatedSteps), []); assert.equal(h.selectTab('extra'), false);
});

test('A failed private create or final save preserves entered values and does not grant a checkpoint', async () => {
  const h = await controller({ initialResponse: () => { throw new Error('Bağlantı kesildi'); } }); h.start();
  const before = copy(h.state.draft);
  await h.nextWizardStep();
  assert.equal(h.state.current, null); assert.equal(h.state.tab, 'details'); assert.equal(h.state.busy, false);
  assert.equal(h.state.wizardSaved, false); assert.deepEqual(copy(h.state.draft), before); assert.equal(h.failures.length, 1);

  const save = await controller({ initialResponse: () => { throw Object.assign(new Error('Sürüm değişti'), { status: 409 }); } });
  save.start({ cover: image() }, true); save.state.tab = 'extra'; save.state.validatedSteps = ['details', 'images'];
  await save.mutation('save');
  assert.equal(save.state.dirty, true); assert.equal(save.state.wizardSaved, false); assert.equal(save.state.current.version, 4);
  assert.equal(save.state.busy, false); assert.equal(save.readyForPublication(), false); assert.equal(save.failures.length, 1);
});
