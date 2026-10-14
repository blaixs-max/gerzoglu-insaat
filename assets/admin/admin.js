import { STEPS, validateStep, validateAll, canVisitStep } from './project-wizard.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statuses = { teslim: 'Teslim Edildi', devam: 'Devam Eden Proje', planlanan: 'Planlanan Proje', satista: 'Satıştaki Proje' };
const publications = { draft: 'Taslak', published: 'Yayında', archived: 'Arşivde' };
const icons = {
  projects: '<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h5v12H4M8 7h3M8 11h3M8 15h3M8 19h3M17 13h1M17 17h1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M9 12h6"/>',
  external: '<path d="M14 3h7v7M21 3l-11 11M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>',
  logout: '<path d="M9 3H4v18h5M8 12h13M16 7l5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/>',
  upload: '<path d="M12 16V3M7 8l5-5 5 5M3 15v6h18v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M20 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h13l4 4v13a1 1 0 0 1-1 1Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  pencil: '<path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.projects}</svg>`;
const state = {
  config: null, client: null, session: null, user: null, projects: [], current: null, draft: null,
  dirty: false, busy: false, uploading: false, tab: 'details', view: 'projects', authMode: 'login',
  search: '', status: '', publication: '', history: [],
  validatedSteps: [], wizardSaved: false,
};

function safeImage(image) {
  const value = image?.previewSrc || image?.src || '';
  if (!value) return '';
  try {
    const url = new URL(value, location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function fmtDate(value, time = false) {
  if (!value) return 'Henüz kaydedilmedi';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date);
}
function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast${error ? ' toast--error' : ''}`;
  element.setAttribute('role', error ? 'alert' : 'status');
  element.innerHTML = `<span>${esc(message)}</span><button type="button" aria-label="Bildirimi kapat">×</button>`;
  $('button', element).addEventListener('click', () => element.remove());
  $('#toasts').append(element);
  setTimeout(() => element.remove(), error ? 14000 : 7000);
}
async function confirmAction(title, message, label = 'Devam et', danger = false) {
  const dialog = $('#confirm-dialog');
  $('#dialog-title').textContent = title;
  $('#dialog-message').textContent = message;
  $('#dialog-confirm').textContent = label;
  $('#dialog-confirm').className = `button ${danger ? 'button--danger' : 'button--primary'}`;
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.returnValue = 'cancel';
    dialog.showModal();
    $('button[value="cancel"]', dialog).focus();
  });
}
async function canLeave() {
  if (state.busy || state.uploading) { toast('Devam eden işlemin tamamlanmasını bekleyin.'); return false; }
  return !state.dirty || confirmAction('Kaydedilmemiş değişiklikler var', 'Bu sayfadan ayrılırsanız son düzenlemeleriniz kaybolacak. Ayrılmadan önce taslağı kaydedebilirsiniz.', 'Kaydetmeden ayrıl');
}
async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (!state.config?.localPreview) {
    const { data, error } = await state.client.auth.getSession();
    if (error || !data.session) throw Object.assign(new Error('Oturumunuz sona erdi. Lütfen yeniden giriş yapın.'), { status: 401 });
    state.session = data.session;
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`/api/admin${path}`, { ...options, headers, cache: 'no-store' });
  if (options.html && response.ok) return response.text();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || `İşlem tamamlanamadı (${response.status}).`), { status: response.status, code: data.error?.code, fields: data.error?.fields });
  return data;
}
function showError(error) {
  console.error('Admin operation failed:', error.code || error.status || 'network');
  if (error.status === 409 && state.current) {
    $('#editor-notice').innerHTML = `<div class="notice notice--warning">${icon('info')}<div><b>Bu proje başka bir oturumda güncellendi.</b><br>Değişiklikleriniz üzerine yazılmadı. Son sürümü açın ve düzenlemenizi yeniden uygulayın.<br><button type="button" class="text-button" data-action="reload-project">Son sürümü yeniden aç</button></div></div>`;
  } else {
    const node = $('#editor-notice');
    if (node) node.innerHTML = `<div class="notice notice--error">${icon('info')}<span>${esc(error.message)}</span></div>`;
  }
  if (error.fields && state.draft) {
    const errors = Object.entries(error.fields).map(([name, message]) => {
      const field = ['start', 'end'].includes(name) ? name + '.value' : name;
      const step = /^(cover|gallery|interiors)(\.|$)/.test(field) ? 'images' : /^(facts|legacy)(\.|$)/.test(field) ? 'extra' : 'details';
      return { field, step, message: Array.isArray(message) ? message.join(' ') : message };
    });
    showValidationErrors(errors);
  }
  toast(error.message || 'Bağlantıyı kontrol edip yeniden deneyin.', true);
}
function setBusy(busy, message = '') {
  state.busy = busy;
  app.setAttribute('aria-busy', String(busy));
  app.querySelectorAll('input, select, textarea, [data-mutation], [data-action="save"], [data-action="publish"], [data-action="preview"], [data-action="next-step"], [data-action="previous-step"], [data-action="tab"]').forEach(el => {
    if (busy || state.uploading) {
      if (!('busyWasDisabled' in el.dataset)) el.dataset.busyWasDisabled = String(el.disabled);
      el.disabled = true;
    } else if ('busyWasDisabled' in el.dataset) {
      el.disabled = el.dataset.busyWasDisabled === 'true';
      delete el.dataset.busyWasDisabled;
    }
  });
  const progress = $('#save-status');
  if (progress && busy) { progress.className = 'mini-progress'; progress.textContent = message || 'İşlem sürüyor…'; }
  updateWizardChrome();
  if (!busy) updateDirty();
}
function updateDirty() {
  const progress = $('#save-status');
  if (progress) {
    progress.className = `mini-progress${state.dirty ? ' is-dirty' : ''}`;
    progress.textContent = state.dirty ? 'Kaydedilmemiş değişiklikler' : state.current?.id ? 'Tüm değişiklikler taslağa kaydedildi' : 'Yeni proje';
  }
  document.title = `${state.dirty ? '• ' : ''}${state.draft?.name || 'Proje Yönetimi'} · Gerzoğlu İnşaat`;
}
function markDirty() {
  state.dirty = true;
  state.wizardSaved = false;
  const index = STEPS.indexOf(state.tab);
  state.validatedSteps = state.validatedSteps.filter(step => STEPS.indexOf(step) < index);
  document.querySelectorAll('.field-error').forEach(node => node.remove());
  document.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
  $('#editor-notice .wizard-errors')?.remove();
  updateDirty(); updateWizardChrome();
}
function renderLogin(message = '', error = false) {
  state.user = null;
  const recovery = state.authMode === 'recovery';
  const reset = state.authMode === 'reset';
  const configured = Boolean(state.config?.configured && state.client);
  app.removeAttribute('aria-busy');
  app.innerHTML = `<main class="login-layout" id="main">
    <section class="login-brand" aria-label="Gerzoğlu İnşaat"><img src="/assets/logo/gerzoglu-logo-29-silver.png" alt="Gerzoğlu İnşaat"><div><span class="eyebrow">Gerzoğlu İnşaat</span><h1>Projelerinizin<br>bir sonraki adımı.</h1><p>Yeni projelerinizi paylaşın, güncel bilgileri yönetin ve verdiğiniz emeği doğru biçimde sunun.</p></div><small>GERZOĞLU İNŞAAT · YETKİLİ YÖNETİM ALANI</small></section>
    <section class="login-side"><div class="login-card"><span class="eyebrow">Proje yönetimi</span><h2>${recovery ? 'Yeni şifrenizi belirleyin' : reset ? 'Şifrenizi yenileyin' : 'Hoş geldiniz'}</h2><p>${recovery ? 'Hesabınız için yeni bir şifre oluşturun.' : reset ? 'Kayıtlı e-posta adresinize şifre yenileme bağlantısı gönderelim.' : 'Projelerinizi yönetmek için yetkili hesabınızla giriş yapın.'}</p>
    ${!configured ? '<div class="notice notice--warning login-error">Yönetim panelinin güvenli bağlantısı henüz yapılandırılmadı. Kurulum tamamlandığında hesabınızla giriş yapabilirsiniz.</div>' : ''}
    ${message ? `<div class="notice ${error ? 'notice--error' : 'notice--success'} login-error" role="${error ? 'alert' : 'status'}">${esc(message)}</div>` : ''}
    <form id="auth-form" data-mode="${state.authMode}">
      ${!recovery ? '<div class="field"><label for="auth-email">E-posta adresi</label><input id="auth-email" name="email" type="email" autocomplete="username" placeholder="E-posta adresiniz" required></div>' : ''}
      ${!reset ? `<div class="field"><label for="auth-password">${recovery ? 'Yeni şifre' : 'Şifre'}</label><input id="auth-password" name="password" type="password" autocomplete="${recovery ? 'new-password' : 'current-password'}" ${recovery ? 'minlength="8"' : ''} required>${recovery ? '<small>En az 8 karakter kullanın.</small>' : ''}</div>` : ''}
      ${recovery ? '<div class="field"><label for="auth-confirm">Yeni şifre tekrar</label><input id="auth-confirm" name="confirmation" type="password" autocomplete="new-password" minlength="8" required></div>' : ''}
      <button type="submit" class="button button--primary" ${!configured ? 'disabled' : ''}>${recovery ? 'Şifremi güncelle' : reset ? 'Yenileme bağlantısı gönder' : 'Güvenli giriş yap'} ${icon('arrow')}</button>
      ${!recovery ? (state.config?.recoveryAvailable === true ? `<button class="text-button" type="button" data-action="auth-mode" data-mode="${reset ? 'login' : 'reset'}">${reset ? 'Giriş ekranına dön' : 'Şifremi unuttum'}</button>` : '<small class="field-help">Şifre yenileme e-postası henüz yapılandırılmadı.</small>') : ''}
    </form><div class="login-bottom"><span>${icon('check')} Yalnızca yetkili kullanıcılar</span><a href="/" target="_blank" rel="noopener">Siteyi görüntüle ↗</a></div></div></section>
  </main>`;
}
function shell(content, isEditor = false) {
  const archivedCount = state.projects.filter(p => p.publicationState === 'archived').length;
  app.innerHTML = `<div class="shell"><button class="mobile-overlay" type="button" aria-label="Menüyü kapat" data-action="menu"></button><aside class="sidebar" aria-label="Yönetim menüsü"><a class="brand-link" href="/" target="_blank" rel="noopener" aria-label="Gerzoğlu İnşaat sitesini aç"><img src="/assets/logo/gerzoglu-logo-29-silver.png" alt="Gerzoğlu İnşaat"></a><div class="sidebar-label">YÖNETİM PANELİ</div><nav class="side-nav"><button class="side-link ${state.view !== 'archived' ? 'is-active' : ''}" data-action="library" data-view="projects" type="button">${icon('projects')}<span>Projeler</span><span class="side-count">${state.projects.length - archivedCount}</span></button><button class="side-link ${state.view === 'archived' ? 'is-active' : ''}" data-action="library" data-view="archived" type="button">${icon('archive')}<span>Arşiv</span><span class="side-count">${archivedCount}</span></button><a class="side-link" href="/" target="_blank" rel="noopener">${icon('external')}<span>Canlı siteyi görüntüle</span></a></nav><div class="sidebar-foot">${state.config.localPreview ? '<div class="preview-badge">YEREL ÖNİZLEME</div><p class="text-small">Değişiklikler yalnızca bu bilgisayarda.</p>' : ''}<span class="account-label">Yönetici hesabı</span><span class="account-email" title="${esc(state.user?.email)}">${esc(state.user?.email || 'Yerel önizleme')}</span><button type="button" data-action="logout">${icon('logout')}${state.config.localPreview ? 'Önizlemeyi yenile' : 'Güvenli çıkış'}</button></div></aside>
    <div class="workspace"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" type="button" data-action="menu" aria-label="Yönetim menüsünü aç" aria-expanded="false">${icon('menu')}</button><span class="breadcrumb-parent">Yönetim paneli</span><span class="breadcrumb-parent">/</span><b>${isEditor ? 'Proje düzenle' : state.view === 'archived' ? 'Arşiv' : 'Projeler'}</b></div><div class="topbar-right">${state.config.localPreview ? '<span class="preview-badge">YEREL ÖNİZLEME</span>' : '<span class="live-status"><i class="live-dot"></i> Güvenli oturum</span>'}<a class="button button--small" href="/" target="_blank" rel="noopener">Siteyi görüntüle ${icon('external')}</a></div></header><main class="page" id="main" tabindex="-1">${content}</main></div></div>`;
  app.setAttribute('aria-busy', 'false');
}
function getFilteredProjects() {
  return [...state.projects].sort((a, b) => (a.draft?.listOrder ?? 999) - (b.draft?.listOrder ?? 999) || (a.draft?.name || '').localeCompare(b.draft?.name || '', 'tr')).filter(project => {
    const d = project.draft;
    const isArchive = state.view === 'archived';
    return (isArchive ? project.publicationState === 'archived' : project.publicationState !== 'archived')
      && (!state.status || d.status === state.status)
      && (!state.publication || project.publicationState === state.publication)
      && (!state.search || `${d.name} ${d.district} ${d.neighborhood || ''}`.toLocaleLowerCase('tr').includes(state.search.toLocaleLowerCase('tr')));
  });
}
function projectRows() {
  const projects = getFilteredProjects();
  if (!projects.length) return `<div class="empty-state">${icon('projects')}<h2>${state.search || state.status || state.publication ? 'Aramanıza uygun proje yok' : state.view === 'archived' ? 'Arşiviniz henüz boş' : 'İlk projenizi ekleyin'}</h2><p>${state.search || state.status || state.publication ? 'Farklı bir ad arayın veya filtreleri değiştirin.' : state.view === 'archived' ? 'Arşivlediğiniz projeleri buradan geri yükleyebilirsiniz.' : 'Proje bilgilerini ve görsellerini ekleyerek başlayın.'}</p>${state.view !== 'archived' && !state.projects.length ? `<button type="button" class="button button--primary" data-action="new">${icon('plus')} Yeni proje ekle</button>` : ''}</div>`;
  return `<table class="project-table"><thead><tr><th scope="col">Sıra</th><th scope="col" class="table-project">Proje</th><th scope="col" class="table-location">Konum</th><th scope="col" class="table-status">Proje durumu</th><th scope="col" class="table-publication">Yayın</th><th scope="col" class="table-updated">Son düzenleme</th><th scope="col" class="table-edit"><span class="visually-hidden">İşlemler</span></th></tr></thead><tbody>${projects.map(project => {
    const d = project.draft;
    const image = safeImage(d.cover);
    return `<tr><td><div class="order-controls"><button type="button" data-action="move-project" data-id="${esc(project.id)}" data-dir="-1" data-mutation aria-label="${esc(d.name)} projesini yukarı taşı" ${state.view === 'archived' || state.busy ? 'disabled' : ''}>▲</button><b>${esc(d.listOrder ?? '—')}</b><button type="button" data-action="move-project" data-id="${esc(project.id)}" data-dir="1" data-mutation aria-label="${esc(d.name)} projesini aşağı taşı" ${state.view === 'archived' || state.busy ? 'disabled' : ''}>▼</button></div></td><td><div class="project-cell">${image ? `<img class="project-thumb" src="${esc(image)}" style="object-position:${Number(d.cover?.focalX ?? 50)}% ${Number(d.cover?.focalY ?? 50)}%" alt="" loading="lazy">` : `<div class="project-thumb no-image">${icon('image')}</div>`}<div><button type="button" class="project-name" data-action="open" data-id="${esc(project.id)}">${esc(d.name)}</button><span class="project-subtitle">${esc(d.structureType || 'Konut')} · ${d.unitCount != null ? `${esc(d.unitCount)} ${esc(d.unitLabel || 'Daire').toLocaleLowerCase('tr')}` : esc(d.district)}</span></div></div></td><td class="table-location">${esc(d.district)}<div class="project-subtitle">${esc(d.neighborhood)}</div></td><td class="table-status"><span class="badge badge--${esc(d.status)}">${esc(statuses[d.status] || d.status)}</span></td><td class="table-publication"><span class="badge badge--${esc(project.publicationState)}">${esc(publications[project.publicationState])}</span>${project.hasUnpublishedChanges && project.publicationState === 'published' ? '<span class="draft-dot">● Yayınlanmamış düzenleme</span>' : ''}</td><td class="table-updated table-date">${esc(fmtDate(project.updatedAt))}</td><td class="table-edit"><div class="row-actions"><button type="button" class="button button--small" data-action="open" data-id="${esc(project.id)}">Düzenle ${icon('pencil')}</button></div></td></tr>`;
  }).join('')}</tbody></table>`;
}
function renderLibrary() {
  state.current = null; state.draft = null; state.dirty = false;
  const active = state.projects.filter(p => p.publicationState !== 'archived');
  const stats = [{ label: 'Aktif proje', n: active.length, icon: 'projects' }, { label: 'Yayında', n: active.filter(p => p.publicationState === 'published').length, icon: 'globe' }, { label: 'Taslak', n: active.filter(p => p.publicationState === 'draft').length, icon: 'pencil' }, { label: 'Yayın bekleyen düzenleme', n: active.filter(p => p.publicationState === 'published' && p.hasUnpublishedChanges).length, icon: 'clock' }];
  shell(`<div class="page-header"><div><span class="eyebrow">Proje portföyü</span><h1>${state.view === 'archived' ? 'Arşivlenen projeler' : 'Projeleriniz'}</h1><p>${state.view === 'archived' ? 'Yayından kaldırılan projeleri görüntüleyin ve geri yükleyin.' : 'Yeni projeler ekleyin, bilgileri güncelleyin ve yayınları yönetin.'}</p></div><button type="button" class="button button--primary" data-action="new">${icon('plus')} Yeni proje ekle</button></div><div class="stats-grid">${stats.map(s => `<div class="stat-card"><div class="stat-symbol">${icon(s.icon)}</div><div><b>${s.n}</b><span>${s.label}</span></div></div>`).join('')}</div><section class="panel" aria-label="Proje listesi"><div class="library-toolbar"><div class="search-field">${icon('search')}<label class="visually-hidden" for="project-search">Proje veya ilçe ara</label><input class="search-input" id="project-search" type="search" placeholder="Proje adı, ilçe veya mahalle ara…" value="${esc(state.search)}"></div><label class="visually-hidden" for="status-filter">Proje durumuna göre filtrele</label><select class="filter-select" id="status-filter"><option value="">Tüm proje durumları</option>${Object.entries(statuses).map(([key, label]) => `<option value="${key}" ${state.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select>${state.view !== 'archived' ? `<label class="visually-hidden" for="publication-filter">Yayın durumuna göre filtrele</label><select class="filter-select" id="publication-filter"><option value="">Tüm yayınlar</option><option value="published" ${state.publication === 'published' ? 'selected' : ''}>Yayında</option><option value="draft" ${state.publication === 'draft' ? 'selected' : ''}>Taslak</option></select>` : ''}</div><div class="library-caption"><span id="result-count">${getFilteredProjects().length} proje gösteriliyor</span><span class="sort-help">Gösterim sırasına göre · Küçük numara önce</span></div><div id="project-rows">${projectRows()}</div><div class="toolbar-help">${icon('info')} Taslak kaydetmek canlı sayfayı değiştirmez. “Yayımla” işlemi, yeni bilgileri ziyaretçilere açar.</div></section>`);
  updateDirty();
}
function refreshRows() {
  $('#project-rows').innerHTML = projectRows();
  $('#result-count').textContent = `${getFilteredProjects().length} proje gösteriliyor`;
}
function blankDocument() {
  return { schemaVersion: 1, slug: '', name: '', district: '', neighborhood: '', status: 'planlanan', structureType: 'Konut', description: '', summary: '', constructionArea: null, unitCount: null, unitLabel: 'Daire sayısı', start: { value: '', estimated: false }, end: { value: '', estimated: false }, facts: [], cover: null, gallery: [], interiors: [], home: { card: false, hero: false, cardOrder: 999, heroOrder: 999 }, listOrder: 999, legacy: { detailPath: '', locationLabel: '' } };
}
function field(key, label, options = {}) {
  const value = key.split('.').reduce((obj, part) => obj?.[part], state.draft);
  const id = `field-${key.replaceAll('.', '-')}`;
  const attrs = `${options.required ? 'required' : ''} ${options.disabled ? 'disabled' : ''} ${options.maxlength ? `maxlength="${options.maxlength}"` : ''} ${options.min !== undefined ? `min="${options.min}"` : ''} ${options.type === 'number' ? (key === 'constructionArea' ? 'step="any" inputmode="decimal"' : 'step="1" inputmode="numeric"') : ''}`;
  const input = options.textarea ? `<textarea id="${id}" name="${key}" data-field="${key}" rows="${options.rows || 4}" ${attrs}>${esc(value)}</textarea>` : options.select ? `<select id="${id}" name="${key}" data-field="${key}" ${attrs}>${options.select.map(item => { const [val, text] = Array.isArray(item) ? item : [item, item]; return `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(text)}</option>`; }).join('')}</select>` : `<input id="${id}" name="${key}" data-field="${key}" type="${options.type || 'text'}" value="${esc(value)}" ${attrs} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ''}>`;
  return `<div class="field ${options.wide ? 'span-2' : ''}"><label for="${id}">${esc(label)}${options.required ? ' <span class="required" aria-label="zorunlu">*</span>' : ''}</label>${input}${options.help ? `<small>${esc(options.help)}</small>` : ''}</div>`;
}
function dateField(key, label) {
  const date = state.draft[key] || { value: '', estimated: false };
  const full = date.value?.length > 4;
  return `<div class="field"><label for="field-${key}-value">${label}</label><div class="date-field"><select data-date-mode="${key}" aria-label="${label} ayrıntısı"><option value="year" ${!full ? 'selected' : ''}>Yalnızca yıl</option><option value="date" ${full ? 'selected' : ''}>Tam tarih</option></select><input id="field-${key}-value" name="${key}.value" data-field="${key}.value" type="${full ? 'date' : 'text'}" value="${esc(date.value)}" ${!full ? 'inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="Örn. 2026"' : ''}></div><label class="check date-estimated"><input type="checkbox" data-field="${key}.estimated" ${date.estimated ? 'checked' : ''}>Tahmini tarih</label><small>Bilinmiyorsa boş bırakabilirsiniz.</small></div>`;
}
function coverSection() {
  const cover = state.draft.cover;
  const src = safeImage(cover);
  return `<div class="section-heading"><div><h2>Proje kapak görseli</h2><p>Proje listesinde ve öne çıkan kartlarda kullanılır.</p></div><span class="section-number">01</span></div><div class="cover-preview ${!src ? 'cover-preview--empty' : ''}" id="cover-preview">${src ? `<img src="${esc(src)}" alt="${esc(cover.alt || state.draft.name)}" style="object-position:${Number(cover.focalX ?? 50)}% ${Number(cover.focalY ?? 50)}%">` : `${icon('image')} Galeriden bir kapak seçin`}</div>${cover ? `<div class="cover-controls"><div class="field"><label class="range-label" for="focal-x">Yatay odak <output id="focal-x-output">${cover.focalX ?? 50}%</output></label><input id="focal-x" data-focal="focalX" type="range" min="0" max="100" value="${cover.focalX ?? 50}"></div><div class="field"><label class="range-label" for="focal-y">Dikey odak <output id="focal-y-output">${cover.focalY ?? 50}%</output></label><input id="focal-y" data-focal="focalY" type="range" min="0" max="100" value="${cover.focalY ?? 50}"></div></div>` : '<p class="cover-empty-notice">Yayımlamadan önce bir kapak görseli seçin.</p>'}`;
}
// Shared sample room photos stay in the document but are not project-editing controls.
function isSampleInterior(image) {
  return !image.id && /^\/(?:assets\/responsive|img)\/(?:yatak-odasi-3b77ec12|mutfak-c12724cf|banyo-e1f62517)(?:-|\.)/.test(image.src || '');
}
function visibleMedia() { return [...state.draft.gallery.map((image, i) => ({ image, group: 'gallery', index: i })), ...state.draft.interiors.map((image, i) => ({ image, group: 'interiors', index: i }))].filter(({ image }) => !isSampleInterior(image)); }
function mediaNeighbor(group, index, direction) {
  const items = visibleMedia().filter(item => item.group === group);
  const position = items.findIndex(item => item.index === index);
  return items[position + direction]?.index;
}
function sameMedia(a, b) { return !!a && !!b && (a.id && b.id ? a.id === b.id : a.src === b.src); }
function mediaCards() {
  const media = visibleMedia();
  if (!media.length) return '<div class="empty-state"><h2>Henüz görsel eklenmedi</h2><p>Binanın kapak ve galeri fotoğraflarını yukarıdan yükleyin.</p></div>';
  return `<div class="gallery-grid">${media.map(({ image, group, index }, i) => `<article class="media-card ${sameMedia(image, state.draft.cover) ? 'is-cover' : ''}" draggable="true" data-media-group="${group}" data-media-index="${index}" aria-label="${i + 1}. görsel"><div class="media-picture"><img src="${esc(safeImage(image))}" alt="${esc(image.alt || state.draft.name)}" loading="lazy" style="object-position:${Number(image.focalX ?? 50)}% ${Number(image.focalY ?? 50)}%"><span class="media-index">${String(i + 1).padStart(2, '0')}${group === 'interiors' ? ' · İç mekân' : ''}</span>${sameMedia(image, state.draft.cover) ? '<span class="cover-tag">✓ KAPAK GÖRSELİ</span>' : ''}</div><div class="media-card-body"><div class="field"><label for="media-alt-${i}">Görsel açıklaması</label><input id="media-alt-${i}" data-media-field="alt" data-group="${group}" data-index="${index}" value="${esc(image.alt)}" maxlength="300" placeholder="Örn. Binanın ön cephesi"></div><div class="field"><label for="media-caption-${i}">Fotoğraf alt yazısı</label><input id="media-caption-${i}" data-media-field="caption" data-group="${group}" data-index="${index}" value="${esc(image.caption)}" maxlength="500" placeholder="İsteğe bağlı"></div><div class="field"><label for="media-label-${i}">Görsel başlığı</label><input id="media-label-${i}" data-media-field="label" data-group="${group}" data-index="${index}" value="${esc(image.label)}" maxlength="150" placeholder="İsteğe bağlı"></div><div class="field"><label for="media-kind-${i}">Görsel türü</label><select id="media-kind-${i}" data-media-field="kind" data-group="${group}" data-index="${index}">${[['exterior', 'Dış cephe'], ['interior', 'İç mekân'], ['plan', 'Kat planı'], ['other', 'Diğer']].map(([v, l]) => `<option value="${v}" ${(image.kind || 'exterior') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="media-card-actions"><button type="button" class="button button--small" data-action="cover" data-group="${group}" data-index="${index}" data-mutation>${sameMedia(image, state.draft.cover) ? '✓ Kapak seçildi' : 'Kapak olarak seç'}</button><button type="button" class="icon-button" data-action="move-media" data-group="${group}" data-index="${index}" data-dir="-1" aria-label="Görseli önceye taşı" data-mutation ${mediaNeighbor(group, index, -1) == null ? 'disabled' : ''}>↑</button><button type="button" class="icon-button" data-action="move-media" data-group="${group}" data-index="${index}" data-dir="1" aria-label="Görseli sonraya taşı" data-mutation ${mediaNeighbor(group, index, 1) == null ? 'disabled' : ''}>↓</button><button type="button" class="icon-button" data-action="remove-media" data-group="${group}" data-index="${index}" aria-label="Görseli projeden çıkar" data-mutation>×</button></div><div class="media-meta">${image.width && image.height ? `${esc(image.width)} × ${esc(image.height)} px` : 'Mevcut site görseli'}${image.width && image.width < 1200 ? ' · Büyük alanlarda netliği sınırlı olabilir' : ''}</div></div></article>`).join('')}</div>`;
}
function renderFacts() {
  return state.draft.facts.map((fact, i) => `<div class="fact-row"><input aria-label="${i + 1}. ek bilginin başlığı" placeholder="Örn. Dükkân" name="facts.${i}.label" data-fact-index="${i}" data-fact-field="label" value="${esc(fact.label)}" maxlength="100"><input aria-label="${i + 1}. ek bilginin değeri" placeholder="Örn. 2" name="facts.${i}.value" data-fact-index="${i}" data-fact-field="value" value="${esc(fact.value)}" maxlength="300"><button type="button" class="icon-button" data-action="remove-fact" data-index="${i}" aria-label="Ek bilgiyi kaldır">×</button></div>`).join('');
}
function renderEditor() {
  const p = state.current;
  const d = state.draft;
  const archived = p?.publicationState === 'archived';
  const published = p?.publicationState === 'published';
  shell(`<div class="page-header editor-header"><div><button type="button" class="back-link" data-action="library" data-view="${state.view}">${icon('arrow')} Projelere dön</button><span class="eyebrow">${p?.id ? 'Proje düzenle' : 'Yeni proje'}</span><div class="editor-title-row"><h1>${esc(d.name || 'Yeni proje ekle')}</h1><span class="badge badge--${esc(p?.publicationState || 'draft')}">${esc(publications[p?.publicationState || 'draft'])}</span></div><div class="editor-meta"><span>${p?.id ? `Son kayıt: ${esc(fmtDate(p.updatedAt, true))}` : 'Bilgileri doldurun ve ilk taslağınızı kaydedin.'}</span>${p?.id ? `<span>· Sürüm ${Number(p.version)}</span>` : ''}</div></div><div class="editor-actions">${editorActionButtons(archived, published)}</div></div>
    <div id="editor-notice" class="editor-notice">${archived ? '<div class="notice notice--warning">Bu proje arşivde ve ziyaretçilere kapalı. Düzenlemek için önce arşivden geri yükleyin.</div>' : published ? '<div class="notice">'+icon('info')+'<span>Yayındaki sayfanız korunur. Düzenlemelerinizi taslağa kaydedin; hazır olduğunuzda yayımlayın.</span></div>' : ''}</div>
    <div class="editor-layout"><form class="panel editor-main" id="project-form" novalidate>${wizardStepsMarkup()}<fieldset ${archived ? 'disabled' : ''} style="border:0;margin:0;padding:0;min-width:0"><legend class="visually-hidden">Proje bilgilerini düzenle</legend>
    <div class="tab-panel" id="panel-details" role="tabpanel" aria-labelledby="tab-details" ${state.tab !== 'details' ? 'hidden' : ''}><section class="form-section"><div class="section-heading"><div><h2>Temel bilgiler</h2><p>Projenizi ziyaretçilere doğru bilgilerle tanıtın.</p></div><span class="section-number">01</span></div><div class="form-grid">${field('name', 'Bina / proje adı', { required: true, wide: true, maxlength: 180, placeholder: 'Örn. Yılmaz Apartmanı' })}${field('district', 'İlçe', { required: true, maxlength: 100, placeholder: 'Örn. Maltepe' })}${field('neighborhood', 'Mahalle', { maxlength: 120, placeholder: 'Örn. Süreyya Plajı' })}${field('status', 'Proje durumu', { required: true, select: Object.entries(statuses), help: 'Her proje için yalnızca bir durum seçilir.' })}${field('structureType', 'Yapı türü', { maxlength: 100, placeholder: 'Örn. Konut, ticari yapı, villa' })}</div></section><section class="form-section"><div class="section-heading"><div><h2>Proje detayları</h2><p>Bilinmeyen bilgileri boş bırakabilirsiniz.</p></div><span class="section-number">02</span></div><div class="form-grid">${field('constructionArea', 'İnşaat alanı (m²)', { type: 'number', min: 0, placeholder: 'Örn. 2400' })}${field('unitCount', 'Bağımsız bölüm / daire sayısı', { type: 'number', min: 0, placeholder: 'Örn. 24' })}${field('unitLabel', 'Sayı bilgisinin başlığı', { maxlength: 80, help: 'Örn. Daire sayısı, Villa sayısı veya Bağımsız bölüm.' })}${field('listOrder', 'Listede gösterim sırası', { type: 'number', min: 1, required: true, help: 'Küçük numaralı projeler önce gösterilir.' })}${dateField('start', 'Başlangıç tarihi')}${dateField('end', 'Bitiş tarihi')}</div></section><section class="form-section"><div class="section-heading"><div><h2>Proje anlatımı</h2><p>Kısa özet listelerde, açıklama proje detayında kullanılır.</p></div><span class="section-number">03</span></div><div class="form-grid">${field('summary', 'Kısa özet', { textarea: true, wide: true, rows: 2, maxlength: 500 })}${field('description', 'Proje açıklaması', { textarea: true, wide: true, rows: 6, maxlength: 6000, help: 'Paragraflar arasında boş satır bırakabilirsiniz.' })}</div></section></div>
    <div class="tab-panel" id="panel-images" role="tabpanel" aria-labelledby="tab-images" ${state.tab !== 'images' ? 'hidden' : ''}><section class="form-section" id="cover-section">${coverSection()}</section><section class="form-section"><div class="section-heading"><div><h2>Proje galerisi</h2><p>Görselleri taşıyarak sıralayın; kapak görselini ayrıca seçin.</p></div><span class="section-number">02</span></div><div class="upload-zone" id="upload-zone">${icon('upload')}<b>Fotoğrafları buraya bırakın</b><p>JPEG, PNG veya WebP · En fazla 20 MB / görsel<br>Orijinal dosya korunur; uygun ekran boyutları hazırlanır.</p><label class="button button--small" for="media-files">${icon('plus')} Dosya seç</label><input type="file" id="media-files" accept="image/jpeg,image/png,image/webp" multiple ${!p?.id ? 'disabled' : ''}>${!p?.id ? '<p>Önce Proje Bilgileri adımını tamamlayın.</p>' : ''}</div><div id="upload-progress" aria-live="polite"></div><div id="media-list">${mediaCards()}</div></section></div>
    <div class="tab-panel" id="panel-extra" role="tabpanel" aria-labelledby="tab-extra" ${state.tab !== 'extra' ? 'hidden' : ''}><section class="form-section"><div class="section-heading"><div><h2>Ek proje bilgileri</h2><p>Dükkân, ofis, showroom ve diğer özel bilgileri koruyun.</p></div></div><div id="facts-list">${renderFacts()}</div><button type="button" class="button button--small" data-action="add-fact">${icon('plus')} Bilgi satırı ekle</button></section><section class="form-section"><div class="section-heading"><div><h2>Mevcut site bilgileri</h2><p>Eski projelerden aktarılan özel konum bilgisidir.</p></div></div><div class="form-grid">${field('legacy.locationLabel', 'Özel konum yazısı', { wide: true, maxlength: 200, help: 'Boş bırakılırsa mahalle ve ilçe kullanılır.' })}</div></section></div>
    </fieldset>${wizardFooter(archived)}</form>
    <aside class="editor-side" aria-label="Yayın ayarları"><section class="side-panel"><h2>${icon('globe')} Yayın durumu</h2><div class="status-info"><span>Mevcut durum</span><span class="badge badge--${esc(p?.publicationState || 'draft')}">${esc(publications[p?.publicationState || 'draft'])}</span></div><div class="mini-progress" id="save-status"></div><div class="side-divider"></div><p>${archived ? 'Bu proje şu anda yayında değil.' : published ? 'Taslağınız, siz yayımlayana kadar canlı sayfayı değiştirmez.' : 'Bu proje henüz ziyaretçilere açık değil. Bilgileri tamamlayıp yayımlayın.'}</p>${published ? `<a class="button button--small" href="/proje/${encodeURIComponent(p.published.slug)}.html" target="_blank" rel="noopener">Canlı sayfayı aç ${icon('external')}</a><div class="publication-details" style="margin-top:10px">Son yayın: ${esc(fmtDate(p.publishedAt, true))}</div>` : ''}${p?.id ? `<button class="button button--small" type="button" data-action="history">${icon('clock')} Yayın geçmişi</button>` : ''}${p?.id && p.hasUnpublishedChanges && published && !archived ? '<button class="button button--small" type="button" data-action="discard" data-mutation>Taslak düzenlemelerini geri al</button>' : ''}</section>${p?.id && !archived ? `<section class="side-panel"><h2>${icon('archive')} Projeyi arşivle</h2><p>Projeyi yayından kaldırın. Bilgileri ve yayın geçmişi saklanır; daha sonra geri yükleyebilirsiniz.</p><button class="button button--danger button--small" type="button" data-action="archive" data-mutation>Arşive taşı</button></section>` : ''}</aside></div>`, true);
  updateDirty();
  if (state.busy || state.uploading) setBusy(true);
}
function selectTab(tab, { force = false, focus = false } = {}) {
  if (!STEPS.includes(tab)) return false;
  if (!force && (state.busy || state.uploading || (state.current?.publicationState !== 'archived' && !canVisitStep(tab, state.validatedSteps)))) return false;
  state.tab = tab;
  document.querySelectorAll('.tab-panel').forEach(el => { el.hidden = el.id !== `panel-${tab}`; });
  updateWizardChrome();
  if (focus) { const panel = $(`#panel-${tab}`); panel?.setAttribute('tabindex', '-1'); panel?.focus({ preventScroll: true }); $('#project-form')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  return true;
}
function resetWizard() { state.tab = 'details'; state.validatedSteps = []; state.wizardSaved = false; }

function editorActionButtons(archived, published) {
  if (archived) return `<button class="button button--silver" type="button" data-action="restore" data-mutation>${icon('archive')} Arşivden geri yükle</button>`;
  if (!state.wizardSaved || state.dirty || state.tab !== 'extra') return '';
  return `<button class="button" type="button" data-action="preview" ${state.busy ? 'disabled' : ''}>${icon('eye')} Önizle</button><button class="button button--silver" type="button" data-action="publish" data-mutation ${state.busy ? 'disabled' : ''}>${icon('globe')} ${published ? 'Değişiklikleri yayımla' : 'Projeyi yayımla'}</button>`;
}

function wizardStepsMarkup() {
  const labels = ['Proje Bilgileri', `Görseller (${visibleMedia().length})`, 'Ek Bilgiler'];
  return `<div class="editor-tabs editor-steps" role="tablist" aria-label="Proje oluşturma adımları">${STEPS.map((step, i) => {
    const complete = state.validatedSteps.includes(step), active = state.tab === step;
    const disabled = state.busy || state.uploading || (state.current?.publicationState !== 'archived' && !canVisitStep(step, state.validatedSteps));
    return `<button type="button" class="editor-tab editor-step${complete ? ' is-complete' : ''}" id="tab-${step}" role="tab" aria-selected="${active}" aria-controls="panel-${step}" ${active ? 'aria-current="step"' : ''} tabindex="${active ? 0 : -1}" data-action="tab" data-tab="${step}" ${disabled ? 'disabled' : ''}><span class="step-number" aria-hidden="true">${complete ? '✓' : i + 1}</span><span>${labels[i]}</span></button>`;
  }).join('')}</div>`;
}

function wizardFooter(archived) {
  const index = STEPS.indexOf(state.tab), disabled = archived || state.busy || state.uploading;
  return `<div class="bottom-save wizard-footer"><div><b>Adım ${index + 1} / 3</b><small>${index === 2 ? (state.wizardSaved && !state.dirty ? 'Taslağınız hazır. Önizleyebilir ve yayımlayabilirsiniz.' : 'Son kontrolü yapın ve taslağınızı kaydedin. Ek bilgiler isteğe bağlıdır.') : 'Bu adımı tamamlayıp sonraki adıma geçin.'}</small></div><div class="wizard-footer-actions">${index > 0 ? `<button class="button" type="button" data-action="previous-step" ${disabled ? 'disabled' : ''}>${icon('arrow')} Geri</button>` : ''}${index < 2 ? `<button class="button button--primary" type="button" data-action="next-step" ${disabled ? 'disabled' : ''}>Devam et: ${index === 0 ? 'Görseller' : 'Ek Bilgiler'} <span aria-hidden="true">→</span></button>` : `<button class="button button--primary" type="button" data-action="save" ${disabled ? 'disabled' : ''}>${icon('save')} Taslağı kaydet</button>`}</div></div>`;
}

function updateWizardChrome() {
  if (!$('#project-form') || !state.draft) return;
  const archived = state.current?.publicationState === 'archived';
  const steps = $('.editor-steps');
  if (steps) {
    // Keep the focused step button in the DOM while updating progress.
    const labels = ['Proje Bilgileri', `Görseller (${visibleMedia().length})`, 'Ek Bilgiler'];
    STEPS.forEach((step, i) => {
      const button = $(`#tab-${step}`); if (!button) return;
      const active = state.tab === step, complete = state.validatedSteps.includes(step);
      button.disabled = state.busy || state.uploading || (state.current?.publicationState !== 'archived' && !canVisitStep(step, state.validatedSteps));
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.classList.toggle('is-complete', complete);
      button.innerHTML = `<span class="step-number" aria-hidden="true">${complete ? '✓' : i + 1}</span><span>${labels[i]}</span>`;
    });
  }
  const footer = $('.wizard-footer'); if (footer) footer.outerHTML = wizardFooter(archived);
  const actions = $('.editor-actions'); if (actions) actions.innerHTML = editorActionButtons(archived, state.current?.publicationState === 'published');
}

function validationOptions() { return { uploading: state.uploading, allowCoverless: !!state.current?.published && !state.current.published.cover }; }

function showValidationErrors(errors) {
  if (!errors.length) return true;
  document.querySelectorAll('.field-error').forEach(node => node.remove());
  document.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
  const first = errors[0];
  if (first.step) selectTab(first.step, { force: true });
  const notice = $('#editor-notice');
  if (notice) notice.innerHTML = `<div class="notice notice--error wizard-errors" role="alert">${icon('info')}<div><b>Devam etmeden önce kontrol edin.</b><ul>${errors.map(error => `<li>${esc(error.message)}</li>`).join('')}</ul></div></div>`;
  let firstInput;
  errors.forEach(error => {
    const parts = error.field.split('.');
    const input = document.getElementsByName(error.field)[0] || (['gallery', 'interiors'].includes(parts[0]) ? $(`[data-group="${parts[0]}"][data-index="${Number(parts[1])}"][data-media-field="${parts[2] || 'alt'}"]`) : null);
    if (input) { input.setAttribute('aria-invalid', 'true'); firstInput ||= input; }
  });
  if (firstInput) firstInput.focus();
  else { const target = first.field.startsWith('cover') || first.step === 'images' ? $('#cover-section') : notice; target?.setAttribute('tabindex','-1'); target?.focus(); }
  return false;
}

function validateCurrentStep() {
  const errors = validateStep(state.draft, state.tab, validationOptions()).map(error => ({ ...error, step: state.tab }));
  if (!showValidationErrors(errors)) return false;
  const invalid = [...$(`#panel-${state.tab}`).querySelectorAll('input,textarea,select')].find(input => !input.checkValidity());
  if (invalid) { invalid.focus(); invalid.reportValidity(); return false; }
  $('#editor-notice .wizard-errors')?.remove();
  return true;
}

async function nextWizardStep() {
  if (state.busy || state.uploading || state.current?.publicationState === 'archived' || !validateCurrentStep()) return;
  const step = state.tab, index = STEPS.indexOf(step);
  if (index >= 2) return;
  setBusy(true, 'Sonraki adım hazırlanıyor…');
  try {
    // A private working record gives signed uploads an owner. The final Save is still required.
    if (step === 'details' && !state.current?.id) {
      const data = await api('/projects', { method: 'POST', body: JSON.stringify({ draft: documentForSave() }) });
      state.current = data.project;
      const existing = state.projects.findIndex(project => project.id === data.project.id);
      if (existing < 0) state.projects.push(data.project); else state.projects[existing] = data.project;
      // Preserve unsaved form values and keep the completed wizard checkpoint pending.
      state.dirty = true;
    }
    if (!state.validatedSteps.includes(step)) state.validatedSteps.push(step);
    state.tab = STEPS[index + 1]; renderEditor();
  } catch (error) { showError(error); }
  finally { setBusy(false); }
  $(`#panel-${state.tab}`)?.setAttribute('tabindex', '-1');
  $(`#panel-${state.tab}`)?.focus({ preventScroll: true });
  $('#project-form')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function readyToSave() {
  if (state.tab !== 'extra' || !canVisitStep('extra', state.validatedSteps)) {
    toast('Önce Proje Bilgileri ve Görseller adımlarını tamamlayın. Taslağı son adımda kaydedebilirsiniz.'); return false;
  }
  return validateForm();
}

function readyForPublication() {
  if (!state.current?.id || state.tab !== 'extra' || !state.wizardSaved || state.dirty || !canVisitStep('extra', state.validatedSteps)) {
    toast('Önce üç adımı tamamlayıp son adımda taslağı kaydedin.'); return false;
  }
  return validateForm();
}

function setNested(path, value) {
  const keys = path.split('.'); let target = state.draft;
  keys.slice(0, -1).forEach(key => { target[key] ||= {}; target = target[key]; });
  target[keys.at(-1)] = value;
}
function hydrateProject(project) {
  state.current = project;
  const defaults = blankDocument();
  state.draft = { ...defaults, ...clone(project.draft), home: { ...defaults.home, ...project.draft.home }, legacy: { ...defaults.legacy, ...project.draft.legacy } };
  state.draft.gallery ||= []; state.draft.interiors ||= []; state.draft.facts ||= [];
  state.draft.start ||= { value: '', estimated: false }; state.draft.end ||= { value: '', estimated: false };
  state.dirty = false;
}
function syncProject(project) {
  const index = state.projects.findIndex(item => item.id === project.id);
  if (index >= 0) state.projects[index] = project; else state.projects.push(project);
  hydrateProject(project);
}
async function loadProjects() {
  const response = await api('/projects');
  state.projects = response.projects;
}
async function openProject(id, bypassGuard = false) {
  if (!bypassGuard && !(await canLeave())) return;
  setBusy(true, 'Proje açılıyor…');
  try {
    const response = await api(`/projects/${encodeURIComponent(id)}`);
    syncProject(response.project); state.history = response.history || [];
    resetWizard(); renderEditor(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
  } catch (error) { showError(error); }
  finally { setBusy(false); }
}
function validateForm() {
  if (!$('#project-form')) return false;
  return showValidationErrors(validateAll(state.draft, validationOptions()));
}
function documentForSave() {
  const draft = clone(state.draft);
  draft.name = draft.name.trim(); draft.district = draft.district.trim();
  draft.facts = draft.facts.filter(fact => fact.label.trim() || String(fact.value).trim());
  // previewSrc is supplied by authenticated read responses, never persisted in project JSON.
  const sanitizeImage = image => { const clean = { ...image }; delete clean.previewSrc; return clean; };
  draft.cover = draft.cover ? sanitizeImage(draft.cover) : null;
  draft.gallery = draft.gallery.map(sanitizeImage); draft.interiors = draft.interiors.map(sanitizeImage);
  return draft;
}
async function saveDraft() {
  if (!readyToSave()) return false;
  const id = state.current?.id;
  if (!id || state.dirty) {
    const data = await api(id ? `/projects/${encodeURIComponent(id)}` : '/projects', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ draft: documentForSave(), ...(id ? { expectedVersion: state.current.version } : {}) }) });
    syncProject(data.project);
  }
  state.wizardSaved = true; state.validatedSteps = [...STEPS]; state.tab = 'extra';
  renderEditor(); toast('Proje taslak olarak kaydedildi. Önizleyebilir ve hazır olduğunuzda yayımlayabilirsiniz.');
  return true;
}
async function mutation(action) {
  if (state.busy || state.uploading) return;
  if (state.current?.publicationState === 'archived' && action !== 'restore') return;
  if (action === 'save' && !readyToSave()) return;
  if (action === 'publish' && !readyForPublication()) return;
  if (action === 'publish') {
    if (!(await confirmAction(state.current?.published ? 'Değişiklikler yayımlansın mı?' : 'Proje yayımlansın mı?', 'Kapak görseli, galeri ve proje bilgileriniz ziyaretçilere açılacak. Önceki yayın sürümü geçmişte saklanır.', 'Yayımla'))) return;
  }
  if (action === 'archive' && !(await confirmAction('Proje arşive taşınsın mı?', 'Proje ziyaretçilere kapatılacak. Kaydedilmiş bilgiler ve geçmiş sürümler saklanacak.' + (state.dirty ? ' Kaydedilmemiş düzenlemeleriniz bu işlemde kaybolur.' : ''), 'Arşive taşı', true))) return;
  if (action === 'discard' && !(await confirmAction('Taslak düzenlemeleri geri alınsın mı?', 'Taslak, şu anda yayında olan sürümle değiştirilecek. Henüz yayımlamadığınız değişiklikler silinecek.', 'Düzenlemeleri geri al', true))) return;
  setBusy(true, action === 'publish' ? 'Görseller ve proje yayımlanıyor…' : 'Kaydediliyor…');
  try {
    if (action === 'save') { await saveDraft(); return; }
    const response = await api(`/projects/${encodeURIComponent(state.current.id)}/${action}`, { method: 'POST', body: JSON.stringify({ expectedVersion: state.current.version }) });
    syncProject(response.project);
    if (action === 'publish') { state.wizardSaved = true; state.validatedSteps = [...STEPS]; } else resetWizard();
    renderEditor();
    toast({ publish: 'Proje yayımlandı. Canlı sayfada birkaç saniye içinde görebilirsiniz.', archive: 'Proje arşive taşındı ve yayından kaldırıldı.', restore: 'Proje arşivden geri yüklendi. Yayın durumunu kontrol edebilirsiniz.', discard: 'Taslak, yayındaki sürüme geri alındı.' }[action]);
  } catch (error) { showError(error); }
  finally { setBusy(false); }
}
async function previewProject() {
  if (state.busy || state.uploading || !readyForPublication()) return;
  const previewWindow = window.open('about:blank', '_blank');
  if (!previewWindow) { toast('Önizleme için bu sitede açılır pencerelere izin verin.', true); return; }
  previewWindow.opener = null;
  previewWindow.document.body.textContent = 'Proje önizlemesi hazırlanıyor…';
  setBusy(true, 'Önizleme hazırlanıyor…');
  try {
    const html = await api(`/projects/${encodeURIComponent(state.current.id)}/preview`, { html: true });
    const body = html.replace(/<head([^>]*)>/i, '<head$1><base href="' + location.origin + '/"><meta name="robots" content="noindex,nofollow">');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/html' }));
    previewWindow.location.replace(url);
    setTimeout(() => URL.revokeObjectURL(url), 600000);
  } catch (error) { previewWindow.close(); showError(error); }
  finally { setBusy(false); }
}
async function uploadFiles(files) {
  if (state.busy || state.uploading || state.tab !== 'images' || !canVisitStep('images', state.validatedSteps) || !state.current?.id || state.current.publicationState === 'archived') return;
  const selected = [...files];
  if (!selected.length) return;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  const invalid = selected.find(file => !allowed.includes(file.type) || file.size > 20 * 1024 * 1024 || !file.size);
  if (invalid) { toast(`${invalid.name}: JPEG, PNG veya WebP biçiminde, en fazla 20 MB olan bir dosya seçin.`, true); return; }
  state.uploading = true; setBusy(true, 'Görseller hazırlanıyor…');
  const progress = $('#upload-progress');
  let finished = 0;
  try {
    for (const file of selected) {
      progress.innerHTML = `<div class="upload-progress"><span class="spinner"></span><span>${esc(file.name)}<br><small>${finished + 1} / ${selected.length} · Yükleniyor ve ekran boyutları hazırlanıyor</small></span><progress max="${selected.length}" value="${finished}" aria-label="Yüklenen görsel sayısı"></progress></div>`;
      const signed = await api('/media/sign', { method: 'POST', body: JSON.stringify({ projectId: state.current.id, fileName: file.name, type: file.type, size: file.size }) });
      if (state.config.localPreview && (signed.localPreviewUpload || signed.localUpload)) {
        const localUrl = new URL(signed.signedUrl, location.origin);
        if (localUrl.origin !== location.origin) throw new Error('Yerel görsel yükleme adresi geçersiz.');
        const response = await fetch(localUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!response.ok) throw new Error('Yerel dosya yüklemesi tamamlanamadı.');
      } else {
        if (!state.client) throw new Error('Görsel depolama bağlantısı hazır değil.');
        const { error } = await state.client.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (error) throw new Error('Dosya yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.');
      }
      const { media } = await api(`/media/${encodeURIComponent(signed.mediaId)}/finalize`, { method: 'POST', body: JSON.stringify({}) });
      media.alt ||= `${state.draft.name} — ${file.name.replace(/\.[^.]+$/, '').replaceAll('-', ' ')}`;
      state.draft.gallery.push(media);
      if (!state.draft.cover) state.draft.cover = clone(media);
      finished++; markDirty();
      $('#media-list').innerHTML = mediaCards(); $('#cover-section').innerHTML = coverSection();
    }
    toast(`${finished} görsel eklendi. Hazırsanız Ek Bilgiler adımına devam edin.`);
  } catch (error) { showError(error); }
  finally {
    state.uploading = false; progress.innerHTML = ''; $('#media-files').value = '';
    updateWizardChrome();
    setBusy(false);
  }
}
async function showHistory() {
  if (!state.current?.id) return;
  const dialog = $('#history-dialog');
  $('#history-list').innerHTML = '<div class="loading-panel"><span class="spinner"></span>Yayın geçmişi yükleniyor…</div>';
  dialog.showModal();
  try {
    const data = await api(`/projects/${encodeURIComponent(state.current.id)}`);
    state.history = data.history || [];
    $('#history-list').innerHTML = state.history.length ? state.history.map((item, i) => `<article class="history-row"><div><h3>${i === 0 ? 'Son yayın' : 'Önceki yayın'} · ${esc(item.document?.name || state.draft.name)}</h3><p>${esc(fmtDate(item.createdAt, true))}</p><small>${esc(statuses[item.document?.status] || '')}${item.createdBy?.email ? ` · ${esc(item.createdBy.email)}` : ''}</small></div><button class="button button--small" type="button" data-action="restore-revision" data-revision="${esc(item.id)}">Taslağa geri yükle</button></article>`).join('') : '<div class="history-empty">Bu projenin henüz bir yayın geçmişi yok.</div>';
  } catch (error) { $('#history-list').innerHTML = `<div class="notice notice--error">${esc(error.message)}</div>`; }
}
async function restoreRevision(id) {
  if (!(await confirmAction('Bu sürüm taslağa yüklensin mi?', 'Mevcut taslağınız seçtiğiniz sürümle değiştirilecek. Canlı sayfa aynı kalır; yayımlamak için ayrıca onay verirsiniz.', 'Taslağa geri yükle'))) return;
  $('#history-dialog').close(); setBusy(true);
  try {
    const response = await api(`/projects/${encodeURIComponent(state.current.id)}/restore-revision`, { method: 'POST', body: JSON.stringify({ revisionId: id, expectedVersion: state.current.version }) });
    syncProject(response.project); resetWizard(); renderEditor(); toast('Seçtiğiniz sürüm taslağa yüklendi. Kontrol ettikten sonra yayımlayabilirsiniz.');
  } catch (error) { showError(error); }
  finally { setBusy(false); }
}
async function moveProject(id, dir) {
  if (state.busy) return;
  const ordered = [...state.projects].filter(p => p.publicationState !== 'archived').sort((a, b) => (a.draft.listOrder ?? 999) - (b.draft.listOrder ?? 999) || a.draft.name.localeCompare(b.draft.name, 'tr'));
  const i = ordered.findIndex(p => p.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= ordered.length) return;
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  setBusy(true);
  try {
    const response = await api('/projects/order', { method: 'POST', body: JSON.stringify({ ids: ordered.map(p => p.id), expectedVersions: Object.fromEntries(ordered.map(p => [p.id, p.version])) }) });
    const updated = new Map(response.projects.map(p => [p.id, p]));
    state.projects = state.projects.map(p => updated.get(p.id) || p);
    refreshRows(); toast('Proje sıralaması güncellendi.');
  } catch (error) { showError(error); }
  finally { setBusy(false); }
}
async function authenticate(form) {
  const button = $('button[type=submit]', form);
  const original = button.innerHTML;
  button.disabled = true; button.innerHTML = '<span class="spinner spinner--small"></span> İşlem sürüyor…';
  const mode = form.dataset.mode;
  const email = form.elements.email?.value.trim();
  const password = form.elements.password?.value;
  try {
    if (mode === 'reset') {
      const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin.html` });
      if (error) throw new Error('Şifre yenileme e-postası gönderilemedi. Daha sonra yeniden deneyin.');
      renderLogin('Bu adres kayıtlıysa şifre yenileme bağlantısı e-posta kutunuza gönderildi.'); return;
    }
    if (mode === 'recovery') {
      if (password !== form.elements.confirmation.value) throw new Error('Girdiğiniz şifreler aynı değil.');
      const { error } = await state.client.auth.updateUser({ password });
      if (error) throw new Error('Şifre güncellenemedi. Farklı bir şifreyle yeniden deneyin.');
      state.authMode = 'login'; history.replaceState(null, '', location.pathname); toast('Şifreniz güncellendi.');
      await enterAdmin(); return;
    }
    const { data, error } = await state.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Giriş yapılamadı. E-posta adresinizi ve şifrenizi kontrol edin.');
    state.session = data.session;
    await enterAdmin();
  } catch (error) {
    renderLogin(error.status === 403 ? 'Bu hesabın yönetim paneline erişim yetkisi yok.' : error.message, true);
    if (email && $('#auth-email')) $('#auth-email').value = email;
  } finally { if (button.isConnected) { button.disabled = false; button.innerHTML = original; } }
}
async function enterAdmin() {
  const { user, isAdmin } = await api('/session');
  if (!isAdmin) throw Object.assign(new Error('Bu hesabın yönetici yetkisi yok.'), { status: 403 });
  state.user = user;
  await loadProjects(); renderLibrary();
}

document.addEventListener('submit', event => {
  if (event.target.id === 'auth-form') { event.preventDefault(); authenticate(event.target); }
  if (event.target.id === 'project-form') { event.preventDefault(); if (state.tab === 'extra') mutation('save'); else nextWizardStep(); }
});
document.addEventListener('input', event => {
  const el = event.target;
  if (el.id === 'project-search') { state.search = el.value; refreshRows(); return; }
  if (!state.draft || state.busy || state.current?.publicationState === 'archived') return;
  if (el.dataset.field) {
    const value = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
    setNested(el.dataset.field, value);
    markDirty();
  }
  if (el.dataset.focal) {
    state.draft.cover[el.dataset.focal] = Number(el.value);
    const matched = visibleMedia().find(({ image }) => sameMedia(image, state.draft.cover));
    if (matched) matched.image[el.dataset.focal] = Number(el.value);
    $('#cover-preview img').style.objectPosition = `${state.draft.cover.focalX ?? 50}% ${state.draft.cover.focalY ?? 50}%`;
    $('#focal-x-output').textContent = `${state.draft.cover.focalX ?? 50}%`; $('#focal-y-output').textContent = `${state.draft.cover.focalY ?? 50}%`;
    markDirty();
  }
  if (el.dataset.mediaField) {
    const image = state.draft[el.dataset.group][Number(el.dataset.index)];
    image[el.dataset.mediaField] = el.value;
    if (sameMedia(image, state.draft.cover)) state.draft.cover[el.dataset.mediaField] = el.value;
    markDirty();
  }
  if (el.dataset.factField) { state.draft.facts[Number(el.dataset.factIndex)][el.dataset.factField] = el.value; markDirty(); }
});
document.addEventListener('change', event => {
  const el = event.target;
  if (el.id === 'status-filter') { state.status = el.value; refreshRows(); }
  if (el.id === 'publication-filter') { state.publication = el.value; refreshRows(); }
  if (el.id === 'media-files') uploadFiles(el.files);
  if (el.dataset.dateMode) {
    const key = el.dataset.dateMode; const input = document.getElementsByName(`${key}.value`)[0];
    const full = el.value === 'date';
    const value = state.draft[key].value;
    state.draft[key].value = full ? (value.length === 10 ? value : '') : value.slice(0, 4);
    input.type = full ? 'date' : 'text'; input.value = state.draft[key].value;
    if (!full) { input.pattern = '[0-9]{4}'; input.maxLength = 4; input.inputMode = 'numeric'; input.placeholder = 'Örn. 2026'; }
    else { input.removeAttribute('pattern'); input.removeAttribute('maxlength'); }
    markDirty();
  }
  if (el.dataset.mediaField === 'kind') {
    const group = el.dataset.group; const index = Number(el.dataset.index); const image = state.draft[group][index];
    if (el.value === 'interior' && group !== 'interiors') { state.draft.gallery.splice(index, 1); state.draft.interiors.push(image); $('#media-list').innerHTML = mediaCards(); }
    if (el.value !== 'interior' && group === 'interiors') { state.draft.interiors.splice(index, 1); state.draft.gallery.push(image); $('#media-list').innerHTML = mediaCards(); }
  }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  event.preventDefault();
  if (['save', 'publish', 'archive', 'restore', 'discard'].includes(action)) { await mutation(action); return; }
  if (action === 'menu') {
    const shellElement = $('.shell'); if (!shellElement) return;
    const open = shellElement.classList.toggle('is-menu-open'); $('.mobile-menu').setAttribute('aria-expanded', String(open)); return;
  }
  if (action === 'auth-mode') { state.authMode = button.dataset.mode; renderLogin(); return; }
  if (action === 'close-history') { $('#history-dialog').close(); return; }
  if (action === 'logout') {
    if (!(await canLeave())) return;
    if (state.config.localPreview) { location.reload(); return; }
    await state.client.auth.signOut(); state.dirty = false; state.current = null; state.draft = null; state.session = null; renderLogin(); return;
  }
  if (action === 'library') {
    if (!(await canLeave())) return;
    state.view = button.dataset.view || 'projects'; state.search = ''; state.status = ''; state.publication = '';
    try { await loadProjects(); renderLibrary(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); } catch (error) { showError(error); }
    return;
  }
  if (action === 'new') {
    if (!(await canLeave())) return;
    state.current = null; state.draft = blankDocument(); state.dirty = false; resetWizard(); state.history = [];
    state.draft.listOrder = Math.max(0, ...state.projects.map(p => Number(p.draft.listOrder) || 0)) + 1;
    renderEditor(); window.scrollTo(0, 0); $('#field-name').focus(); return;
  }
  if (action === 'open') { await openProject(button.dataset.id); return; }
  if (action === 'reload-project') {
    if (await confirmAction('Son sürüm açılsın mı?', 'Bu ekrandaki kaydedilmemiş düzenlemeler kapanacak. Başka oturumda kaydedilen güncel sürüm açılacak.', 'Son sürümü aç')) await openProject(state.current.id, true);
    return;
  }
  if (action === 'move-project') { await moveProject(button.dataset.id, Number(button.dataset.dir)); return; }
  if (action === 'tab') { selectTab(button.dataset.tab); return; }
  if (action === 'next-step') { await nextWizardStep(); return; }
  if (action === 'previous-step') { selectTab(STEPS[STEPS.indexOf(state.tab) - 1], { focus: true }); return; }
  if (action === 'preview') { await previewProject(); return; }
  if (action === 'history') { await showHistory(); return; }
  if (action === 'restore-revision') { await restoreRevision(button.dataset.revision); return; }
  if (!state.draft || state.busy || state.uploading || state.current?.publicationState === 'archived') return;
  const group = button.dataset.group, index = Number(button.dataset.index);
  if (action === 'cover') { state.draft.cover = clone(state.draft[group][index]); markDirty(); $('#cover-section').innerHTML = coverSection(); $('#media-list').innerHTML = mediaCards(); }
  if (action === 'move-media') {
    const target = mediaNeighbor(group, index, Number(button.dataset.dir)), items = state.draft[group];
    if (target >= 0 && target < items.length) { [items[index], items[target]] = [items[target], items[index]]; markDirty(); $('#media-list').innerHTML = mediaCards(); }
  }
  if (action === 'remove-media') {
    if (!(await confirmAction('Görsel projeden çıkarılsın mı?', 'Görsel taslak galerinizden kaldırılacak. Mevcut canlı yayın, siz değişiklikleri yayımlayana kadar korunur.', 'Görseli çıkar', true))) return;
    const [removed] = state.draft[group].splice(index, 1);
    if (sameMedia(removed, state.draft.cover)) state.draft.cover = clone(visibleMedia()[0]?.image || null);
    markDirty(); $('#cover-section').innerHTML = coverSection(); $('#media-list').innerHTML = mediaCards(); updateWizardChrome();
  }
  if (action === 'add-fact') { state.draft.facts.push({ label: '', value: '' }); markDirty(); $('#facts-list').innerHTML = renderFacts(); $('#facts-list .fact-row:last-child input').focus(); }
  if (action === 'remove-fact') { state.draft.facts.splice(index, 1); markDirty(); $('#facts-list').innerHTML = renderFacts(); }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && state.draft) { event.preventDefault(); mutation('save'); }
  if (event.target.matches('[role=tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const tabs = [...document.querySelectorAll('[role=tab]:not(:disabled)')];
    let i = tabs.indexOf(event.target); i = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    selectTab(tabs[i].dataset.tab); tabs[i].focus();
  }
});
let draggedMedia = null;
document.addEventListener('dragstart', event => {
  const card = event.target.closest('[data-media-index]');
  if (!card || event.target.closest('input,select,button') || state.busy || state.uploading || state.current?.publicationState === 'archived') { if (card) event.preventDefault(); return; }
  draggedMedia = { group: card.dataset.mediaGroup, index: Number(card.dataset.mediaIndex) };
  event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'proje-gorseli'); card.classList.add('is-dragging');
});
document.addEventListener('dragover', event => {
  const zone = event.target.closest('#upload-zone');
  if (zone && !draggedMedia) { event.preventDefault(); zone.classList.add('is-dragover'); }
  if (draggedMedia && event.target.closest('[data-media-index]')) event.preventDefault();
});
document.addEventListener('dragleave', event => {
  const zone = event.target.closest('#upload-zone'); if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover');
});
document.addEventListener('drop', event => {
  const zone = event.target.closest('#upload-zone');
  if (zone && !draggedMedia) { event.preventDefault(); zone.classList.remove('is-dragover'); uploadFiles(event.dataTransfer.files); return; }
  const card = event.target.closest('[data-media-index]');
  if (draggedMedia && card) {
    event.preventDefault(); const target = Number(card.dataset.mediaIndex), group = card.dataset.mediaGroup;
    if (group === draggedMedia.group && target !== draggedMedia.index) { const items = state.draft[group]; const [moved] = items.splice(draggedMedia.index, 1); items.splice(target, 0, moved); markDirty(); $('#media-list').innerHTML = mediaCards(); }
  }
  draggedMedia = null;
});
document.addEventListener('dragend', () => { draggedMedia = null; document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging')); });
window.addEventListener('beforeunload', event => { if (state.dirty || state.uploading || state.busy) { event.preventDefault(); event.returnValue = ''; } });

async function init() {
  try {
    const response = await fetch('/api/admin/config', { cache: 'no-store' });
    if (!response.ok) throw new Error('Yönetim paneli bağlantısı kurulamadı. Daha sonra yeniden deneyin.');
    state.config = await response.json();
    if (state.config.localPreview) { await enterAdmin(); return; }
    if (!state.config.configured || !state.config.url || !state.config.publishableKey) { renderLogin(); return; }
    const { createClient } = await import('/assets/vendor/supabase.mjs');
    state.client = createClient(state.config.url, state.config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'gerzoglu-admin-auth' } });
    state.client.auth.onAuthStateChange((event, session) => {
      state.session = session;
      if (event === 'PASSWORD_RECOVERY') { state.authMode = 'recovery'; renderLogin(); }
      if (event === 'SIGNED_OUT' && state.user) { state.current = null; state.draft = null; state.dirty = false; renderLogin('Oturumunuz kapatıldı.'); }
    });
    const { data, error } = await state.client.auth.getSession();
    if (error) throw new Error('Oturum bilgileri okunamadı. Lütfen yeniden giriş yapın.');
    if (state.authMode === 'recovery') return;
    if (data.session) { state.session = data.session; await enterAdmin(); } else renderLogin();
  } catch (error) {
    if (!state.config) state.config = { configured: false };
    renderLogin(error.status === 403 ? 'Bu hesabın yönetim paneline erişim yetkisi yok.' : error.message, true);
  }
}
init();
