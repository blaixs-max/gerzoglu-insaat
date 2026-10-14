'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const templates = require('../data/site-templates.json');
const projects = require('../data/projects.json');
const { renderPage } = require('../lib/cms-render.cjs');

test('production build cannot let physical legacy files bypass CMS routing', async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'dist');
  execFileSync(process.execPath, [path.join(root, 'build-site.cjs')], {
    cwd: root, windowsHide: true, stdio: 'pipe', timeout: 60000,
  });

  // Vercel serves real output files before fallback rewrites. Even unchanged
  // baseline HTML here would conceal broken publishing and archive behavior.
  const managed = Object.keys(templates).filter(route => route !== '/404.html');
  assert.ok(managed.includes('/index.html'));
  assert.ok(managed.includes('/projeler.html'));
  assert.ok(managed.includes('/sitemap.xml'));
  assert.ok(managed.includes('/llms.txt'));
  for (const route of managed) {
    assert.equal(fs.existsSync(path.join(output, route.slice(1))), false,
      `${route} must resolve through the CMS function, not a physical file`);
  }
  assert.equal(fs.existsSync(path.join(output, 'proje')), false);

  for (const file of ['admin.html', '404.html', 'robots.txt', 'assets/admin/admin.js', 'assets/admin/admin.css', 'assets/vendor/supabase.mjs']) {
    assert.ok(fs.statSync(path.join(output, file)).isFile(), `${file} remains available`);
  }
  const browserClient = await import(pathToFileURL(path.join(output, 'assets/vendor/supabase.mjs')).href);
  assert.equal(typeof browserClient.createClient, 'function');

  // Removing the physical pages is safe only while all source templates are
  // packaged and the renderer can produce every existing project and index.
  assert.equal(projects.length, 27);
  for (const project of projects) {
    const route = `/proje/${project.slug}.html`;
    assert.equal(typeof templates[route], 'string', `Template bundled for ${route}`);
    const page = renderPage(route, projects);
    assert.equal(page?.status, 200, `CMS renders ${route}`);
    assert.match(page.body, /<!doctype html>/i);
  }
  for (const route of ['/', '/projeler.html', '/sitemap.xml', '/llms.txt']) {
    assert.equal(renderPage(route, projects)?.status, 200, `CMS renders ${route}`);
  }
  for (const privatePath of ['api', 'lib', 'data', 'supabase', '.cache', '.env.local']) {
    assert.equal(fs.existsSync(path.join(output, privatePath)), false, `${privatePath} stays outside public output`);
  }
});
