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

  /* ---------- Cadastro do cliente (opcional) ----------
     Não há servidor: o cadastro fica neste aparelho e segue junto nas mensagens de WhatsApp. */
  var PKEY = 'mf_profile_v1';
  var profile = null;
  try { profile = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { /* sem armazenamento */ }
  if (profile && !profile.name) profile = null;

  function customerBlock() {
    if (!profile) return '';
    var lines = ['Nome: ' + profile.name, 'WhatsApp: ' + profile.phone];
    if (profile.email) lines.push('E-mail: ' + profile.email);
    if (profile.cep || profile.city) lines.push('Entrega: ' + [profile.city, profile.cep && 'CEP ' + profile.cep].filter(Boolean).join(' — '));
    return '\n\nMeus dados:\n' + lines.join('\n');
  }

  /* ---------- Banco de vendas (opcional) ----------
     Com o Supabase configurado, cada pedido enviado pelo WhatsApp também é gravado para a
     dashboard do admin. O visitante só consegue inserir; ler é restrito aos administradores.
     Falha de rede aqui nunca pode atrapalhar a compra: os erros são engolidos de propósito. */
  function dbInsert(table, row) {
    if (!CFG.db) return;
    try {
      fetch(CFG.db.url.replace(/\/+$/, '') + '/rest/v1/' + table, {
        method: 'POST',
        keepalive: true,
        headers: { apikey: CFG.db.key, Authorization: 'Bearer ' + CFG.db.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      }).catch(function () { /* a compra segue pelo WhatsApp */ });
    } catch (e) { /* idem */ }
  }
  var lastOrderKey = '';
  try { lastOrderKey = sessionStorage.getItem('mf_last_order') || ''; } catch (e) { /* ignora */ }
  var OKEY = 'mf_orders_v1';
  var lastOrderId = '';
  try { lastOrderId = sessionStorage.getItem('mf_last_order_id') || ''; } catch (e) { /* ignora */ }
  var orderCode = function (id) { return '#' + String(id).slice(0, 8).toUpperCase(); };
  function newId() {
    try { return crypto.randomUUID(); } catch (e) { /* navegador antigo */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  // Guarda o pedido no aparelho (histórico da área do cliente) e, com banco configurado, na loja.
  // Devolve o id do pedido — o mesmo número aparece na mensagem de WhatsApp e na dashboard.
  function recordOrder(source, list) {
    if (!list.length) return '';
    var items = list.map(function (i) { return { id: i.id, sku: i.sku, title: i.t, qty: i.q, price: i.p || 0, img: i.img || '', url: i.url || '' }; });
    var total = Math.round(items.reduce(function (n, i) { return n + i.price * i.qty; }, 0) * 100) / 100;
    // Clicar duas vezes no mesmo pedido não deve gerar dois registros.
    var key = source + '|' + items.map(function (i) { return i.id + 'x' + i.qty; }).join(',');
    if (key === lastOrderKey && lastOrderId) return lastOrderId;
    var id = newId();
    lastOrderKey = key;
    lastOrderId = id;
    try { sessionStorage.setItem('mf_last_order', key); sessionStorage.setItem('mf_last_order_id', id); } catch (e) { /* ignora */ }
    var p = profile || {};
    var car = (source === 'carrinho' ? vehicle : '') || p.vehicle || '';
    try {
      var all = JSON.parse(localStorage.getItem(OKEY) || '[]') || [];
      all.unshift({ id: id, at: new Date().toISOString(), source: source, items: items, total: total, vehicle: car, synced: Boolean(CFG.db) });
      localStorage.setItem(OKEY, JSON.stringify(all.slice(0, 60)));
    } catch (e) { /* sem histórico neste aparelho */ }
    dbInsert('orders', {
      id: id, source: source, items: items, total: total,
      customer_name: p.name || null, customer_phone: p.phone || null, customer_email: p.email || null,
      customer_city: p.city || null, customer_cep: p.cep || null, vehicle: car || null,
    });
    return id;
  }

  var drawer = $('[data-cart-drawer]');
  var backdrop = $('.drawer-backdrop');
  var itemsEl = $('[data-cart-items]');
  var vehicleEl = $('[data-cart-vehicle]');

  function checkoutText(orderId) {
    var total = 0;
    var lines = cart.map(function (i) {
      total += (i.p || 0) * i.q;
      return '• ' + i.q + 'x ' + i.t + ' (ref. ' + i.sku + ')' + (i.p ? ' — ' + brl(i.p * i.q) : '');
    });
    return 'Olá! Quero fechar este pedido na ' + CFG.name + (orderId ? ' (pedido ' + orderCode(orderId) + ')' : '') + ':\n\n' + lines.join('\n') +
      (total ? '\n\nTotal das peças: ' + brl(total) : '') +
      '\n\nMeu veículo: ' + (vehicle || (profile && profile.vehicle) || '(informar modelo, ano e motor)') +
      customerBlock();
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
    if (co) {
      // O número do pedido entra na mensagem no momento do clique, antes de o WhatsApp abrir.
      co.href = 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(checkoutText(recordOrder('carrinho', cart)));
      return;
    }
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

  var modal = $('[data-acct-modal]');
  var modalBackdrop = $('.modal-backdrop');
  var form = $('[data-acct-form]');
  var done = $('[data-acct-done]');
  var errEl = $('[data-acct-error]');
  var digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  var maskPhone = function (s) {
    var d = digits(s).slice(0, 11);
    if (d.length < 3) return d;
    if (d.length < 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    var cut = d.length === 11 ? 7 : 6;
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, cut) + '-' + d.slice(cut);
  };
  var maskCep = function (s) { var d = digits(s).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };

  function renderAccount() {
    var first = profile ? profile.name.split(' ')[0] : '';
    $$('[data-acct-label]').forEach(function (el) { el.textContent = profile ? 'Olá, ' + first : 'Cadastre-se'; });
    var slot = $('[data-cart-acct]');
    if (slot) {
      slot.innerHTML = profile
        ? '<span>Pedido em nome de <strong>' + escapeHtml(profile.name) + '</strong></span><button type="button" data-acct-open>Editar</button>'
        : '<span>Quer agilizar? O cadastro é opcional.</span><button type="button" data-acct-open>Cadastrar</button>';
    }
    if (vehicleEl && !vehicle && profile && profile.vehicle) { vehicle = profile.vehicle; vehicleEl.value = vehicle; persist(); }
    renderCart();
  }

  function openAccount(open) {
    if (!modal) return;
    modal.hidden = !open;
    modalBackdrop.hidden = !open;
    document.documentElement.classList.toggle('no-scroll', open || (drawer && !drawer.hidden));
    if (!open) return;
    form.hidden = false;
    done.hidden = true;
    errEl.hidden = true;
    var p = profile || {};
    form.elements.name.value = p.name || '';
    form.elements.phone.value = p.phone || '';
    form.elements.email.value = p.email || '';
    form.elements.cep.value = p.cep || '';
    form.elements.city.value = p.city || '';
    form.elements.vehicle.value = p.vehicle || vehicle || '';
    form.elements.offers.checked = Boolean(p.offers);
    $('[data-acct-title]').textContent = profile ? 'Seu cadastro' : 'Cadastre-se';
    $('[data-acct-intro]').hidden = Boolean(profile);
    $('[data-acct-remove]').hidden = !profile;
    form.elements.name.focus();
  }

  if (form) {
    form.elements.phone.addEventListener('input', function () { this.value = maskPhone(this.value); });
    form.elements.cep.addEventListener('input', function () { this.value = maskCep(this.value); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var name = f.name.value.trim().replace(/\s+/g, ' ');
      var phone = digits(f.phone.value);
      var email = f.email.value.trim();
      var problem = '';
      if (name.length < 3) problem = 'Informe seu nome completo.';
      else if (phone.length < 10 || phone.length > 11) problem = 'Informe o WhatsApp com DDD (10 ou 11 dígitos).';
      else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem = 'Confira o e-mail informado.';
      if (problem) { errEl.textContent = problem; errEl.hidden = false; return; }
      var isNew = !profile;
      var next = { name: name, phone: maskPhone(phone), email: email, cep: maskCep(f.cep.value), city: f.city.value.trim(), vehicle: f.vehicle.value.trim(), offers: f.offers.checked };
      // preserva a lista de veículos mantida na área do cliente
      var cars = ((profile && profile.vehicles) || []).filter(function (v) { return v !== next.vehicle; });
      next.vehicles = next.vehicle ? [next.vehicle].concat(cars).slice(0, 6) : cars;
      storeProfile(next);
      if (!isNew) { openAccount(false); return; }
      var text = 'Olá! Fiz meu cadastro no site da ' + CFG.name + '.' + customerBlock() +
        (profile.vehicle ? '\nVeículo: ' + profile.vehicle : '') +
        '\nReceber ofertas pelo WhatsApp: ' + (profile.offers ? 'sim' : 'não');
      $('[data-acct-send]').href = 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(text);
      form.hidden = true;
      done.hidden = false;
      $('[data-acct-title]').textContent = 'Seu cadastro';
    });
    $('[data-acct-remove]').addEventListener('click', function () {
      profile = null;
      try { localStorage.removeItem(PKEY); } catch (err) { /* ignora */ }
      renderAccount();
      openAccount(false);
    });
  }
  // Único ponto que grava o cadastro: usado pelo formulário rápido e pela área do cliente.
  function storeProfile(next) {
    var isNew = !profile;
    profile = next;
    try { if (next) localStorage.setItem(PKEY, JSON.stringify(next)); else localStorage.removeItem(PKEY); } catch (err) { /* vale só nesta página */ }
    if (next && isNew) dbInsert('customers', { name: next.name, phone: next.phone, email: next.email || null, city: next.city || null, cep: next.cep || null, vehicle: next.vehicle || null, accepts_offers: Boolean(next.offers) });
    if (next && next.vehicle) { vehicle = next.vehicle; if (vehicleEl) vehicleEl.value = vehicle; persist(); }
    renderAccount();
  }
  window.MF_API = {
    profile: function () { return profile; },
    saveProfile: storeProfile,
    add: function (item) { addItem(item); },
    openCart: function () { openCart(true); },
    orderCode: orderCode,
    maskPhone: maskPhone,
    maskCep: maskCep,
  };

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-acct-open]');
    // Quem já tem cadastro vai do botão do topo direto para a área do cliente.
    if (opener && profile && opener.classList.contains('acct-btn') && !document.body.hasAttribute('data-account-page')) { location.href = CFG.base + 'minha-conta.html'; return; }
    if (opener) { openAccount(true); return; }
    if (e.target.closest('[data-acct-close]')) { openAccount(false); return; }
    // Links diretos de compra/dúvida: completa a mensagem com o veículo e os dados de quem tem cadastro.
    var buy = e.target.closest('a[data-buy]');
    if (buy) {
      var one = JSON.parse(buy.getAttribute('data-buy')); one.q = 1;
      var oid = recordOrder('produto', [one]);
      if (oid && !buy.hasAttribute('data-order-done')) {
        var bp = buy.href.split('?text=');
        buy.href = bp[0] + '?text=' + encodeURIComponent(decodeURIComponent(bp[1] || '').replace(/:\n/, ' (pedido ' + orderCode(oid) + '):\n'));
        buy.setAttribute('data-order-done', '');
      }
    }
    var link = e.target.closest('a[href^="https://wa.me/"]');
    if (link && profile && !link.hasAttribute('data-cart-checkout') && !link.hasAttribute('data-acct-send') && !link.hasAttribute('data-wa-done')) {
      var parts = link.href.split('?text=');
      var text = decodeURIComponent(parts[1] || '');
      if (/veículo é: $/.test(text) && profile.vehicle) text += profile.vehicle;
      link.href = parts[0] + '?text=' + encodeURIComponent(text + customerBlock());
      link.setAttribute('data-wa-done', '');
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openAccount(false); });
  renderAccount();

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
    // A consulta já leva o que a pessoa procurou, para o atendimento não ter de perguntar de novo.
    var consult = $('[data-consult]', el.empty);
    if (consult && !n) {
      var looked = [];
      if (state.q) looked.push('"' + state.q + '"');
      if (state.brand) looked.push(el.brand.options[el.brand.selectedIndex].text + (state.model ? ' ' + state.model : ''));
      if (state.type) looked.push(el.type.options[el.type.selectedIndex].text.replace(/\s*\(\d+\)$/, ''));
      consult.href = 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent('Olá! Quero fazer uma consulta na ' + CFG.name + '.' +
        (looked.length ? '\nProcurei no site por: ' + looked.join(' · ') + ' e não encontrei.' : '') + '\n\nMeu veículo é: ');
      consult.removeAttribute('data-wa-done');
    }
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
