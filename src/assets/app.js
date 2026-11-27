/* Marcha Forte — carrinho, WhatsApp, galeria e filtros do catálogo. */
(function () {
  'use strict';
  var CFG = window.MF_CFG || { wa: '', name: 'Marcha Forte', base: '' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var brl = function (v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var escapeHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fold = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  /* ---------- Carrinho ---------- */
  var KEY = 'mf_cart_v1';
  var cart = [];
  var vehicle = '';
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Array.isArray(saved.items)) cart = saved.items;
    vehicle = saved.vehicle || '';
  } catch (e) { /* sem armazenamento: o carrinho vive só nesta página */ }
  var persist = function () { try { localStorage.setItem(KEY, JSON.stringify({ items: cart, vehicle: vehicle })); } catch (e) { /* ignora */ } };

  var drawer = $('[data-cart-drawer]');
  var backdrop = $('.drawer-backdrop');
  var itemsEl = $('[data-cart-items]');
  var vehicleEl = $('[data-cart-vehicle]');

  function checkoutText() {
    var total = 0;
    var lines = cart.map(function (i) {
      total += (i.p || 0) * i.q;
      return '• ' + i.q + 'x ' + i.t + ' (ref. ' + i.sku + ')' + (i.p ? ' — ' + brl(i.p * i.q) : '');
    });
    return 'Olá! Quero fechar este pedido na ' + CFG.name + ':\n\n' + lines.join('\n') +
      (total ? '\n\nTotal das peças: ' + brl(total) : '') +
      '\n\nMeu veículo: ' + (vehicle || '(informar modelo, ano e motor)');
  }

  function renderCart() {
    var qty = cart.reduce(function (n, i) { return n + i.q; }, 0);
    $$('[data-cart-count]').forEach(function (el) { el.textContent = qty; el.hidden = !qty; });
    if (!itemsEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="drawer-empty">Seu carrinho está vazio.<br>Adicione as peças e finalize tudo em uma única conversa.</p>';
    } else {
      itemsEl.innerHTML = cart.map(function (i) {
        return '<div class="ci" data-ci="' + i.id + '">' +
          (i.img ? '<img src="' + escapeHtml(i.img) + '" alt="" width="64" height="64">' : '<span class="ci-noimg"></span>') +
          '<div class="ci-info"><a href="' + CFG.base + escapeHtml(i.url) + '">' + escapeHtml(i.t) + '</a>' +
          '<small>ref. ' + escapeHtml(i.sku) + '</small>' +
          '<div class="ci-row"><div class="qty"><button type="button" data-step="-1" aria-label="Diminuir">−</button><span>' + i.q + '</span><button type="button" data-step="1" aria-label="Aumentar">+</button></div>' +
          '<strong>' + (i.p ? brl(i.p * i.q) : 'Consultar') + '</strong></div></div>' +
          '<button type="button" class="ci-del" data-del aria-label="Remover">×</button></div>';
      }).join('');
    }
    var total = cart.reduce(function (n, i) { return n + (i.p || 0) * i.q; }, 0);
    var totalEl = $('[data-cart-total]');
    if (totalEl) totalEl.textContent = brl(total);
    var co = $('[data-cart-checkout]');
    if (co) {
      co.href = 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(checkoutText());
      co.classList.toggle('is-disabled', !cart.length);
      co.setAttribute('aria-disabled', String(!cart.length));
    }
  }

  function openCart(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    backdrop.hidden = !open;
    document.documentElement.classList.toggle('no-scroll', open);
    if (open) drawer.querySelector('[data-cart-close]').focus();
  }

  function addItem(data, btn) {
    var found = cart.filter(function (i) { return i.id === data.id; })[0];
    if (found) found.q += 1;
    else cart.push({ id: data.id, t: data.t, p: data.p, sku: data.sku, img: data.img, url: data.url, q: 1 });
    persist();
    renderCart();
    if (btn) {
      var old = btn.textContent;
      btn.textContent = 'Adicionado ✓';
      btn.classList.add('is-added');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-added'); }, 1400);
    }
    // No celular o carrinho ocupa a tela toda: em vez de abri-lo a cada peça, mostra um aviso com atalho.
    if (window.matchMedia('(max-width: 900px)').matches) toast('Peça adicionada ao carrinho');
    else openCart(true);
  }

  var toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.innerHTML = '<span></span><button type="button" data-cart-open>Ver carrinho</button>';
      document.body.appendChild(toastEl);
    }
    toastEl.firstChild.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var add = t.closest('[data-add]');
    if (add) { addItem(JSON.parse(add.getAttribute('data-add')), add); return; }
    if (t.closest('[data-cart-open]')) { openCart(true); return; }
    if (t.closest('[data-cart-close]')) { openCart(false); return; }
    var co = t.closest('[data-cart-checkout]');
    if (co && !cart.length) { e.preventDefault(); return; }
    var row = t.closest('[data-ci]');
    if (row) {
      var id = Number(row.getAttribute('data-ci'));
      var item = cart.filter(function (i) { return i.id === id; })[0];
      if (!item) return;
      if (t.closest('[data-del]')) cart = cart.filter(function (i) { return i.id !== id; });
      else if (t.closest('[data-step]')) {
        item.q += Number(t.closest('[data-step]').getAttribute('data-step'));
        if (item.q < 1) cart = cart.filter(function (i) { return i.id !== id; });
      } else return;
      persist();
      renderCart();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openCart(false); });
  if (vehicleEl) {
    vehicleEl.value = vehicle;
    vehicleEl.addEventListener('input', function () { vehicle = vehicleEl.value.trim(); persist(); renderCart(); });
  }
  renderCart();

  /* ---------- Galeria do produto ---------- */
  // As fotos ficam lado a lado num trilho com scroll-snap: no celular o cliente arrasta,
  // no desktop clica nas miniaturas.
  var track = $('[data-gallery-track]');
  var thumbs = $$('[data-gallery-thumb]');
  var counter = $('[data-gallery-count]');
  if (track && thumbs.length) {
    var current = 0;
    var markSlide = function (i) {
      if (i === current) return;
      current = i;
      thumbs.forEach(function (o, n) { o.classList.toggle('is-on', n === i); });
      if (counter) counter.textContent = (i + 1) + '/' + thumbs.length;
    };
    thumbs.forEach(function (b, i) {
      b.addEventListener('click', function () { track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); });
    });
    track.addEventListener('scroll', function () {
      markSlide(Math.max(0, Math.min(thumbs.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
    }, { passive: true });
  }


  /* ---------- Catálogo (página inicial) ---------- */
  var grid = $('[data-grid]');
  if (!grid || !window.MF_CATALOG) return;
  var CAT = window.MF_CATALOG;
  var PAGE = 24;
  var cards = {};
  $$('.card', grid).forEach(function (c) { cards[c.getAttribute('data-id')] = c; });
  var items = CAT.items.map(function (r, idx) {
    return { id: r[0], s: r[1], type: r[2], group: r[3], brands: r[4], models: r[5], price: r[6], stock: r[7], title: r[8], order: idx };
  });

  var el = {
    q: $('[data-q]'), brand: $('[data-brand]'), model: $('[data-model]'), type: $('[data-type]'), sort: $('[data-sort]'),
    clear: $('[data-clear]'), count: $('[data-count]'), empty: $('[data-empty]'), more: $('[data-more]'),
    fBrand: $('[data-f-brand]'), fModel: $('[data-f-model]'), fType: $('[data-f-type]'), finder: $('[data-finder]'),
  };
  var state = { q: '', brand: '', model: '', type: '', sort: '', shown: PAGE };

  function fillModels(select, brand, value) {
    var list = (brand && CAT.models[brand]) || [];
    select.innerHTML = '<option value="">Todos os modelos</option>' + list.map(function (m) {
      return '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>';
    }).join('');
    select.disabled = !list.length;
    select.value = list.indexOf(value) >= 0 ? value : '';
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.brand = p.get('marca') || '';
    state.model = p.get('modelo') || '';
    state.type = p.get('tipo') || (p.get('grupo') ? 'g:' + p.get('grupo') : '');
    state.sort = p.get('ordem') || '';
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.brand) p.set('marca', state.brand);
    if (state.model) p.set('modelo', state.model);
    if (state.type) { if (state.type.indexOf('g:') === 0) p.set('grupo', state.type.slice(2)); else p.set('tipo', state.type); }
    if (state.sort) p.set('ordem', state.sort);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  function syncControls() {
    el.q.value = state.q;
    el.brand.value = state.brand;
    fillModels(el.model, state.brand, state.model);
    state.model = el.model.value;
    el.type.value = state.type;
    if (el.type.value !== state.type) state.type = '';
    el.sort.value = state.sort;
    if (el.fBrand) { el.fBrand.value = state.brand; fillModels(el.fModel, state.brand, state.model); }
  }

  function apply() {
    var words = fold(state.q).split(/\s+/).filter(Boolean);
    var compact = fold(state.q).replace(/[\s.\-]/g, '');
    var modelKey = state.model ? state.brand + ':' + state.model : '';
    var match = items.filter(function (i) {
      if (state.brand && i.brands.indexOf(state.brand) < 0) return false;
      if (modelKey && i.models.indexOf(modelKey) < 0) return false;
      if (state.type) {
        if (state.type.indexOf('g:') === 0 ? i.group !== state.type.slice(2) : i.type !== state.type) return false;
      }
      if (words.length) {
        var all = words.every(function (w) { return i.s.indexOf(w) >= 0; });
        if (!all && !(compact.length >= 5 && i.s.indexOf(compact) >= 0)) return false;
      }
      return true;
    });
    if (state.sort === 'price-asc') match.sort(function (a, b) { return b.stock - a.stock || a.price - b.price; });
    else if (state.sort === 'price-desc') match.sort(function (a, b) { return b.stock - a.stock || b.price - a.price; });
    else if (state.sort === 'az') match.sort(function (a, b) { return a.title.localeCompare(b.title, 'pt-BR'); });
    else match.sort(function (a, b) { return a.order - b.order; });

    var visible = {};
    var frag = document.createDocumentFragment();
    match.forEach(function (i, n) {
      var c = cards[i.id];
      if (!c) return;
      c.hidden = n >= state.shown;
      visible[i.id] = true;
      frag.appendChild(c);
    });
    Object.keys(cards).forEach(function (id) { if (!visible[id]) { cards[id].hidden = true; frag.appendChild(cards[id]); } });
    grid.appendChild(frag);

    var n = match.length;
    el.count.textContent = n === 1 ? '1 peça encontrada' : n + ' peças' + (n === items.length ? '' : ' encontradas');
    el.empty.hidden = n > 0;
    el.more.hidden = n <= state.shown;
    if (!el.more.hidden) el.more.textContent = 'Mostrar mais peças (' + (n - state.shown) + ' restantes)';
    el.clear.hidden = !(state.q || state.brand || state.model || state.type);
    writeUrl();
  }
  function change(patch) {
    for (var k in patch) state[k] = patch[k];
    state.shown = PAGE;
    syncControls();
    apply();
  }
  function goCatalog() { $('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  var typing;
  el.q.addEventListener('input', function () {
    clearTimeout(typing);
    typing = setTimeout(function () { state.q = el.q.value.trim(); state.shown = PAGE; apply(); }, 140);
  });
  el.brand.addEventListener('change', function () { change({ brand: el.brand.value, model: '' }); });
  el.model.addEventListener('change', function () { change({ model: el.model.value }); });
  el.type.addEventListener('change', function () { change({ type: el.type.value }); });
  el.sort.addEventListener('change', function () { change({ sort: el.sort.value }); });
  el.clear.addEventListener('click', function () { change({ q: '', brand: '', model: '', type: '' }); });
  el.more.addEventListener('click', function () { state.shown += PAGE; apply(); });

  if (el.finder) {
    el.fBrand.addEventListener('change', function () { fillModels(el.fModel, el.fBrand.value, ''); });
    el.finder.addEventListener('submit', function (e) {
      e.preventDefault();
      change({ brand: el.fBrand.value, model: el.fModel.value, type: el.fType.value, q: '' });
      goCatalog();
    });
  }
  $$('[data-group-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      change({ type: 'g:' + a.getAttribute('data-group-link'), q: '', brand: '', model: '' });
      goCatalog();
    });
  });
  var hsearch = $('.hsearch');
  hsearch.addEventListener('submit', function (e) {
    e.preventDefault();
    change({ q: hsearch.querySelector('input').value.trim() });
    goCatalog();
  });

  readUrl();
  syncControls();
  apply();
  if (location.search && !location.hash) goCatalog();
})();
