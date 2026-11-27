/* Marcha Forte — painel de admin.
   Não existe servidor: o "login" é um token do GitHub e publicar significa gravar
   data/overrides.json no repositório. Quem autoriza é o GitHub — sem permissão de
   escrita no repositório não dá para entrar nem salvar. O push dispara o deploy. */
(function () {
  'use strict';
  var A = window.MF_ADMIN || { products: [] };
  var API = 'https://api.github.com/repos/' + A.repo;
  var TKEY = 'mf_admin_token';
  var DKEY = 'mf_admin_draft_v1';
  var PAGE = 40;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fold = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var brl = function (v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var store = function (kind) { try { return window[kind]; } catch (e) { return null; } };

  var token = '';
  var published = {}; // o que está em data/overrides.json no GitHub
  var draft = {};     // alterações ainda não publicadas: id -> override completo (ou null = remover)
  var shown = PAGE;
  var editing = null;
  var byId = {};
  A.products.forEach(function (p) { byId[p.id] = p; });

  try { draft = JSON.parse(store('localStorage').getItem(DKEY) || '{}') || {}; } catch (e) { draft = {}; }
  var saveDraft = function () { try { store('localStorage').setItem(DKEY, JSON.stringify(draft)); } catch (e) { /* só nesta sessão */ } };

  /* ---------- GitHub ---------- */
  function gh(path, options) {
    options = options || {};
    return fetch(API + path, {
      method: options.method || 'GET',
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 404 && options.allow404) return null;
      if (!res.ok) { var err = new Error('GitHub respondeu ' + res.status); err.status = res.status; throw err; }
      return res.json();
    });
  }
  var b64decode = function (b64) { return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), function (c) { return c.charCodeAt(0); })); };
  var b64encode = function (text) { var bin = ''; new TextEncoder().encode(text).forEach(function (b) { bin += String.fromCharCode(b); }); return btoa(bin); };

  function loadPublished() {
    return gh('/contents/' + A.path + '?ref=' + encodeURIComponent(A.branch), { allow404: true }).then(function (file) {
      var data = {};
      if (file) { try { data = JSON.parse(b64decode(file.content)) || {}; } catch (e) { data = {}; } }
      return { data: data, sha: file ? file.sha : undefined };
    });
  }

  /* ---------- Sessão ---------- */
  function login(value, remember) {
    token = value.trim();
    return gh('').then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) { var e = new Error('sem permissão'); e.status = 403; throw e; }
      return Promise.all([loadPublished(), fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + token } }).then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; })]);
    }).then(function (res) {
      published = res[0].data;
      var ss = store('sessionStorage'); var ls = store('localStorage');
      try { if (ss) ss.setItem(TKEY, token); if (ls) { if (remember) ls.setItem(TKEY, token); else ls.removeItem(TKEY); } } catch (e) { /* ignora */ }
      $('[data-user]').textContent = res[1].login ? '@' + res[1].login : '';
      $('[data-user]').hidden = !res[1].login;
      $('[data-logout]').hidden = false;
      $('[data-view-login]').hidden = true;
      $('[data-view-app]').hidden = false;
      render();
    });
  }
  function logout() {
    token = '';
    try { store('sessionStorage').removeItem(TKEY); store('localStorage').removeItem(TKEY); } catch (e) { /* ignora */ }
    location.reload();
  }
  function loginError(err) {
    token = '';
    var el = $('[data-login-error]');
    el.textContent = err.status === 401 ? 'Token inválido ou expirado.'
      : err.status === 403 || err.status === 404 ? 'Este token não tem permissão de escrita no repositório da loja.'
      : 'Não foi possível falar com o GitHub. Confira a conexão e tente de novo.';
    el.hidden = false;
  }

  /* ---------- Estado de cada produto ---------- */
  var effective = function (id) { return Object.prototype.hasOwnProperty.call(draft, id) ? (draft[id] || {}) : (published[id] || {}); };
  var isPending = function (id) { return Object.prototype.hasOwnProperty.call(draft, id); };
  var isEdited = function (id) { var o = effective(id); return Boolean(o.title || o.price || o.description || o.hidden); };
  var pendingCount = function () { return Object.keys(draft).length; };

  /* ---------- Lista ---------- */
  function matches() {
    var q = fold($('[data-search]').value.trim()).split(/\s+/).filter(Boolean);
    var filter = $('[data-filter]').value;
    return A.products.filter(function (p) {
      var o = effective(p.id);
      if (filter === 'edited' && !isEdited(p.id)) return false;
      if (filter === 'pending' && !isPending(p.id)) return false;
      if (filter === 'hidden' && !o.hidden) return false;
      if (!q.length) return true;
      var hay = fold((o.title || '') + ' ' + p.title + ' ' + p.sku);
      return q.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  function render() {
    var list = matches();
    $('[data-count]').textContent = list.length + (list.length === 1 ? ' produto' : ' produtos');
    $('[data-list]').innerHTML = list.slice(0, shown).map(function (p) {
      var o = effective(p.id);
      var price = o.price || p.price;
      return '<div class="adm-row' + (o.hidden ? ' is-hidden' : '') + '">' +
        (p.thumb ? '<img loading="lazy" src="' + esc(p.thumb) + '" alt="">' : '<span class="adm-noimg"></span>') +
        '<div><div class="adm-row-title">' + esc(o.title || p.title) + '</div><div class="adm-row-meta"><span>ref. ' + esc(p.sku) + '</span>' +
        (p.inStock ? '' : '<span class="adm-pill">sem estoque</span>') +
        (o.hidden ? '<span class="adm-pill">oculto</span>' : '') +
        (isPending(p.id) ? '<span class="adm-pill is-pending">não publicado</span>' : isEdited(p.id) ? '<span class="adm-pill is-edited">editado</span>' : '') +
        '</div></div>' +
        '<div class="adm-row-price">' + (price ? brl(price) : '—') + (o.price && p.price && o.price !== p.price ? '<small>' + brl(p.price) + '</small>' : '') + '</div>' +
        '<button class="btn btn-dark" type="button" data-edit="' + p.id + '">Editar</button></div>';
    }).join('') || '<p class="drawer-empty">Nenhum produto encontrado.</p>';
    $('[data-more]').hidden = list.length <= shown;
    var n = pendingCount();
    $('[data-publish-bar]').hidden = !n;
    $('[data-publish-text]').textContent = n === 1 ? '1 produto com alteração não publicada' : n + ' produtos com alterações não publicadas';
  }

  /* ---------- Editor ---------- */
  var form = $('[data-edit-form]');
  var parsePrice = function (text) {
    var t = String(text).trim().replace(/[R$\s]/g, '');
    if (!t) return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    var v = Number(t);
    return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
  };
  var fmtPrice = function (v) { return v ? Number(v).toFixed(2).replace('.', ',') : ''; };

  function openEditor(id) {
    editing = byId[id];
    var o = effective(id);
    form.elements.title.value = o.title || editing.title;
    form.elements.price.value = fmtPrice(o.price || editing.price);
    form.elements.description.value = o.description || editing.description;
    form.elements.hidden.checked = Boolean(o.hidden);
    $('[data-ed-ref]').textContent = 'Referência ' + editing.sku + (editing.inStock ? '' : ' · sem estoque no fornecedor');
    $('[data-ed-price-hint]').textContent = 'Preço automático (custo do fornecedor × markup): ' + (editing.price ? brl(editing.price) : '—') +
      '. Um preço digitado aqui fica fixo, mesmo que o custo do fornecedor mude.';
    $('[data-ed-view]').href = '../produto/' + editing.slug + '.html';
    $('[data-ed-error]').hidden = true;
    toggleEditor(true);
  }
  function toggleEditor(open) {
    $('[data-editor]').hidden = !open;
    $('.modal-backdrop').hidden = !open;
    document.documentElement.classList.toggle('no-scroll', open);
    if (open) form.elements.title.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var title = f.title.value.trim().replace(/\s+/g, ' ');
    var price = parsePrice(f.price.value);
    var description = f.description.value.replace(/\r/g, '').trim();
    var problem = '';
    if (title.length < 3) problem = 'O nome do produto está vazio ou curto demais.';
    else if (Number.isNaN(price) || (price !== null && price <= 0)) problem = 'Preço inválido. Use o formato 129,90.';
    else if (price !== null && price > 100000) problem = 'Preço acima de R$ 100.000,00 — confira o valor.';
    if (problem) { var el = $('[data-ed-error]'); el.textContent = problem; el.hidden = false; return; }

    // Só guarda o que difere do valor automático; campo igual ao padrão continua automático.
    var o = {};
    if (title !== editing.title) o.title = title;
    if (price !== null && price !== editing.price) o.price = price;
    if (description && description !== editing.description.trim()) o.description = description;
    if (f.hidden.checked) o.hidden = true;

    var same = JSON.stringify(o) === JSON.stringify(published[editing.id] || {});
    if (same) delete draft[editing.id];
    else draft[editing.id] = Object.keys(o).length ? o : null;
    saveDraft();
    toggleEditor(false);
    render();
  });
  document.addEventListener('click', function (e) {
    var t = e.target;
    var edit = t.closest('[data-edit]');
    if (edit) { openEditor(Number(edit.getAttribute('data-edit'))); return; }
    if (t.closest('[data-edit-close]')) { toggleEditor(false); return; }
    var reset = t.closest('[data-reset]');
    if (reset && editing) {
      var field = reset.getAttribute('data-reset');
      form.elements[field].value = field === 'price' ? fmtPrice(editing.price) : editing[field];
      return;
    }
    if (t.closest('[data-logout]')) { logout(); return; }
    if (t.closest('[data-more]')) { shown += PAGE; render(); return; }
    if (t.closest('[data-discard]')) { draft = {}; saveDraft(); render(); toast('Alterações descartadas.'); return; }
    if (t.closest('[data-publish]')) publish();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleEditor(false); });
  $('[data-search]').addEventListener('input', function () { shown = PAGE; render(); });
  $('[data-filter]').addEventListener('change', function () { shown = PAGE; render(); });

  /* ---------- Publicar ---------- */
  var toastTimer;
  function toast(text, isError) {
    var el = $('[data-toast]');
    el.textContent = text;
    el.classList.toggle('is-error', Boolean(isError));
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, isError ? 8000 : 5000);
  }
  function publish() {
    var btn = $('[data-publish]');
    var ids = Object.keys(draft);
    if (!ids.length || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    // Relê o arquivo antes de gravar para não apagar alterações feitas por outro administrador.
    loadPublished().then(function (current) {
      var next = current.data;
      ids.forEach(function (id) { if (draft[id]) next[id] = draft[id]; else delete next[id]; });
      var sorted = {};
      Object.keys(next).sort(function (a, b) { return a - b; }).forEach(function (k) { sorted[k] = next[k]; });
      return gh('/contents/' + A.path, {
        method: 'PUT',
        body: {
          message: 'Admin: atualiza ' + ids.length + (ids.length === 1 ? ' produto' : ' produtos'),
          content: b64encode(JSON.stringify(sorted, null, 2) + '\n'),
          branch: A.branch,
          sha: current.sha,
        },
      }).then(function () { published = sorted; });
    }).then(function () {
      draft = {};
      saveDraft();
      render();
      toast('Publicado! O site é atualizado em cerca de 1 a 2 minutos.');
    }).catch(function (err) {
      toast(err.status === 401 || err.status === 403 ? 'Sem permissão para publicar. Entre de novo com um token válido.'
        : err.status === 409 ? 'Outra pessoa publicou ao mesmo tempo. Tente publicar de novo.'
        : 'Não foi possível publicar (' + (err.status || 'sem conexão') + '). Suas alterações continuam guardadas.', true);
    }).then(function () { btn.disabled = false; btn.textContent = 'Publicar alterações'; });
  }
  window.addEventListener('beforeunload', function (e) { if (token && pendingCount()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Início ---------- */
  $('[data-repo-name]').textContent = A.repo;
  var loginForm = $('[data-login-form]');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    $('[data-login-error]').hidden = true;
    var btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    login(loginForm.elements.token.value, loginForm.elements.remember.checked).catch(loginError).then(function () { btn.disabled = false; loginForm.elements.token.value = ''; });
  });
  var saved = '';
  try { saved = store('sessionStorage').getItem(TKEY) || store('localStorage').getItem(TKEY) || ''; } catch (e) { /* ignora */ }
  if (saved) {
    var remembered = false;
    try { remembered = Boolean(store('localStorage').getItem(TKEY)); } catch (e) { /* ignora */ }
    login(saved, remembered).catch(function () { token = ''; });
  }
})();
