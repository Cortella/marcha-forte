/* Marcha Forte — checkout (checkout.html).
   Objetivo: quem já tem cadastro ou já comprou neste aparelho quase não digita nada.
   Ordem de onde vêm os dados: cadastro → último pedido feito neste aparelho → em branco. */
(function () {
  'use strict';
  var CFG = window.MF_CFG || {};
  var API = window.MF_API;
  var ADDR = window.MF_ADDR;
  var root = document.querySelector('[data-checkout]');
  if (!root || !API || !ADDR) return;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var brl = function (v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };

  var form = $('[data-co-form]');
  var f = form.elements;
  var addrBox = $('[data-addr-form]');
  ADDR.bind(addrBox);

  var profile = API.profile();
  var last = null; // último pedido feito pelo checkout neste aparelho
  try { last = (JSON.parse(localStorage.getItem('mf_orders_v1') || '[]') || []).filter(function (o) { return o.customer && o.customer.name; })[0] || null; } catch (e) { last = null; }

  // Endereços conhecidos: os do cadastro e, para quem compra sem cadastro, o do último pedido.
  var addresses = ((profile && profile.addresses) || []).slice();
  if (!addresses.length && last && last.address) addresses.push(Object.assign({ id: 'last' }, last.address));
  var chosen = (profile && profile.addressId && addresses.some(function (a) { return a.id === profile.addressId; })) ? profile.addressId
    : addresses.length ? addresses[0].id : 'new';

  /* ---------- 1. Seus dados ---------- */
  var who = (profile && profile.name) ? profile : (last ? last.customer : null);
  f.name.value = (who && who.name) || '';
  f.phone.value = (who && who.phone) || '';
  f.email.value = (who && who.email) || '';
  f.phone.addEventListener('input', function () { f.phone.value = API.maskPhone(f.phone.value); });
  var whoSec = $('[data-sec="who"]');
  function collapseWho(collapsed) {
    $('[data-sec-view]', whoSec).hidden = !collapsed;
    $('[data-sec-fields]', whoSec).hidden = collapsed;
    $('[data-sec-edit]', whoSec).hidden = !collapsed;
    if (collapsed) $('[data-sec-view]', whoSec).innerHTML = '<strong>' + esc(f.name.value) + '</strong><span>' + esc([f.phone.value, f.email.value].filter(Boolean).join(' · ')) + '</span>';
  }
  $('[data-sec-edit]', whoSec).addEventListener('click', function () { collapseWho(false); f.name.focus(); });
  if (who && who.name && who.phone) {
    collapseWho(true);
    var welcome = $('[data-co-welcome]');
    welcome.textContent = 'Que bom ver você de novo, ' + who.name.split(' ')[0] + '! Seus dados já estão preenchidos — é só conferir e enviar.';
    welcome.hidden = false;
  }

  /* ---------- 2. Entrega ---------- */
  function renderAddresses() {
    var html = addresses.map(function (a) {
      return '<label class="co-opt"><input type="radio" name="addr" value="' + esc(a.id) + '"' + (a.id === chosen ? ' checked' : '') + '>' +
        '<span><strong>' + esc(a.label || 'Endereço') + '</strong><small>' + esc(ADDR.format(a)) + '</small></span></label>';
    }).join('');
    html += '<label class="co-opt"><input type="radio" name="addr" value="new"' + (chosen === 'new' ? ' checked' : '') + '><span><strong>' + (addresses.length ? 'Entregar em outro endereço' : 'Receber no meu endereço') + '</strong></span></label>';
    html += '<label class="co-opt"><input type="radio" name="addr" value="pickup"' + (chosen === 'pickup' ? ' checked' : '') + '><span><strong>Combinar retirada</strong><small>Sem entrega: combine com o atendimento como retirar.</small></span></label>';
    $('[data-addr-list]').innerHTML = html;
    addrBox.hidden = chosen !== 'new';
  }
  $('[data-addr-list]').addEventListener('change', function (e) {
    chosen = e.target.value;
    addrBox.hidden = chosen !== 'new';
    if (chosen === 'new') addrBox.querySelector('[name="cep"]').focus();
    updateSaveLabel();
  });
  // Sem endereço salvo: o que já se sabe do cadastro (CEP/cidade) adianta o formulário.
  if (!addresses.length && profile && (profile.cep || profile.city)) {
    var parts = String(profile.city || '').split('/');
    ADDR.fill(addrBox, { cep: profile.cep, city: (parts[0] || '').trim(), uf: (parts[1] || '').trim() });
  }

  /* ---------- 3. Veículo ---------- */
  var cars = ((profile && profile.vehicles) || []).slice();
  [profile && profile.vehicle, API.vehicle(), last && last.vehicle].forEach(function (c) { if (c && cars.indexOf(c) < 0) cars.push(c); });
  f.vehicle.value = API.vehicle() || (profile && profile.vehicle) || (last && last.vehicle) || '';
  function renderCars() {
    $('[data-car-chips]').innerHTML = cars.length > 1 || (cars.length === 1 && cars[0] !== f.vehicle.value)
      ? cars.map(function (c) { return '<button type="button" class="chip' + (c === f.vehicle.value ? ' is-on' : '') + '" data-car="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') : '';
  }
  $('[data-car-chips]').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-car]');
    if (chip) { f.vehicle.value = chip.getAttribute('data-car'); renderCars(); }
  });
  f.vehicle.addEventListener('input', renderCars);

  /* ---------- 4. Pagamento ---------- */
  if (last && last.payment) $$('[name="payment"]').forEach(function (r) { if (r.value === last.payment) r.checked = true; });

  function updateSaveLabel() {
    $('[data-co-save-label]').textContent = profile
      ? (chosen === 'new' ? 'Salvar este endereço na minha conta' : 'Manter meus dados atualizados na minha conta')
      : 'Salvar meus dados' + (chosen === 'new' ? ' e este endereço' : '') + ' para as próximas compras';
  }

  /* ---------- Resumo ---------- */
  function renderSummary() {
    var cart = API.cart();
    var empty = !cart.length;
    if (empty && $('[data-co-done]').hidden) { form.hidden = true; $('[data-co-empty]').hidden = false; return; }
    var total = cart.reduce(function (n, i) { return n + (i.p || 0) * i.q; }, 0);
    $('[data-co-items]').innerHTML = cart.map(function (i) {
      return '<li data-item="' + i.id + '">' + (i.img ? '<img src="' + esc(i.img) + '" alt="" width="56" height="56">' : '<span class="acc-noimg"></span>') +
        '<div><strong>' + esc(i.t) + '</strong><small>ref. ' + esc(i.sku) + '</small>' +
        '<div class="co-item-row"><div class="qty"><button type="button" data-step="-1" aria-label="Diminuir">−</button><span>' + i.q + '</span><button type="button" data-step="1" aria-label="Aumentar">+</button></div>' +
        '<b>' + (i.p ? brl(i.p * i.q) : 'Consultar') + '</b></div></div></li>';
    }).join('');
    $('[data-co-subtotal]').textContent = brl(total);
    $('[data-co-total]').textContent = brl(total);
  }
  $('[data-co-items]').addEventListener('click', function (e) {
    var step = e.target.closest('[data-step]');
    if (!step) return;
    var id = Number(step.closest('[data-item]').getAttribute('data-item'));
    var item = API.cart().filter(function (i) { return i.id === id; })[0];
    if (item) { API.setQty(id, item.q + Number(step.getAttribute('data-step'))); renderSummary(); }
  });

  /* ---------- Enviar ---------- */
  function fail(message, el) {
    var err = $('[data-co-error]');
    err.textContent = message;
    err.hidden = false;
    if (el) { if (el.closest('[hidden]')) collapseWho(false); el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return false;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    $('[data-co-error]').hidden = true;
    var cart = API.cart();
    if (!cart.length) return;
    var name = f.name.value.trim().replace(/\s+/g, ' ');
    var phone = f.phone.value.replace(/\D/g, '');
    var email = f.email.value.trim();
    if (name.length < 3) return fail('Informe seu nome completo.', f.name);
    if (phone.length < 10 || phone.length > 11) return fail('Informe o WhatsApp com DDD (10 ou 11 dígitos).', f.phone);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Confira o e-mail informado.', f.email);

    var address = null;
    if (chosen === 'new') {
      var read = ADDR.read(addrBox);
      if (read.error) return fail(read.error, read.field);
      address = read.value;
    } else if (chosen !== 'pickup') {
      address = addresses.filter(function (a) { return a.id === chosen; })[0] || null;
    }
    var addressText = address ? ADDR.format(address) : 'Retirada a combinar';
    var customer = { name: name, phone: API.maskPhone(phone), email: email };
    var vehicle = f.vehicle.value.trim();
    var payment = (form.querySelector('[name="payment"]:checked') || {}).value || '';
    var note = f.note.value.trim();
    var items = cart.slice();
    var total = items.reduce(function (n, i) { return n + (i.p || 0) * i.q; }, 0);

    // Salva antes de registrar o pedido, para o cadastro novo chegar à loja uma vez só.
    if (f.save.checked) {
      var next = Object.assign({}, profile || {}, customer);
      var list = ((profile && profile.addresses) || []).slice();
      if (address) {
        var existing = list.filter(function (a) { return ADDR.same(a, address); })[0];
        if (!existing && list.length < 6) { existing = Object.assign({}, address, { id: ADDR.newId(), label: address.label || (list.length ? 'Endereço ' + (list.length + 1) : 'Principal') }); list.push(existing); }
        if (existing) { next.addressId = existing.id; next.cep = existing.cep; next.city = existing.city + ' / ' + existing.uf; }
      }
      next.addresses = list;
      var carList = (next.vehicles || (next.vehicle ? [next.vehicle] : [])).slice();
      if (vehicle && carList.indexOf(vehicle) < 0 && carList.length < 6) carList.push(vehicle);
      next.vehicles = carList;
      if (vehicle) next.vehicle = vehicle;
      if (next.offers == null) next.offers = false;
      API.saveProfile(next);
    }

    var id = API.record('carrinho', items, { customer: customer, address: address, addressText: addressText, payment: payment, note: note, vehicle: vehicle });
    var text = 'Olá! Quero fechar este pedido na ' + CFG.name + ' (pedido ' + API.orderCode(id) + '):\n\n' +
      items.map(function (i) { return '• ' + i.q + 'x ' + i.t + ' (ref. ' + i.sku + ')' + (i.p ? ' — ' + brl(i.p * i.q) : ''); }).join('\n') +
      (total ? '\n\nTotal das peças: ' + brl(total) : '') +
      '\n\nVeículo: ' + (vehicle || '(informar modelo, ano e motor)') +
      '\nEntrega: ' + addressText +
      (payment ? '\nPagamento: ' + payment : '') +
      (note ? '\nObservação: ' + note : '') +
      '\n\nMeus dados:\nNome: ' + customer.name + '\nWhatsApp: ' + customer.phone + (email ? '\nE-mail: ' + email : '');
    var url = 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(text);

    API.clearCart();
    form.hidden = true;
    $('[data-co-code]').textContent = API.orderCode(id);
    $('[data-co-reopen]').href = url;
    $('[data-co-done]').hidden = false;
    window.scrollTo(0, 0);
    window.open(url, '_blank', 'noopener');
  });

  if (API.cart().length) form.hidden = false;
  renderAddresses(); renderCars(); renderSummary(); updateSaveLabel();
})();
