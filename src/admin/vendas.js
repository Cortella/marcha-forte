/* Marcha Forte — dashboard de vendas.
   Lê os pedidos do Postgres (Supabase) pela API REST. O login é o do Supabase Auth e
   as regras do banco (RLS) só entregam dados a quem está na tabela `admins`. */
(function () {
  'use strict';
  var A = window.MF_ADMIN || {};
  var DB = A.db;
  var SKEY = 'mf_admin_db_session';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var brl = function (v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var brlShort = function (v) { return v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : 'R$ ' + Math.round(v); };

  var STATUS = [
    ['novo', 'Novo'], ['em_atendimento', 'Em atendimento'], ['pago', 'Pago'],
    ['enviado', 'Enviado'], ['concluido', 'Concluído'], ['cancelado', 'Cancelado'],
  ];
  var LABEL = {}; STATUS.forEach(function (s) { LABEL[s[0]] = s[1]; });
  var CARRIERS = ['Correios', 'Jadlog', 'Transportadora', 'Motoboy', 'Retirada na loja'];
  var CONFIRMED = { pago: 1, enviado: 1, concluido: 1 };
  var OPEN = { novo: 1, em_atendimento: 1 };

  var session = null;
  var orders = [];
  var customers = [];

  if (!DB) { $('[data-view-setup]').hidden = false; return; }

  /* ---------- Supabase ---------- */
  function call(path, options) {
    options = options || {};
    var headers = { apikey: DB.key, 'Content-Type': 'application/json' };
    headers.Authorization = 'Bearer ' + (options.anon || !session ? DB.key : session.access_token);
    if (options.prefer) headers.Prefer = options.prefer;
    return fetch(DB.url + path, { method: options.method || 'GET', headers: headers, cache: 'no-store', body: options.body ? JSON.stringify(options.body) : undefined })
      .then(function (res) {
        if (!res.ok) { var err = new Error('HTTP ' + res.status); err.status = res.status; throw err; }
        return res.status === 204 ? null : res.text().then(function (t) { return t ? JSON.parse(t) : null; });
      });
  }
  function saveSession(data) {
    session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + (data.expires_in - 60) * 1000, email: (data.user || {}).email || (session || {}).email };
    try { sessionStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) { /* só nesta página */ }
  }
  function ensureSession() {
    if (!session) return Promise.reject(Object.assign(new Error('sem sessão'), { status: 401 }));
    if (Date.now() < session.expires_at) return Promise.resolve();
    return call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: true, body: { refresh_token: session.refresh_token } }).then(saveSession);
  }
  function logout() {
    session = null;
    try { sessionStorage.removeItem(SKEY); } catch (e) { /* ignora */ }
    location.reload();
  }

  /* ---------- Dados ---------- */
  var periodStart = function () { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (Number($('[data-period]').value) - 1)); return d; };
  function load() {
    var since = encodeURIComponent(periodStart().toISOString());
    return ensureSession().then(function () {
      return Promise.all([
        call('/rest/v1/orders?select=*&created_at=gte.' + since + '&order=created_at.desc&limit=5000'),
        call('/rest/v1/customers?select=*&created_at=gte.' + since + '&order=created_at.desc&limit=2000'),
      ]);
    }).then(function (res) { orders = res[0] || []; customers = res[1] || []; render(); });
  }
  function fail(err) {
    if (err.status === 401) { logout(); return; }
    toast('Não foi possível carregar os dados (' + (err.status || 'sem conexão') + ').', true);
  }

  /* ---------- Indicadores ---------- */
  function renderKpis() {
    var confirmed = orders.filter(function (o) { return CONFIRMED[o.status]; });
    var open = orders.filter(function (o) { return OPEN[o.status]; });
    var sum = function (list) { return list.reduce(function (n, o) { return n + Number(o.total); }, 0); };
    var decided = orders.filter(function (o) { return !OPEN[o.status]; }).length;
    var tiles = [
      ['Pedidos recebidos', String(orders.length), 'pelo site, no período'],
      ['Vendas confirmadas', String(confirmed.length), 'pago, enviado ou concluído'],
      ['Faturamento confirmado', brl(sum(confirmed)), confirmed.length ? 'ticket médio ' + brl(sum(confirmed) / confirmed.length) : 'nenhuma venda confirmada ainda'],
      ['Em aberto', brl(sum(open)), open.length + (open.length === 1 ? ' pedido aguardando' : ' pedidos aguardando')],
      ['Conversão', decided ? Math.round((confirmed.length / decided) * 100) + '%' : '—', decided ? 'dos ' + decided + ' pedidos já encerrados' : 'nenhum pedido encerrado ainda'],
    ];
    $('[data-kpis]').innerHTML = tiles.map(function (t) {
      return '<div class="kpi"><span class="kpi-label">' + t[0] + '</span><strong>' + t[1] + '</strong><span class="kpi-sub">' + t[2] + '</span></div>';
    }).join('');
  }

  /* ---------- Gráfico: faturamento confirmado por dia (uma série, um eixo) ---------- */
  function renderChart() {
    var start = periodStart();
    var days = Number($('[data-period]').value);
    var weekly = days > 90; // 12 meses: uma barra por semana para não virar um pente
    var step = weekly ? 7 : 1;
    var buckets = [];
    for (var i = 0; i < Math.ceil(days / step); i++) {
      var d = new Date(start); d.setDate(d.getDate() + i * step);
      buckets.push({ date: d, value: 0, count: 0 });
    }
    orders.forEach(function (o) {
      if (!CONFIRMED[o.status]) return;
      var idx = Math.floor((new Date(o.created_at) - start) / 864e5 / step);
      if (buckets[idx]) { buckets[idx].value += Number(o.total); buckets[idx].count += 1; }
    });
    var max = Math.max.apply(null, buckets.map(function (b) { return b.value; }));
    var el = $('[data-chart]');
    if (!max) { el.innerHTML = '<p class="chart-empty">Nenhuma venda confirmada no período. Marque os pedidos como <strong>pago</strong> para vê-los aqui.</p>'; return; }

    var W = 760, H = 250, padL = 58, padB = 26, padT = 10;
    var plotW = W - padL - 6, plotH = H - padB - padT;
    var niceStep = Math.pow(10, Math.floor(Math.log10(max)));
    var top = Math.ceil(max / niceStep) * niceStep;
    if (top / niceStep > 6) { niceStep *= 2; top = Math.ceil(max / niceStep) * niceStep; }
    var slot = plotW / buckets.length;
    var bw = Math.max(2, Math.min(34, slot - 2));
    var fmtDay = function (dt) { return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
    var svg = '';
    for (var g = 0; g <= top / niceStep; g++) {
      var gy = padT + plotH - (g * niceStep / top) * plotH;
      svg += '<line class="grid" x1="' + padL + '" x2="' + (W - 6) + '" y1="' + gy + '" y2="' + gy + '"/>' +
        '<text class="tick" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + brlShort(g * niceStep) + '</text>';
    }
    var labelEvery = Math.ceil(buckets.length / 8);
    buckets.forEach(function (b, n) {
      var x = padL + n * slot + (slot - bw) / 2;
      var h = (b.value / top) * plotH;
      var y = padT + plotH - h;
      var r = Math.min(4, bw / 2, h);
      if (h > 0) svg += '<path class="bar" d="M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + r) + 'V' + (y + h) + 'Z"/>';
      if (n % labelEvery === 0) svg += '<text class="tick" x="' + (x + bw / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + fmtDay(b.date) + '</text>';
      // alvo de hover da coluna inteira, maior que a barra
      svg += '<rect class="hit" x="' + (padL + n * slot) + '" y="' + padT + '" width="' + slot + '" height="' + plotH + '" data-tip="' +
        esc((weekly ? 'Semana de ' : '') + fmtDay(b.date) + ' — ' + brl(b.value) + ' em ' + b.count + (b.count === 1 ? ' venda' : ' vendas')) + '"/>';
    });
    svg += '<line class="axis" x1="' + padL + '" x2="' + (W - 6) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '"/>';
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Faturamento confirmado por ' + (weekly ? 'semana' : 'dia') + '">' + svg + '</svg>';
  }

  function renderStatusBars() {
    var counts = {};
    orders.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    var max = Math.max.apply(null, STATUS.map(function (s) { return counts[s[0]] || 0; }).concat(1));
    $('[data-status-bars]').innerHTML = STATUS.map(function (s) {
      var n = counts[s[0]] || 0;
      return '<div class="sbar"><span class="sbar-label">' + s[1] + '</span><span class="sbar-track"><span class="sbar-fill" style="width:' + (n / max) * 100 + '%"></span></span><span class="sbar-n">' + n + '</span></div>';
    }).join('');
  }

  function renderTop() {
    var map = {};
    orders.forEach(function (o) {
      if (o.status === 'cancelado') return;
      (o.items || []).forEach(function (i) {
        var k = i.sku || i.id;
        var row = map[k] || (map[k] = { sku: i.sku, title: i.title, qty: 0, value: 0, sold: 0 });
        row.qty += Number(i.qty) || 0;
        row.value += (Number(i.qty) || 0) * (Number(i.price) || 0);
        if (CONFIRMED[o.status]) row.sold += Number(i.qty) || 0;
      });
    });
    var rows = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.qty - a.qty || b.value - a.value; }).slice(0, 10);
    $('[data-top]').innerHTML = rows.length
      ? '<thead><tr><th>Produto</th><th>Ref.</th><th class="num">Pedidos</th><th class="num">Vendidos</th><th class="num">Valor pedido</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + esc(r.title) + '</td><td>' + esc(r.sku) + '</td><td class="num">' + r.qty + '</td><td class="num">' + r.sold + '</td><td class="num">' + brl(r.value) + '</td></tr>'; }).join('') + '</tbody>'
      : '<tbody><tr><td class="dash-empty">Nenhum pedido no período.</td></tr></tbody>';
  }

  /* ---------- Pedidos ---------- */
  var fmtDate = function (iso) { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  var waLink = function (phone) { var d = String(phone || '').replace(/\D/g, ''); return d.length >= 10 ? 'https://wa.me/55' + d : ''; };
  function renderOrders() {
    var filter = $('[data-status-filter]').value;
    var list = orders.filter(function (o) { return !filter || o.status === filter; });
    $('[data-orders]').innerHTML = list.slice(0, 200).map(function (o) {
      var wa = waLink(o.customer_phone);
      return '<article class="order" data-order="' + o.id + '">' +
        '<div class="order-main"><div class="order-when">' + fmtDate(o.created_at) + '<small>#' + esc(String(o.id).slice(0, 8).toUpperCase()) + '</small><small>' + (o.source === 'produto' ? 'compra direta' : o.source === 'manual' ? 'lançado à mão' : 'carrinho') + '</small></div>' +
        '<div class="order-who"><strong>' + esc(o.customer_name || 'Cliente sem cadastro') + '</strong>' +
        (o.customer_phone ? (wa ? '<a href="' + wa + '" target="_blank" rel="noopener">' + esc(o.customer_phone) + '</a>' : '<span>' + esc(o.customer_phone) + '</span>') : '') +
        (o.vehicle ? '<span>Veículo: ' + esc(o.vehicle) + '</span>' : '') +
        (o.customer_city || o.customer_cep ? '<span>' + esc([o.customer_city, o.customer_cep].filter(Boolean).join(' — ')) + '</span>' : '') + '</div>' +
        '<ul class="order-items">' + (o.items || []).map(function (i) { return '<li>' + esc(i.qty) + '× ' + esc(i.title) + ' <small>ref. ' + esc(i.sku) + '</small></li>'; }).join('') + '</ul>' +
        '<div class="order-total">' + brl(o.total) + '</div></div>' +
        '<div class="order-foot"><label>Situação <select data-set-status>' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === o.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
        '<label>Transportadora <select data-set-carrier><option value="">—</option>' + CARRIERS.map(function (c) { return '<option' + (c === o.carrier ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
        '<label>Código de rastreio <input type="text" data-set-tracking maxlength="60" value="' + esc(o.tracking_code || '') + '" placeholder="Ex.: AA123456789BR"></label>' +
        '<label class="order-notes">Observação <input type="text" data-set-notes maxlength="2000" value="' + esc(o.notes || '') + '" placeholder="Ex.: pago no Pix, enviado por Correios"></label></div></article>';
    }).join('') || '<p class="dash-empty">Nenhum pedido ' + (filter ? 'nessa situação' : 'no período') + '.</p>';
  }
  function updateOrder(id, patch) {
    var order = orders.filter(function (o) { return o.id === id; })[0];
    if (!order) return;
    var before = {}; Object.keys(patch).forEach(function (k) { before[k] = order[k]; order[k] = patch[k]; });
    patch.updated_at = new Date().toISOString();
    ensureSession().then(function () {
      return call('/rest/v1/orders?id=eq.' + id, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
    }).then(function () { render(); toast('Pedido atualizado.'); }, function (err) {
      Object.keys(before).forEach(function (k) { order[k] = before[k]; });
      render();
      toast('Não foi possível salvar (' + (err.status || 'sem conexão') + ').', true);
    });
  }

  function renderCustomers() {
    $('[data-customers]').innerHTML = customers.length
      ? '<thead><tr><th>Data</th><th>Nome</th><th>WhatsApp</th><th>Veículo</th><th>Cidade</th><th>Ofertas</th></tr></thead><tbody>' +
        customers.slice(0, 300).map(function (c) {
          var wa = waLink(c.phone);
          return '<tr><td>' + fmtDate(c.created_at) + '</td><td>' + esc(c.name) + '</td><td>' + (wa ? '<a href="' + wa + '" target="_blank" rel="noopener">' + esc(c.phone) + '</a>' : esc(c.phone)) + '</td><td>' + esc(c.vehicle || '—') + '</td><td>' + esc(c.city || '—') + '</td><td>' + (c.accepts_offers ? 'sim' : 'não') + '</td></tr>';
        }).join('') + '</tbody>'
      : '<tbody><tr><td class="dash-empty">Nenhum cadastro no período.</td></tr></tbody>';
  }

  function render() { renderKpis(); renderChart(); renderStatusBars(); renderTop(); renderOrders(); renderCustomers(); }

  /* ---------- Exportar ---------- */
  function exportCsv() {
    var cell = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [['data', 'situacao', 'origem', 'cliente', 'whatsapp', 'email', 'cidade', 'cep', 'veiculo', 'itens', 'total', 'observacao'].join(';')];
    orders.forEach(function (o) {
      lines.push([new Date(o.created_at).toLocaleString('pt-BR'), LABEL[o.status], o.source, o.customer_name, o.customer_phone, o.customer_email, o.customer_city, o.customer_cep, o.vehicle,
        (o.items || []).map(function (i) { return i.qty + 'x ' + i.title + ' (ref. ' + i.sku + ')'; }).join(' | '), String(o.total).replace('.', ','), o.notes].map(cell).join(';'));
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'pedidos-marcha-forte.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- Interface ---------- */
  var toastTimer;
  function toast(text, isError) {
    var el = $('[data-toast]');
    el.textContent = text; el.classList.toggle('is-error', Boolean(isError)); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, isError ? 7000 : 2500);
  }
  var tip = $('[data-tip]');
  document.addEventListener('pointermove', function (e) {
    var hit = e.target.closest && e.target.closest('[data-tip]');
    if (!hit || hit === tip) { tip.hidden = true; return; }
    tip.textContent = hit.getAttribute('data-tip');
    tip.hidden = false;
    tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - tip.offsetHeight - 10) + 'px';
  });
  document.addEventListener('change', function (e) {
    var row = e.target.closest('[data-order]');
    if (row && e.target.matches('[data-set-status]')) updateOrder(row.getAttribute('data-order'), { status: e.target.value });
    else if (row && e.target.matches('[data-set-carrier]')) updateOrder(row.getAttribute('data-order'), { carrier: e.target.value || null });
    else if (row && e.target.matches('[data-set-tracking]')) updateOrder(row.getAttribute('data-order'), { tracking_code: e.target.value.trim().toUpperCase() || null });
    else if (row && e.target.matches('[data-set-notes]')) updateOrder(row.getAttribute('data-order'), { notes: e.target.value.trim() || null });
    else if (e.target.matches('[data-period]')) load().catch(fail);
    else if (e.target.matches('[data-status-filter]')) renderOrders();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) logout();
    else if (e.target.closest('[data-refresh]')) load().then(function () { toast('Dados atualizados.'); }, fail);
    else if (e.target.closest('[data-export]')) exportCsv();
  });
  $('[data-status-filter]').insertAdjacentHTML('beforeend', STATUS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join(''));

  function enter() {
    $('[data-view-login]').hidden = true;
    $('[data-view-app]').hidden = false;
    $('[data-logout]').hidden = false;
    $('[data-user]').textContent = session.email || '';
    $('[data-user]').hidden = !session.email;
    return load();
  }
  var form = $('[data-login-form]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = $('[data-login-error]');
    errEl.hidden = true;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    call('/auth/v1/token?grant_type=password', { method: 'POST', anon: true, body: { email: form.elements.email.value.trim(), password: form.elements.password.value } })
      .then(function (data) {
        saveSession(data);
        // Conta existe mas não está na tabela `admins`: o banco não entrega nada, então nem deixa entrar.
        return call('/rest/v1/admins?select=user_id&limit=1').then(function (rows) {
          if (!rows || !rows.length) { session = null; try { sessionStorage.removeItem(SKEY); } catch (err) { /* ignora */ } throw Object.assign(new Error('não é admin'), { status: 403 }); }
          return enter();
        });
      })
      .catch(function (err) {
        errEl.textContent = err.status === 400 ? 'E-mail ou senha incorretos.' : err.status === 403 ? 'Esta conta não é de administrador.' : 'Não foi possível entrar (' + (err.status || 'sem conexão') + ').';
        errEl.hidden = false;
      })
      .then(function () { btn.disabled = false; form.elements.password.value = ''; });
  });

  try { session = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  if (session && session.refresh_token) enter().catch(function () { session = null; $('[data-view-app]').hidden = true; $('[data-logout]').hidden = true; $('[data-view-login]').hidden = false; });
  else $('[data-view-login]').hidden = false;
})();
