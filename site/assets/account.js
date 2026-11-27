/* Marcha Forte — área do cliente (minha-conta.html).
   Sem login: o cadastro e o histórico de pedidos ficam neste aparelho. Com o banco
   configurado, o andamento e o rastreio de cada pedido vêm da loja, consultados pelo
   id do pedido (um UUID aleatório que só este aparelho — ou quem recebe o link — conhece). */
(function () {
  'use strict';
  var CFG = window.MF_CFG || {};
  var API = window.MF_API;
  var root = document.querySelector('[data-account]');
  if (!root || !API) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var brl = function (v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var fmtDate = function (iso) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); };
  var OKEY = 'mf_orders_v1';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var STEPS = [['novo', 'Pedido recebido'], ['em_atendimento', 'Em atendimento'], ['pago', 'Pagamento confirmado'], ['enviado', 'Enviado'], ['concluido', 'Entregue']];
  var STATUS_TEXT = {
    novo: 'Recebemos seu pedido. O atendimento vai confirmar a compatibilidade, o frete e o pagamento pelo WhatsApp.',
    em_atendimento: 'Seu pedido está em atendimento. Combine os detalhes na conversa do WhatsApp.',
    pago: 'Pagamento confirmado. Estamos preparando o envio.',
    enviado: 'Pedido despachado.',
    concluido: 'Pedido entregue. Obrigado pela compra!',
    cancelado: 'Este pedido foi cancelado.',
  };

  var orders = [];
  try { orders = JSON.parse(localStorage.getItem(OKEY) || '[]') || []; } catch (e) { orders = []; }
  var saveOrders = function () { try { localStorage.setItem(OKEY, JSON.stringify(orders)); } catch (e) { /* ignora */ } };
  var remote = {};      // id -> andamento vindo da loja
  var remoteState = CFG.db ? 'loading' : 'off'; // off | loading | ok | error
  var linked = new URLSearchParams(location.search).get('pedido');
  if (linked && !UUID.test(linked)) linked = null;

  /* ---------- Andamento na loja ---------- */
  function fetchStatus() {
    if (!CFG.db) return;
    var ids = orders.filter(function (o) { return o.synced; }).map(function (o) { return o.id; });
    if (linked && ids.indexOf(linked) < 0) ids.push(linked);
    if (!ids.length) { remoteState = 'ok'; return; }
    fetch(CFG.db.url.replace(/\/+$/, '') + '/rest/v1/rpc/order_status', {
      method: 'POST',
      headers: { apikey: CFG.db.key, Authorization: 'Bearer ' + CFG.db.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_ids: ids.slice(0, 60) }),
    }).then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then(function (rows) { (rows || []).forEach(function (r) { remote[r.id] = r; }); remoteState = 'ok'; }, function () { remoteState = 'error'; })
      .then(renderOrders);
  }

  function trackingHtml(r) {
    if (!r || (!r.carrier && !r.tracking_code)) return '';
    var code = r.tracking_code ? esc(r.tracking_code) : '';
    var link = r.tracking_code && /correios/i.test(r.carrier || 'correios') && /^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(r.tracking_code)
      ? '<a class="btn btn-dark" href="https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(r.tracking_code) + '" target="_blank" rel="noopener">Rastrear nos Correios</a>' : '';
    return '<div class="acc-ship"><div><span>Envio</span><strong>' + esc(r.carrier || 'A combinar') + '</strong></div>' +
      (code ? '<div><span>Código de rastreio</span><strong class="acc-code">' + code + '</strong></div><button class="btn btn-ghost" type="button" data-copy="' + code + '">Copiar código</button>' : '') + link + '</div>';
  }

  function timelineHtml(status) {
    if (status === 'cancelado') return '<p class="acc-cancel">Pedido cancelado</p>';
    var at = STEPS.map(function (s) { return s[0]; }).indexOf(status);
    return '<ol class="acc-steps">' + STEPS.map(function (s, i) {
      return '<li class="' + (i < at ? 'is-done' : i === at ? 'is-now' : '') + '"><span></span>' + s[1] + '</li>';
    }).join('') + '</ol>';
  }

  function orderHtml(o, r, onlyTracking) {
    var items = (o.items && o.items.length ? o.items : (r && r.items) || []);
    var total = o.total != null ? o.total : r && r.total;
    var when = o.at || (r && r.created_at);
    var status = r ? r.status : null;
    var body;
    if (r) body = timelineHtml(status) + '<p class="acc-status-text">' + STATUS_TEXT[status] + '</p>' + trackingHtml(r);
    else if (o.synced && remoteState === 'loading') body = '<p class="acc-status-text">Consultando o andamento…</p>';
    else if (o.synced && remoteState === 'error') body = '<p class="acc-status-text">Não foi possível consultar o andamento agora. Tente de novo em instantes.</p>';
    else body = '<p class="acc-status-text">Pedido enviado pelo WhatsApp. O andamento e a entrega são combinados na conversa com o atendimento.</p>';
    var help = 'Olá! Quero falar sobre o pedido ' + API.orderCode(o.id) + ' feito no site da ' + CFG.name + '.';
    return '<article class="acc-order" data-order="' + esc(o.id) + '">' +
      '<header><div><strong>Pedido ' + API.orderCode(o.id) + '</strong><span>' + (when ? fmtDate(when) : '') + '</span></div>' +
      '<div class="acc-order-total">' + (total != null ? brl(total) : '') + '</div></header>' +
      '<ul class="acc-items">' + items.map(function (i) {
        var name = esc(i.title);
        return '<li>' + (i.img ? '<img src="' + esc(i.img) + '" alt="" width="56" height="56" loading="lazy">' : '<span class="acc-noimg"></span>') +
          '<div>' + (i.url ? '<a href="' + esc(i.url) + '">' + name + '</a>' : name) + '<small>ref. ' + esc(i.sku) + ' · ' + esc(i.qty) + ' un.' + (i.price ? ' · ' + brl(i.price) : '') + '</small></div></li>';
      }).join('') + '</ul>' +
      (o.vehicle ? '<p class="acc-vehicle">Veículo informado: <strong>' + esc(o.vehicle) + '</strong></p>' : '') +
      '<div class="acc-progress">' + body + '</div>' +
      '<footer><a class="btn btn-wa" href="https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(help) + '" target="_blank" rel="noopener">Falar sobre este pedido</a>' +
      (items.length && !onlyTracking ? '<button class="btn btn-ghost" type="button" data-again>Pedir de novo</button>' : '') +
      (o.synced && CFG.site ? '<button class="btn btn-ghost" type="button" data-copy="' + esc(CFG.site + '/minha-conta.html?pedido=' + o.id) + '">Copiar link de acompanhamento</button>' : '') +
      (!onlyTracking ? '<button class="acc-forget" type="button" data-forget>Remover do histórico</button>' : '') + '</footer></article>';
  }

  function renderOrders() {
    // Pedido aberto por link (?pedido=...) que não está no histórico deste aparelho.
    var track = $('[data-track]');
    var known = orders.some(function (o) { return o.id === linked; });
    if (linked && !known) {
      track.hidden = false;
      if (remote[linked]) track.innerHTML = '<h2>Acompanhamento do pedido</h2>' + orderHtml({ id: linked, synced: true }, remote[linked], true);
      else track.innerHTML = '<h2>Acompanhamento do pedido</h2><p class="acc-empty-text">' + (remoteState === 'loading' ? 'Consultando o pedido…' : remoteState === 'off' ? 'O acompanhamento online ainda não está disponível. Fale com a gente pelo WhatsApp.' : 'Não encontramos esse pedido. Confira o link ou fale com a gente pelo WhatsApp.') + '</p>';
    } else track.hidden = true;

    $('[data-orders]').innerHTML = orders.length
      ? orders.map(function (o) { return orderHtml(o, remote[o.id], false); }).join('')
      : '<div class="acc-empty"><h2>Você ainda não fez pedidos</h2><p>Os pedidos enviados pelo site aparecem aqui, com o andamento e o código de rastreio.</p><a class="btn btn-primary btn-lg" href="index.html#catalogo">Ver o catálogo</a></div>';
    if (linked && known) { var el = $('[data-order="' + linked + '"]'); if (el) el.classList.add('is-linked'); }
  }

  /* ---------- Cabeçalho, dados e veículos ---------- */
  function renderHead() {
    var p = API.profile();
    $('[data-acc-hello]').textContent = p ? 'Olá, ' + p.name.split(' ')[0] : 'Minha conta';
    $('[data-acc-sub]').textContent = p ? [p.phone, p.email].filter(Boolean).join(' · ')
      : 'Você está comprando sem cadastro — e pode continuar assim. Cadastrar é opcional e agiliza os próximos pedidos.';
  }
  var form = $('[data-acc-form]');
  function fillForm() {
    var p = API.profile() || {};
    form.elements.name.value = p.name || '';
    form.elements.phone.value = p.phone || '';
    form.elements.email.value = p.email || '';
    form.elements.cep.value = p.cep || '';
    form.elements.city.value = p.city || '';
    form.elements.offers.checked = Boolean(p.offers);
    $('[data-acc-form-intro]').textContent = API.profile() ? 'Mantenha seus dados atualizados para agilizar o atendimento.' : 'Preencha para que seus pedidos já saiam com seus dados. É opcional.';
    $('[data-acc-danger]').hidden = !API.profile() && !orders.length;
  }
  function renderCars() {
    var p = API.profile();
    var cars = (p && p.vehicles) || (p && p.vehicle ? [p.vehicle] : []);
    $('[data-cars]').innerHTML = cars.length ? cars.map(function (c, i) {
      var main = p.vehicle === c;
      return '<li><div><strong>' + esc(c) + '</strong>' + (main ? '<span class="acc-main">Principal</span>' : '') + '</div><div class="acc-car-actions">' +
        (main ? '' : '<button type="button" data-car-main="' + i + '">Tornar principal</button>') +
        '<button type="button" data-car-del="' + i + '">Remover</button></div></li>';
    }).join('') : '<li class="acc-empty-text">Nenhum veículo salvo ainda.</li>';
    $('[data-car-form]').hidden = !p;
    if (!p) $('[data-cars]').innerHTML = '<li class="acc-empty-text">Preencha “Meus dados” para salvar seus veículos.</li>';
  }
  function saveCars(cars, main) {
    var p = Object.assign({}, API.profile());
    p.vehicles = cars;
    p.vehicle = cars.indexOf(main) >= 0 ? main : (cars[0] || '');
    API.saveProfile(p);
    renderCars();
  }

  form.elements.phone.addEventListener('input', function () { this.value = API.maskPhone(this.value); });
  form.elements.cep.addEventListener('input', function () { this.value = API.maskCep(this.value); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = f.name.value.trim().replace(/\s+/g, ' ');
    var phone = f.phone.value.replace(/\D/g, '');
    var email = f.email.value.trim();
    var problem = '';
    if (name.length < 3) problem = 'Informe seu nome completo.';
    else if (phone.length < 10 || phone.length > 11) problem = 'Informe o WhatsApp com DDD (10 ou 11 dígitos).';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem = 'Confira o e-mail informado.';
    var errEl = $('[data-acc-error]');
    if (problem) { errEl.textContent = problem; errEl.hidden = false; return; }
    errEl.hidden = true;
    var old = API.profile() || {};
    API.saveProfile({ name: name, phone: API.maskPhone(phone), email: email, cep: API.maskCep(f.cep.value), city: f.city.value.trim(), offers: f.offers.checked, vehicle: old.vehicle || '', vehicles: old.vehicles || (old.vehicle ? [old.vehicle] : []) });
    renderHead(); fillForm(); renderCars();
    notify('Dados salvos.');
  });
  $('[data-car-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = e.target.elements.car;
    var car = input.value.trim().replace(/\s+/g, ' ');
    var p = API.profile();
    if (!car || !p) return;
    var cars = (p.vehicles || (p.vehicle ? [p.vehicle] : [])).filter(function (c) { return c.toLowerCase() !== car.toLowerCase(); });
    if (cars.length >= 6) { notify('Você pode salvar até 6 veículos.'); return; }
    cars.push(car);
    saveCars(cars, p.vehicle || car);
    input.value = '';
  });

  /* ---------- Ações ---------- */
  var noteEl, noteTimer;
  function notify(text) {
    if (!noteEl) { noteEl = document.createElement('div'); noteEl.className = 'toast acc-toast'; noteEl.setAttribute('role', 'status'); document.body.appendChild(noteEl); }
    noteEl.textContent = text;
    noteEl.classList.add('is-on');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { noteEl.classList.remove('is-on'); }, 2600);
  }
  function showTab(name) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name)); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    history.replaceState(null, '', location.pathname + location.search + '#' + name);
  }
  root.addEventListener('click', function (e) {
    var t = e.target;
    var tab = t.closest('[data-tab]');
    if (tab) { showTab(tab.getAttribute('data-tab')); return; }
    if (t.closest('[data-acc-refresh]')) { remoteState = 'loading'; renderOrders(); fetchStatus(); return; }
    var copy = t.closest('[data-copy]');
    if (copy) {
      var value = copy.getAttribute('data-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(value) : Promise.reject()).then(function () { notify('Copiado!'); }, function () { notify(value); });
      return;
    }
    var card = t.closest('[data-order]');
    var order = card && orders.filter(function (o) { return o.id === card.getAttribute('data-order'); })[0];
    if (order && t.closest('[data-again]')) {
      order.items.forEach(function (i) { for (var n = 0; n < (Number(i.qty) || 1); n++) API.add({ id: i.id, t: i.title, p: i.price, sku: i.sku, img: i.img, url: i.url }); });
      API.openCart();
      return;
    }
    if (order && t.closest('[data-forget]')) {
      if (card.hasAttribute('data-confirm')) { orders = orders.filter(function (o) { return o !== order; }); saveOrders(); renderOrders(); fillForm(); }
      else { card.setAttribute('data-confirm', ''); t.closest('[data-forget]').textContent = 'Clique de novo para remover'; }
      return;
    }
    var p = API.profile();
    var cars = p ? (p.vehicles || (p.vehicle ? [p.vehicle] : [])).slice() : [];
    if (t.closest('[data-car-main]')) { saveCars(cars, cars[Number(t.closest('[data-car-main]').getAttribute('data-car-main'))]); return; }
    if (t.closest('[data-car-del]')) { cars.splice(Number(t.closest('[data-car-del]').getAttribute('data-car-del')), 1); saveCars(cars, p.vehicle); return; }
    var wipe = t.closest('[data-acc-wipe]');
    if (wipe) {
      if (!wipe.hasAttribute('data-confirm')) { wipe.setAttribute('data-confirm', ''); wipe.textContent = 'Clique de novo para confirmar'; return; }
      orders = []; saveOrders();
      API.saveProfile(null);
      try { localStorage.removeItem('mf_cart_v1'); } catch (err) { /* ignora */ }
      location.href = 'index.html';
    }
  });

  $('[data-acc-refresh]').hidden = !CFG.db;
  renderHead(); fillForm(); renderCars(); renderOrders(); fetchStatus();
  var initial = location.hash.replace('#', '');
  if (['pedidos', 'dados', 'veiculos', 'ajuda'].indexOf(initial) >= 0) showTab(initial);
})();
