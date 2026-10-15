'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const cheerio = require('cheerio');

const sourcePath = path.join(__dirname, '../assets/admin/admin.js');
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\s*/, '')
  .replace(/\binit\(\);\s*$/, '');
const validators = import(pathToFileURL(path.join(__dirname, '../assets/admin/project-wizard.mjs')));
const copy = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));

// Run the real controller and registered events; replace only DOM/network boundaries.
async function controller({ read, remove } = {}) {
  const listeners = new Map(), nodes = new Map(), calls = [], notifications = [];
  let focus = null;
  function node(id, dataset = {}) {
    const handlers = new Map(), attrs = new Map();
    return {
      id, dataset, disabled: false, open: false, hidden: false, value: '', innerHTML: '', textContent: '',
      querySelectorAll() { return []; }, querySelector() { return null; },
      setAttribute(key, value) { attrs.set(key, value); }, removeAttribute(key) { attrs.delete(key); },
      addEventListener(type, handler) { const items = handlers.get(type) || []; items.push(handler); handlers.set(type, items); },
      showModal() { this.open = true; }, close() { this.open = false; for (const fn of handlers.get('close') || []) fn({}); },
      cancel() {
        const event = { prevented: false, preventDefault() { this.prevented = true; } };
        for (const fn of handlers.get('cancel') || []) fn(event);
        if (!event.prevented) this.close();
        return event;
      },
      focus() { focus = id; }, closest(selector) { return selector === '[data-action]' && this.dataset.action ? this : null; },
    };
  }
  for (const id of ['app', 'main', 'delete-dialog', 'delete-form', 'delete-project-name', 'delete-confirmation-name', 'delete-cancel', 'delete-confirm', 'delete-error']) nodes.set(`#${id}`, node(id));
  nodes.get('#delete-cancel').dataset.action = 'cancel-delete';
  const document = {
    title: '', querySelector(selector) { return nodes.get(selector) || null; }, querySelectorAll() { return []; },
    addEventListener(type, handler) { const items = listeners.get(type) || []; items.push(handler); listeners.set(type, items); },
  };
  const context = vm.createContext({
    ...await validators, document, window: { addEventListener() {}, scrollTo() {} }, location: { origin: 'https://gerzoglu.test' },
    console, URL, setTimeout, clearTimeout,
    __toast(message, error) { notifications.push({ message, error }); },
    async __api(url, options = {}) {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url, method: options.method || 'GET', body });
      if (options.method === 'DELETE') return remove ? remove({ url, body }) : { deleted: true, id: 'archive-id' };
      return { project: read ? await read() : copy(context.controller.state.projects.find(p => p.id === 'archive-id')) };
    },
  });
  vm.runInContext(`${source}\napi = __api; toast = __toast;
    globalThis.controller = { state, blankDocument, openDeleteDialog, deleteProject, cancelDelete, projectRows, editorActionButtons, resetWizard };`, context, { filename: sourcePath });
  const real = context.controller;
  real.state.config = { localPreview: true };
  const archived = { id: 'archive-id', version: 4, publicationState: 'archived', draft: { ...real.blankDocument(), name: 'İşmen Apartmanı', district: 'Kartal', listOrder: 1 } };
  const active = { id: 'active-id', version: 2, publicationState: 'published', draft: { ...real.blankDocument(), name: 'Diğer Apartmanı', district: 'Kartal', listOrder: 2 } };
  real.state.projects = [archived, active]; real.state.view = 'archived';
  async function dispatch(type, target, extra = {}) {
    const event = { target, prevented: false, preventDefault() { this.prevented = true; }, ...extra };
    await Promise.all((listeners.get(type) || []).map(fn => fn(event))); await settle();
    return event;
  }
  async function typeName(value) {
    const input = nodes.get('#delete-confirmation-name'); input.value = value;
    await dispatch('input', input);
  }
  return { ...real, nodes, calls, notifications, dispatch, typeName, archived, active, get focus() { return focus; } };
}

test('Delete is available only on archived rows/editor, with a dedicated safely labelled dialog', async () => {
  const h = await controller();
  assert.match(h.projectRows(), /data-action="delete-project"/);
  h.state.view = 'projects'; assert.doesNotMatch(h.projectRows(), /data-action="delete-project"/);
  h.state.current = h.archived;
  assert.match(h.editorActionButtons(true, false), /data-action="delete-project"/);
  assert.doesNotMatch(h.editorActionButtons(false, true), /data-action="delete-project"/);
  const $ = cheerio.load(fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8'));
  assert.equal($('#delete-dialog').attr('aria-labelledby'), 'delete-title');
  assert.equal($('#delete-form').attr('method'), undefined, 'browser navigation must not submit the destructive form');
  assert.equal($('#delete-confirm').attr('type'), 'submit'); assert.equal($('#delete-confirm').is('[disabled]'), true);
  assert.match($('#delete-description').text(), /yayın geçmişi.*kalıcı.*geri alınamaz/);
});

test('Opening uses fresh server name/version and never offers active projects or mutates content', async () => {
  const h = await controller({ read: () => ({ id: 'archive-id', version: 7, publicationState: 'archived', draft: { name: '<script>Proje</script>' } }) });
  await h.openDeleteDialog('active-id'); assert.equal(h.calls.length, 0);
  h.state.uploading = true; await h.openDeleteDialog('archive-id'); assert.equal(h.calls.length, 0);
  h.state.uploading = false; await h.openDeleteDialog('archive-id');
  assert.deepEqual(copy(h.state.deleteTarget), { id: 'archive-id', name: '<script>Proje</script>', version: 7 });
  assert.equal(h.nodes.get('#delete-project-name').textContent, '<script>Proje</script>');
  assert.equal(h.nodes.get('#delete-project-name').innerHTML, '');
  assert.equal(h.nodes.get('#delete-confirm').disabled, true); assert.equal(h.focus, 'delete-cancel');
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].method, 'GET');
  assert.equal(h.archived.version, 4, 'opening a confirmation must not replace or save the editor document');
  const restored = await controller({ read: () => ({ id: 'archive-id', version: 5, publicationState: 'published', draft: { name: 'İşmen Apartmanı' } }) });
  await restored.openDeleteDialog('archive-id');
  assert.equal(restored.state.deleteTarget, null); assert.equal(restored.nodes.get('#delete-dialog').open, false);
});

test('Exact typed name is required and successful deletion returns to archive without losing filters', async () => {
  const h = await controller(); await h.openDeleteDialog('archive-id');
  h.state.projects.push({ ...copy(h.archived), id: 'other-archive', draft: { ...copy(h.archived.draft), name: 'İşmen Diğer Apartmanı' } });
  for (const wrong of ['', 'İşmen', 'işmen Apartmanı', 'İşmen Apartmani']) {
    await h.typeName(wrong); assert.equal(h.nodes.get('#delete-confirm').disabled, true);
    await h.deleteProject(); assert.equal(h.calls.length, 1);
  }
  h.state.current = h.archived; h.state.draft = copy(h.archived.draft); h.state.dirty = true;
  h.state.search = 'İşmen'; h.state.status = 'planlanan'; h.state.publication = '';
  h.state.tab = 'extra'; h.state.validatedSteps = ['details', 'images']; h.state.wizardSaved = true;
  await h.typeName('  İşmen Apartmanı  '); assert.equal(h.nodes.get('#delete-confirm').disabled, false);
  const submitted = await h.dispatch('submit', h.nodes.get('#delete-form'));
  assert.equal(submitted.prevented, true);
  assert.deepEqual(h.calls[1], { url: '/projects/archive-id', method: 'DELETE', body: { expectedVersion: 4, confirmationName: 'İşmen Apartmanı' } });
  assert.deepEqual(copy(h.state.projects).map(p => p.id), ['active-id', 'other-archive']);
  assert.equal(h.state.current, null); assert.equal(h.state.draft, null); assert.equal(h.state.dirty, false);
  assert.equal(h.state.tab, 'details'); assert.equal(h.state.wizardSaved, false);
  assert.equal(h.state.view, 'archived'); assert.equal(h.state.search, 'İşmen'); assert.equal(h.state.status, 'planlanan');
  assert.equal(h.nodes.get('#delete-dialog').open, false); assert.equal(h.state.deleteTarget, null);
  const $ = cheerio.load(h.nodes.get('#app').innerHTML);
  assert.equal($('[data-action="delete-project"][data-id="other-archive"]').length, 1);
  assert.equal($('[data-action="delete-project"][data-id="other-archive"]').is('[disabled]'), false, 'remaining archived rows must unlock after success');
  assert.match(h.notifications.at(-1).message, /kalıcı olarak silindi/);
});

test('Cancel and Escape make no write; pending delete locks typing/cancel and prevents duplicates', async () => {
  const cancel = await controller(); await cancel.openDeleteDialog('archive-id'); await cancel.typeName('İşmen Apartmanı');
  await cancel.dispatch('click', cancel.nodes.get('#delete-cancel'));
  await cancel.deleteProject(); assert.equal(cancel.calls.length, 1); assert.equal(cancel.state.deleteTarget, null);
  const escape = await controller(); await escape.openDeleteDialog('archive-id'); await escape.typeName('İşmen Apartmanı');
  assert.equal(escape.nodes.get('#delete-dialog').cancel().prevented, false);
  await escape.deleteProject(); assert.equal(escape.calls.length, 1);

  let finish;
  const h = await controller({ remove: () => new Promise(resolve => { finish = resolve; }) });
  await h.openDeleteDialog('archive-id'); await h.typeName('İşmen Apartmanı');
  const pending = h.deleteProject(); await settle();
  assert.equal(h.state.deleting, true); assert.equal(h.nodes.get('#delete-confirmation-name').disabled, true);
  assert.equal(h.nodes.get('#delete-cancel').disabled, true); assert.equal(h.nodes.get('#delete-confirm').disabled, true);
  assert.equal(h.nodes.get('#delete-dialog').cancel().prevented, true);
  h.cancelDelete(); await h.deleteProject(); assert.equal(h.calls.filter(c => c.method === 'DELETE').length, 1);
  finish({ deleted: true, id: 'archive-id' }); await pending;
  assert.equal(h.state.busy, false); assert.equal(h.state.deleting, false);
});

test('Conflict stays in dialog with frozen consent and no false success or silent refresh', async () => {
  const h = await controller({ remove: () => { throw Object.assign(new Error('Version changed'), { status: 409 }); } });
  await h.openDeleteDialog('archive-id'); await h.typeName('İşmen Apartmanı');
  const consent = h.state.deleteTarget; await h.deleteProject();
  assert.equal(h.nodes.get('#delete-dialog').open, true); assert.equal(h.nodes.get('#delete-error').hidden, false);
  assert.match(h.nodes.get('#delete-error').textContent, /Silinmedi.*listeyi yenileyin/);
  assert.equal(h.state.deleteTarget, consent); assert.equal(h.state.deleteTarget.version, 4);
  assert.equal(h.state.projects.length, 2); assert.equal(h.state.busy, false); assert.equal(h.state.deleting, false);
  assert.equal(h.calls.filter(c => c.method === 'GET').length, 1);
  assert.equal(h.notifications.some(item => /silindi/.test(item.message)), false);
});

test('Network or inconsistent success responses preserve project and show the failure inside the dialog', async () => {
  for (const remove of [() => { throw new Error('Bağlantı kesildi'); }, () => ({ deleted: true, id: 'wrong-project' })]) {
    const h = await controller({ remove }); await h.openDeleteDialog('archive-id'); await h.typeName('İşmen Apartmanı');
    await h.deleteProject();
    assert.equal(h.nodes.get('#delete-dialog').open, true); assert.equal(h.nodes.get('#delete-error').hidden, false);
    assert.equal(h.state.projects.length, 2); assert.equal(h.state.deleteTarget.id, 'archive-id');
    assert.equal(h.notifications.some(item => /silindi/.test(item.message)), false);
  }
});
