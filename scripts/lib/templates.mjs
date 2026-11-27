// HTML da loja. Tudo é gerado estaticamente por scripts/build.mjs.
import { GROUPS, TYPES } from './knowledge.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const brl = (v) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const attrJson = (o) => esc(JSON.stringify(o));
// Banco de vendas (Supabase) configurado? Sem ele o site funciona igual, só não registra pedidos.
export const hasDb = (cfg) => Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
export const waUrl =(cfg, text) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;

const ICON = {
  wa: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.200 8.200 0 0 1-4.200-1.150l-.3-.180-3 .8.8-2.900-.2-.3A8.200 8.200 0 1 1 12 20.200Zm4.500-6.100c-.250-.130-1.470-.720-1.700-.800-.230-.090-.400-.130-.560.120-.170.250-.640.800-.790.970-.140.160-.290.180-.540.060a6.700 6.700 0 0 1-3.360-2.940c-.250-.440.250-.400.720-1.350.080-.160.040-.300-.020-.430-.060-.120-.560-1.350-.770-1.850-.200-.480-.400-.420-.560-.430h-.480a.920.920 0 0 0-.660.310c-.230.250-.870.850-.870 2.070s.890 2.400 1.010 2.570c.130.160 1.750 2.670 4.240 3.740 1.580.680 2.200.740 2.990.620.480-.070 1.470-.600 1.680-1.180.200-.580.200-1.080.140-1.180-.060-.110-.220-.170-.470-.300Z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.600 12.400a1 1 0 0 0 1 .8h9.300a1 1 0 0 0 1-.8L20.500 7H6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.600-6.500 8-6.500s8 2.500 8 6.500"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

// Marca: grade de marchas em "H" com a alavanca engatada.
const logo = (base) => `<a class="logo" href="${base}index.html" aria-label="Marcha Forte — página inicial">
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#FFB703"/><path d="M11 10v20M20 10v20M29 10v20M11 20h18" stroke="#111418" stroke-width="3.400" stroke-linecap="round" fill="none"/><circle cx="29" cy="10" r="4.600" fill="#111418"/></svg>
  <span class="logo-text">MARCHA<b>FORTE</b></span></a>`;

function shell({ cfg, base, title, description, canonical, body, head = '', scripts = '', bodyAttrs = '', after = '', minimal = false }) {
  const helpText = `Olá! Vim pelo site da ${cfg.name} e preciso de ajuda para encontrar uma peça.`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="pt_BR">
<meta name="theme-color" content="#111418">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,600;0,700;1,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/styles.css">
${head}
</head>
<body${bodyAttrs}>
<div class="topbar"><div class="wrap">
  <span>${ICON.check} Garantia de ${cfg.warrantyDays} dias</span>
  <span>${ICON.check} Compatibilidade confirmada antes de você pagar</span>
  <span class="hide-sm">${ICON.check} Atendimento direto no WhatsApp</span>
</div></div>
<header class="header"><div class="wrap header-in">
  ${logo(base)}
  <form class="hsearch" action="${base}index.html" method="get" role="search">
    <input type="search" name="q" placeholder="Busque por peça, veículo ou código (ex.: coxim Palio, 55564395)" aria-label="Buscar peças">
    <button type="submit" aria-label="Buscar">${ICON.search}</button>
  </form>
  <a class="hlink hide-sm" href="${esc(waUrl(cfg, helpText))}" target="_blank" rel="noopener">${ICON.wa}<span>Fale conosco</span></a>
  <button class="acct-btn" type="button" data-acct-open aria-label="Cadastro do cliente">${ICON.user}<span data-acct-label>Cadastre-se</span></button>
  <button class="cart-btn" type="button" data-cart-open aria-label="Abrir carrinho">${ICON.cart}<span class="cart-count" data-cart-count hidden>0</span></button>
</div></header>
${body}
<footer class="footer"><div class="wrap footer-in">
  <div>
    ${logo(base)}
    <p>${esc(cfg.tagline)}. Coxins, arrefecimento, suspensão e peças de motor para as principais montadoras.</p>
  </div>
  <div>
    <h4>Categorias</h4>
    <ul>${GROUPS.map((g) => `<li><a href="${base}index.html?grupo=${g.id}#catalogo">${esc(g.label)}</a></li>`).join('')}</ul>
  </div>
  <div>
    <h4>Atendimento</h4>
    <ul>
      <li><a href="${esc(waUrl(cfg, helpText))}" target="_blank" rel="noopener">WhatsApp</a></li>
      ${cfg.instagram ? `<li><a href="https://instagram.com/${esc(cfg.instagram)}" target="_blank" rel="noopener">Instagram @${esc(cfg.instagram)}</a></li>` : ''}
      <li><a href="${base}index.html#como-comprar">Como comprar</a></li>
      <li><a href="${base}admin/index.html" rel="nofollow">Área do administrador</a></li>
      <li><a href="${base}index.html#duvidas">Dúvidas frequentes</a></li>
      <li><a href="${base}minha-conta.html">Minha conta e pedidos</a></li>
    </ul>
    ${cfg.cityLine ? `<p>${esc(cfg.cityLine)}</p>` : ''}
  </div>
</div>
<div class="wrap footer-note">As aplicações listadas são referência. Confirme sempre pelo código da peça ou pelo chassi antes da instalação. Marcas e modelos citados pertencem aos seus fabricantes e aparecem apenas para indicar compatibilidade.</div>
</footer>

<a class="wa-float" href="${esc(waUrl(cfg, helpText))}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ICON.wa}</a>

<div class="drawer-backdrop" data-cart-close hidden></div>
<aside class="drawer" data-cart-drawer aria-label="Carrinho" hidden>
  <div class="drawer-head"><h2>Seu carrinho</h2><button type="button" data-cart-close aria-label="Fechar carrinho">${ICON.close}</button></div>
  <div class="drawer-items" data-cart-items></div>
  <div class="drawer-foot">
    <div class="drawer-acct" data-cart-acct></div>
    <label class="vehicle-field">Seu veículo <small>(modelo, ano e motor — ou placa/chassi)</small>
      <input type="text" data-cart-vehicle placeholder="Ex.: Palio 1.0 Fire 2012" autocomplete="off">
    </label>
    <div class="drawer-total"><span>Total das peças</span><strong data-cart-total>R$ 0,00</strong></div>
    <a class="btn btn-primary btn-lg btn-block" data-cart-go href="${base}checkout.html">Finalizar compra</a>
    <p class="drawer-note">Na próxima etapa você confere seus dados e o endereço de entrega. Nada é cobrado agora.${hasDb(cfg) ? ' Ao finalizar, o pedido também fica registrado na loja.' : ''}</p>
  </div>
</aside>
<div class="modal-backdrop" data-acct-close hidden></div>
<div class="modal" data-acct-modal role="dialog" aria-modal="true" aria-labelledby="acct-title" hidden>
  <div class="modal-head"><h2 id="acct-title" data-acct-title>Cadastre-se</h2><button type="button" data-acct-close aria-label="Fechar">${ICON.close}</button></div>
  <form class="acct-form" data-acct-form novalidate>
    <p class="acct-intro" data-acct-intro>É opcional e leva 30 segundos. Seus pedidos pelo WhatsApp já saem com seus dados e o seu veículo preenchidos.</p>
    <label>Nome completo<input type="text" name="name" autocomplete="name" required></label>
    <label>WhatsApp com DDD<input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" placeholder="(11) 99999-9999" required></label>
    <label>E-mail <small>(opcional)</small><input type="email" name="email" autocomplete="email"></label>
    <div class="acct-row">
      <label>CEP <small>(opcional)</small><input type="text" name="cep" autocomplete="postal-code" inputmode="numeric" placeholder="00000-000"></label>
      <label>Cidade / UF <small>(opcional)</small><input type="text" name="city" autocomplete="address-level2" placeholder="São Paulo / SP"></label>
    </div>
    <label>Seu veículo <small>(modelo, ano e motor)</small><input type="text" name="vehicle" autocomplete="off" placeholder="Ex.: Palio 1.0 Fire 2012"></label>
    <label class="acct-check"><input type="checkbox" name="offers"> Quero receber ofertas da ${esc(cfg.name)} pelo WhatsApp</label>
    <p class="acct-error" data-acct-error role="alert" hidden></p>
    <button class="btn btn-primary btn-block btn-lg" type="submit">Salvar cadastro</button>
    <p class="acct-privacy">${hasDb(cfg)
    ? `Ao salvar, seu cadastro é enviado à ${esc(cfg.name)} e usado apenas para atender seus pedidos${''} e, se você marcar a opção acima, para enviar ofertas. Para pedir a exclusão, fale com a gente pelo WhatsApp.`
    : `Seus dados ficam guardados apenas neste aparelho e só chegam à ${esc(cfg.name)} quando você envia um pedido ou o cadastro pelo WhatsApp. Você pode apagar quando quiser.`}</p>
    <button class="acct-remove" type="button" data-acct-remove hidden>Apagar meu cadastro deste aparelho</button>
  </form>
  <div class="acct-done" data-acct-done hidden>
    <p class="acct-done-title">${ICON.check} Cadastro salvo!</p>
    <p>A partir de agora seus pedidos já saem com seus dados. Quer avisar a loja para agilizar o primeiro atendimento?</p>
    <a class="btn btn-wa btn-block" data-acct-send href="#" target="_blank" rel="noopener">${ICON.wa} Enviar meu cadastro para a loja</a>
    <button class="btn btn-ghost btn-block" type="button" data-acct-close>Continuar comprando</button>
  </div>
</div>
<script>window.MF_CFG=${JSON.stringify({ wa: cfg.whatsapp, name: cfg.name, base, site: cfg.siteUrl, warranty: cfg.warrantyDays, db: hasDb(cfg) ? { url: cfg.supabaseUrl, key: cfg.supabaseAnonKey } : null })};</script>
${scripts}
<script src="${base}assets/app.js" defer></script>
${after}
</body>
</html>`;
}

const fitLine = (p) => {
  if (!p.brands.length) return '';
  const models = p.models.slice(0, 4).map((m) => m.label).join(', ');
  const brands = p.brands.slice(0, 2).map((b) => b.label).join(' / ');
  return models ? `${brands} · ${models}${p.models.length > 4 ? '…' : ''}` : brands;
};

const priceBlock = (p, cfg) => (cfg.showPrices && p.price ? `<strong class="price">${brl(p.price)}</strong>` : '<strong class="price price-ask">Consulte o preço</strong>');

const addData = (p, base) => attrJson({ id: p.id, t: p.title, p: p.price, sku: p.sku, img: p.images[0]?.thumb ?? '', url: `produto/${p.slug}.html` });

export function card(p, cfg, base) {
  const href = `${base}produto/${p.slug}.html`;
  const badge = !p.inStock ? '<span class="badge badge-out">Sob consulta</span>' : p.low ? '<span class="badge badge-low">Poucas unidades</span>' : '';
  return `<article class="card${p.inStock ? '' : ' is-out'}" data-id="${p.id}">
  <a class="card-img" href="${href}" tabindex="-1" aria-hidden="true">${p.images[0] ? `<img loading="lazy" decoding="async" width="300" height="300" src="${esc(p.images[0].thumb)}" alt="">` : ''}${badge}</a>
  <div class="card-body">
    <p class="card-type">${esc(p.type.label)}</p>
    <h3><a href="${href}">${esc(p.title)}</a></h3>
    <p class="card-fit">${esc(fitLine(p))}</p>
    <div class="card-foot">${priceBlock(p, cfg)}
      ${p.inStock ? `<button class="btn btn-add" type="button" data-add="${addData(p, base)}">Adicionar</button>` : `<a class="btn btn-ghost" href="${href}">Ver peça</a>`}
    </div>
  </div>
</article>`;
}

const HOME_FAQ = (cfg) => [
  ['Como sei se a peça serve no meu carro?', 'Cada página de produto traz a lista de aplicação e os códigos de referência (OEM). Se ficar na dúvida, mande pelo WhatsApp o modelo, o ano e o motor do veículo — ou o número do chassi — e a gente confere antes de você pagar.'],
  ['Como faço o pedido?', 'Adicione as peças ao carrinho e toque em “Finalizar pedido no WhatsApp”. O pedido chega pronto para o nosso atendimento, que confirma a compatibilidade, o frete e a forma de pagamento com você.'],
  ['As peças têm garantia?', `Sim. Todas as peças têm garantia de ${cfg.warrantyDays} dias contra defeito de fabricação.`],
  ['Posso buscar pelo código da peça?', 'Pode. Digite o código original (OEM) ou o código gravado na peça antiga no campo de busca. Também dá para buscar por nome da peça e modelo do veículo.'],
  ['Não achei a peça que procuro. E agora?', 'Chame a gente no WhatsApp com os dados do veículo e a peça que você precisa. Se não estiver no site, verificamos a disponibilidade para você.'],
];

const faqHtml = (items) => items.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
const faqLd = (items) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>`;

export function homePage({ cfg, products, brandOptions, groupCounts, typeCounts, groupImages = {} }) {
  const base = '';
  const faq = HOME_FAQ(cfg);
  const help = `Olá! Vim pelo site da ${cfg.name}. Meu veículo é: `;
  const body = `
<section class="hero"><div class="wrap hero-in">
  <div class="hero-copy">
    <p class="eyebrow">Autopeças · reposição</p>
    <h1>Peça certa,<br><em>encaixe certo.</em></h1>
    <p class="hero-sub">${products.length} peças de motor, câmbio, suspensão e arrefecimento para ${brandOptions.length} montadoras. Diga o modelo, o ano e o motor: a gente confirma a compatibilidade <strong>antes de você pagar</strong>.</p>
    <ul class="hero-points">
      <li>${ICON.check} Aplicação e código original em cada peça</li>
      <li>${ICON.check} Garantia de ${cfg.warrantyDays} dias</li>
      <li>${ICON.check} Pedido rápido pelo WhatsApp</li>
    </ul>
  </div>
  <form class="finder" data-finder>
    <h2>Encontre a peça do seu veículo</h2>
    <label>Montadora
      <select data-f-brand><option value="">Selecione</option>${brandOptions.map((b) => `<option value="${b.id}">${esc(b.label)} (${b.count})</option>`).join('')}</select>
    </label>
    <label>Modelo
      <select data-f-model disabled><option value="">Todos os modelos</option></select>
    </label>
    <label>Peça <small>(opcional)</small>
      <select data-f-type><option value="">Todas as peças</option>${TYPES.filter((t) => typeCounts[t.id]).map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select>
    </label>
    <button class="btn btn-primary btn-block" type="submit">Ver peças compatíveis</button>
    <a class="finder-alt" href="${esc(waUrl(cfg, help))}" target="_blank" rel="noopener">Prefere ajuda? Mande os dados do veículo no WhatsApp</a>
  </form>
</div><div class="hazard" aria-hidden="true"></div></section>

<section class="groups"><div class="wrap">
  <h2 class="section-title">Compre por sistema</h2>
  <div class="group-grid">
    ${GROUPS.filter((g) => groupCounts[g.id]).map((g) => `<a class="group" href="?grupo=${g.id}#catalogo" data-group-link="${g.id}">${groupImages[g.id] ? `<img class="group-img" loading="lazy" decoding="async" width="88" height="88" src="${esc(groupImages[g.id])}" alt="">` : ''}<strong>${esc(g.label)}</strong><span>${groupCounts[g.id]} ${groupCounts[g.id] === 1 ? 'peça' : 'peças'}</span></a>`).join('')}
  </div>
</div></section>

<section class="catalog" id="catalogo"><div class="wrap">
  <div class="catalog-head">
    <h2 class="section-title">Catálogo completo</h2>
    <p class="result-count" data-count aria-live="polite">${products.length} peças</p>
  </div>
  <div class="filters" data-filters>
    <label class="f-search">${ICON.search}<input type="search" data-q placeholder="Peça, veículo ou código" aria-label="Buscar no catálogo"></label>
    <select data-brand aria-label="Montadora"><option value="">Todas as montadoras</option>${brandOptions.map((b) => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select>
    <select data-model aria-label="Modelo" disabled><option value="">Todos os modelos</option></select>
    <select data-type aria-label="Tipo de peça"><option value="">Todos os tipos de peça</option>${GROUPS.filter((g) => groupCounts[g.id]).map((g) => `<optgroup label="${esc(g.label)}"><option value="g:${g.id}">Tudo em ${esc(g.short)}</option>${TYPES.filter((t) => t.group === g.id && typeCounts[t.id]).map((t) => `<option value="${t.id}">${esc(t.label)} (${typeCounts[t.id]})</option>`).join('')}</optgroup>`).join('')}</select>
    <select data-sort aria-label="Ordenar"><option value="">Ordenar: destaques</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="az">Nome A–Z</option></select>
    <button class="btn btn-ghost" type="button" data-clear hidden>Limpar filtros</button>
  </div>
  <div class="grid" data-grid>
    ${products.map((p) => card(p, cfg, base)).join('\n')}
  </div>
  <div class="empty" data-empty hidden>
    <h3>Nenhuma peça encontrada com esses filtros</h3>
    <p>Isso não quer dizer que a gente não tenha. Mande o modelo, o ano e o motor do veículo que procuramos para você.</p>
    <a class="btn btn-wa" href="${esc(waUrl(cfg, help))}" target="_blank" rel="noopener" data-consult>${ICON.wa} Faça uma consulta</a>
  </div>
  <div class="more"><button class="btn btn-dark" type="button" data-more hidden>Mostrar mais peças</button></div>
</div></section>

<section class="signup" id="cadastro"><div class="wrap signup-in">
  <div>
    <p class="eyebrow">Opcional</p>
    <h2>Cadastre-se e peça mais rápido</h2>
    <ul>
      <li>${ICON.check} Seus dados e o seu veículo já vão preenchidos em cada pedido</li>
      <li>${ICON.check} O atendimento confirma a compatibilidade sem precisar perguntar tudo de novo</li>
      <li>${ICON.check} Você escolhe se quer receber ofertas pelo WhatsApp</li>
    </ul>
  </div>
  <div class="signup-cta">
    <button class="btn btn-primary btn-lg" type="button" data-acct-open>Fazer meu cadastro</button>
    <span>Prefere não se cadastrar? Sem problema: é só comprar normalmente.</span>
  </div>
</div></section>

<section class="steps" id="como-comprar"><div class="wrap">
  <h2 class="section-title">Como comprar em 3 passos</h2>
  <ol class="step-grid">
    <li><span>1</span><h3>Escolha a peça</h3><p>Filtre por montadora e modelo ou busque direto pelo código original. Cada peça mostra aplicação, medidas e códigos de referência.</p></li>
    <li><span>2</span><h3>Envie o pedido</h3><p>Monte o carrinho, informe o veículo e finalize pelo WhatsApp. Seu pedido chega organizado para o atendimento.</p></li>
    <li><span>3</span><h3>Confirmamos e despachamos</h3><p>Conferimos a compatibilidade com o seu veículo, combinamos frete e pagamento e a peça segue para você.</p></li>
  </ol>
</div></section>

<section class="why"><div class="wrap why-in">
  <div>
    <h2 class="section-title">Comprar peça errada custa caro.<br>A gente confere antes.</h2>
    <p>Peça que não serve significa carro parado, mecânico esperando e frete de devolução. Por isso, na ${esc(cfg.name)} toda venda passa pela conferência de aplicação: modelo, ano, motor e, quando preciso, chassi.</p>
  </div>
  <ul class="why-list">
    <li><h3>Ficha completa</h3><p>Aplicação por modelo e ano, códigos OEM, especificações e orientações de instalação em cada produto.</p></li>
    <li><h3>Busca por código</h3><p>Tem a peça antiga em mãos? Digite o código gravado nela e vá direto ao produto.</p></li>
    <li><h3>Gente que entende</h3><p>Atendimento humano no WhatsApp para tirar dúvidas técnicas antes e depois da compra.</p></li>
    <li><h3>Garantia de ${cfg.warrantyDays} dias</h3><p>Cobertura contra defeito de fabricação em todas as peças.</p></li>
  </ul>
</div></section>

<section class="faq-sec" id="duvidas"><div class="wrap narrow">
  <h2 class="section-title">Dúvidas frequentes</h2>
  ${faqHtml(faq)}
</div></section>

<section class="cta"><div class="wrap cta-in">
  <div><h2>Não sabe qual peça é a certa?</h2><p>Mande uma foto da peça antiga ou os dados do veículo. A gente identifica para você.</p></div>
  <a class="btn btn-wa btn-lg" href="${esc(waUrl(cfg, help))}" target="_blank" rel="noopener">${ICON.wa} Chamar no WhatsApp</a>
</div></section>`;

  return shell({
    cfg, base,
    title: `${cfg.name} — Autopeças: coxins, arrefecimento, suspensão e motor`,
    description: `${products.length} autopeças com aplicação e código original: coxins de motor e câmbio, válvulas termostáticas, mangueiras, sensores e mais. Compatibilidade confirmada pelo WhatsApp e garantia de ${cfg.warrantyDays} dias.`,
    canonical: cfg.siteUrl ? `${cfg.siteUrl}/` : '',
    body,
    head: faqLd(faq),
    scripts: `<script src="assets/catalog.js" defer></script>`,
  });
}

const list = (items, cls = '') => `<ul class="${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
const isSubhead = (l) => (/[:：]$/.test(l) && l.length < 40) || (l.length < 28 && !/\d/.test(l) && l === l.toUpperCase() && /\p{L}{3}/u.test(l));

// Área do cliente. O conteúdo é montado no navegador (src/assets/account.js) a partir do
// cadastro e do histórico guardados no aparelho, mais o andamento vindo do banco quando há um.
export function accountPage({ cfg }) {
  const base = '';
  const body = `
<main class="wrap acc" data-account>
  <div class="acc-head">
    <div>
      <p class="eyebrow">Minha conta</p>
      <h1 data-acc-hello>Minha conta</h1>
      <p class="acc-sub" data-acc-sub></p>
    </div>
    <a class="btn btn-ghost" href="index.html#catalogo">Continuar comprando</a>
  </div>

  <nav class="acc-tabs" role="tablist" aria-label="Seções da conta">
    <button type="button" role="tab" data-tab="pedidos" aria-selected="true">Meus pedidos</button>
    <button type="button" role="tab" data-tab="dados" aria-selected="false">Meus dados</button>
    <button type="button" role="tab" data-tab="enderecos" aria-selected="false">Meus endereços</button>
    <button type="button" role="tab" data-tab="veiculos" aria-selected="false">Meus veículos</button>
    <button type="button" role="tab" data-tab="ajuda" aria-selected="false">Ajuda</button>
  </nav>

  <section class="acc-panel" data-panel="pedidos">
    <div class="acc-tools"><button class="btn btn-ghost" type="button" data-acc-refresh hidden>Atualizar andamento</button></div>
    <div class="acc-track" data-track hidden></div>
    <div data-orders></div>
  </section>

  <section class="acc-panel" data-panel="dados" hidden>
    <form class="acc-card acct-form" data-acc-form novalidate>
      <h2>Meus dados</h2>
      <p class="acct-intro" data-acc-form-intro></p>
      <label>Nome completo<input type="text" name="name" autocomplete="name" required></label>
      <label>WhatsApp com DDD<input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" placeholder="(11) 99999-9999" required></label>
      <label>E-mail <small>(opcional)</small><input type="email" name="email" autocomplete="email"></label>
      <div class="acct-row">
        <label>CEP <small>(opcional)</small><input type="text" name="cep" autocomplete="postal-code" inputmode="numeric" placeholder="00000-000"></label>
        <label>Cidade / UF <small>(opcional)</small><input type="text" name="city" autocomplete="address-level2" placeholder="São Paulo / SP"></label>
      </div>
      <label class="acct-check"><input type="checkbox" name="offers"> Quero receber ofertas da ${esc(cfg.name)} pelo WhatsApp</label>
      <p class="acct-error" data-acc-error role="alert" hidden></p>
      <button class="btn btn-primary btn-lg" type="submit">Salvar meus dados</button>
      <p class="acct-privacy">${hasDb(cfg)
    ? `Seu cadastro é enviado à ${esc(cfg.name)} quando você o cria e segue junto com cada pedido. Para corrigir ou excluir os dados que estão com a loja, fale com a gente pelo WhatsApp.`
    : `Seus dados ficam guardados apenas neste aparelho e só chegam à ${esc(cfg.name)} junto com os pedidos que você envia pelo WhatsApp.`}</p>
    </form>
    <div class="acc-card acc-danger" data-acc-danger hidden>
      <h2>Privacidade</h2>
      <p>Você pode apagar deste aparelho o cadastro, os veículos e o histórico de pedidos. Isso não cancela pedidos já enviados.</p>
      <button class="btn btn-ghost" type="button" data-acc-wipe>Apagar meus dados deste aparelho</button>
    </div>
  </section>

  <section class="acc-panel" data-panel="enderecos" hidden>
    <div class="acc-card">
      <h2>Meus endereços</h2>
      <p class="acct-intro">Salve mais de um endereço de entrega (casa, oficina, trabalho) e escolha na hora de finalizar a compra.</p>
      <ul class="acc-cars" data-addrs></ul>
      <button class="btn btn-dark" type="button" data-addr-new>Adicionar endereço</button>
      <form class="acct-form acc-addr-form" data-addr-form novalidate hidden>
        ${addressFields()}
        <p class="acct-error" data-addr-error role="alert" hidden></p>
        <div class="adm-actions"><button class="btn btn-ghost" type="button" data-addr-cancel>Cancelar</button><button class="btn btn-primary" type="submit">Salvar endereço</button></div>
      </form>
    </div>
  </section>

  <section class="acc-panel" data-panel="veiculos" hidden>
    <div class="acc-card">
      <h2>Meus veículos</h2>
      <p class="acct-intro">O veículo principal já vai preenchido nos seus pedidos, para a gente confirmar a compatibilidade mais rápido.</p>
      <ul class="acc-cars" data-cars></ul>
      <form class="acc-car-form" data-car-form>
        <input type="text" name="car" maxlength="80" placeholder="Ex.: Palio 1.0 Fire 2012" aria-label="Novo veículo (modelo, ano e motor)" required>
        <button class="btn btn-dark" type="submit">Adicionar</button>
      </form>
    </div>
  </section>

  <section class="acc-panel" data-panel="ajuda" hidden>
    <div class="acc-help">
      <div class="acc-card"><h2>Garantia</h2><p>Todas as peças têm ${cfg.warrantyDays} dias de garantia contra defeito de fabricação. Para acionar, fale com a gente informando o número do pedido.</p></div>
      <div class="acc-card"><h2>A peça não serviu?</h2><p>Chame o atendimento antes de instalar. Tenha em mãos o número do pedido e os dados do veículo (modelo, ano, motor ou chassi).</p></div>
      <div class="acc-card"><h2>Acompanhar a entrega</h2><p>Quando o pedido é despachado, o código de rastreio aparece em “Meus pedidos”. O prazo e a forma de envio são combinados no atendimento.</p></div>
      <div class="acc-card"><h2>Falar com a loja</h2><p>O atendimento é feito pelo WhatsApp.</p><a class="btn btn-wa" href="${esc(waUrl(cfg, `Olá! Preciso de ajuda com a minha conta na ${cfg.name}.`))}" target="_blank" rel="noopener">${ICON.wa} Abrir o WhatsApp</a></div>
    </div>
  </section>
</main>`;
  return shell({
    cfg, base,
    title: `Minha conta | ${cfg.name}`,
    description: `Acompanhe seus pedidos, o rastreio e seus dados cadastrados na ${cfg.name}.`,
    canonical: '',
    body,
    head: '<meta name="robots" content="noindex">',
    scripts: '',
    bodyAttrs: ' data-account-page',
    after: '<script src="assets/address.js" defer></script>\n<script src="assets/account.js" defer></script>',
  });
}

// Campos de endereço, usados no checkout e em "Meus endereços".
const addressFields = () => `
      <div class="addr-grid">
        <label class="a-cep">CEP<input type="text" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"><small data-cep-status></small></label>
        <label class="a-street">Rua / avenida<input type="text" name="street" autocomplete="address-line1" maxlength="120"></label>
        <label class="a-number">Número<input type="text" name="number" inputmode="numeric" maxlength="12"></label>
        <label class="a-comp">Complemento <small>(opcional)</small><input type="text" name="comp" autocomplete="address-line2" maxlength="60" placeholder="Apto, bloco, sala"></label>
        <label class="a-district">Bairro<input type="text" name="district" maxlength="80"></label>
        <label class="a-city">Cidade<input type="text" name="city" autocomplete="address-level2" maxlength="80"></label>
        <label class="a-uf">UF<input type="text" name="uf" autocomplete="address-level1" maxlength="2" placeholder="SP"></label>
        <label class="a-label">Nome deste endereço <small>(opcional)</small><input type="text" name="label" maxlength="30" placeholder="Casa, oficina, trabalho"></label>
      </div>`;

// Checkout da marca: uma página só, sem distrações, que já chega preenchida para quem tem
// cadastro ou já comprou neste aparelho. O pedido é fechado no WhatsApp (não há gateway de pagamento).
export function checkoutPage({ cfg }) {
  const base = '';
  const payments = cfg.paymentOptions ?? ['Pix', 'Cartão de crédito', 'Combinar no atendimento'];
  const body = `
<div class="co-bar"><div class="wrap co-bar-in">
  <a href="index.html#catalogo">← Continuar comprando</a>
  <ol class="co-progress"><li class="is-done">Carrinho</li><li class="is-now">Seus dados</li><li>Confirmação no WhatsApp</li></ol>
</div></div>

<main class="wrap co" data-checkout>
  <div class="co-empty" data-co-empty hidden>
    <h1>Seu carrinho está vazio</h1>
    <p>Escolha as peças no catálogo e volte para finalizar.</p>
    <a class="btn btn-primary btn-lg" href="index.html#catalogo">Ver o catálogo</a>
  </div>

  <div class="co-done" data-co-done hidden>
    <p class="co-done-check">${ICON.check}</p>
    <h1>Pedido <span data-co-code></span> enviado!</h1>
    <p>Abrimos o WhatsApp com o seu pedido pronto: é só tocar em <strong>enviar</strong> na conversa. O atendimento confirma a compatibilidade, o frete e o pagamento com você.</p>
    <a class="btn btn-wa btn-lg" data-co-reopen href="#" target="_blank" rel="noopener">${ICON.wa} O WhatsApp não abriu? Toque aqui</a>
    <div class="co-done-links"><a class="btn btn-dark" href="minha-conta.html">Acompanhar meu pedido</a><a class="btn btn-ghost" href="index.html#catalogo">Voltar ao catálogo</a></div>
  </div>

  <form class="co-grid" data-co-form novalidate hidden>
    <div class="co-main">
      <h1>Finalizar compra</h1>
      <p class="co-welcome" data-co-welcome hidden></p>

      <section class="co-sec" data-sec="who">
        <header><span class="co-n">1</span><h2>Seus dados</h2><button type="button" class="co-edit" data-sec-edit hidden>Alterar</button></header>
        <div class="co-view" data-sec-view hidden></div>
        <div class="co-fields" data-sec-fields>
          <label>Nome completo<input type="text" name="name" autocomplete="name" maxlength="120"></label>
          <div class="co-two">
            <label>WhatsApp com DDD<input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" placeholder="(11) 99999-9999"></label>
            <label>E-mail <small>(opcional)</small><input type="email" name="email" autocomplete="email" maxlength="160"></label>
          </div>
        </div>
      </section>

      <section class="co-sec" data-sec="ship">
        <header><span class="co-n">2</span><h2>Entrega</h2></header>
        <div class="co-options" data-addr-list></div>
        <div class="co-fields" data-addr-form hidden>${addressFields()}</div>
        <p class="co-hint">O frete e o prazo são calculados pelo atendimento e confirmados com você antes do pagamento.</p>
      </section>

      <section class="co-sec" data-sec="car">
        <header><span class="co-n">3</span><h2>Veículo</h2></header>
        <div class="co-chips" data-car-chips></div>
        <label>Modelo, ano e motor <small>(ou placa/chassi)</small><input type="text" name="vehicle" maxlength="200" placeholder="Ex.: Palio 1.0 Fire 2012"></label>
        <p class="co-hint">Com o veículo informado, conferimos a compatibilidade de cada peça antes de fechar.</p>
      </section>

      <section class="co-sec" data-sec="pay">
        <header><span class="co-n">4</span><h2>Como prefere pagar</h2></header>
        <div class="co-pills">${payments.map((m, i) => `<label><input type="radio" name="payment" value="${esc(m)}"${i === 0 ? ' checked' : ''}><span>${esc(m)}</span></label>`).join('')}</div>
        <p class="co-hint">Nada é cobrado agora. O pagamento é combinado no atendimento, depois de confirmada a compatibilidade.</p>
        <label>Observação <small>(opcional)</small><textarea name="note" rows="2" maxlength="600" placeholder="Ex.: preciso para sexta, entregar em horário comercial"></textarea></label>
      </section>

      <label class="acct-check co-save"><input type="checkbox" name="save" checked> <span data-co-save-label>Salvar meus dados e este endereço para as próximas compras</span></label>
      <p class="acct-privacy">${hasDb(cfg)
    ? `Seus dados são usados pela ${esc(cfg.name)} apenas para atender este pedido. O CEP é consultado no serviço público ViaCEP para preencher o endereço.`
    : `Seus dados seguem para a ${esc(cfg.name)} junto com o pedido, pelo WhatsApp. O CEP é consultado no serviço público ViaCEP para preencher o endereço.`}</p>
    </div>

    <aside class="co-side">
      <div class="co-summary">
        <h2>Resumo do pedido</h2>
        <ul class="co-items" data-co-items></ul>
        <dl class="co-totals">
          <div><dt>Peças</dt><dd data-co-subtotal></dd></div>
          <div><dt>Frete</dt><dd>a confirmar</dd></div>
          <div class="co-total"><dt>Total das peças</dt><dd data-co-total></dd></div>
        </dl>
        <p class="acct-error" data-co-error role="alert" hidden></p>
        <button class="btn btn-wa btn-lg btn-block" type="submit">${ICON.wa} Enviar pedido</button>
        <ul class="co-assure">
          <li>${ICON.check} Garantia de ${cfg.warrantyDays} dias</li>
          <li>${ICON.check} Compatibilidade conferida antes do pagamento</li>
          <li>${ICON.check} Atendimento humano pelo WhatsApp</li>
        </ul>
      </div>
    </aside>
  </form>
</main>`;
  return shell({
    cfg, base,
    title: `Finalizar compra | ${cfg.name}`,
    description: `Finalize seu pedido na ${cfg.name}.`,
    canonical: '',
    body,
    head: '<meta name="robots" content="noindex">',
    bodyAttrs: ' class="is-checkout" data-account-page',
    after: '<script src="assets/address.js" defer></script>\n<script src="assets/checkout.js" defer></script>',
  });
}

export function productPage({ cfg, p, related }) {
  const base = '../';
  const d = p.parsed;
  const g = GROUPS.find((x) => x.id === p.type.group);
  const priced = cfg.showPrices && p.price;
  const buyText = `Olá! Quero comprar na ${cfg.name}:\n• ${p.title} (ref. ${p.sku})${priced ? ` — ${brl(p.price)}` : ''}\n\nMeu veículo é: `;
  const askText = `Olá! Esta peça serve no meu veículo?\n• ${p.title} (ref. ${p.sku})\n\nMeu veículo é: `;
  const notifyText = `Olá! Tenho interesse nesta peça, que está sob consulta no site:\n• ${p.title} (ref. ${p.sku})\n\nMeu veículo é: `;

  const specRows = [...d.specs];
  if (!specRows.some(([k]) => /^(tipo|produto)$/i.test(k))) specRows.unshift(['Tipo de peça', p.type.singular]);
  specRows.push(['Referência da loja', p.sku]);
  if (p.gtin) specRows.push(['EAN', p.gtin]);
  specRows.push(['Garantia', `${cfg.warrantyDays} dias contra defeito de fabricação`]);

  const compat = d.compat.length
    ? `<ul class="compat">${d.compat.map((l) => `<li${isSubhead(l) ? ' class="sub"' : ''}>${esc(l)}</li>`).join('')}</ul>`
    : `<p>${p.models.length ? `Modelos indicados para esta peça: <strong>${esc(p.models.map((m) => m.label).join(', '))}</strong>.` : 'Aplicação conforme o título da peça.'} Envie o modelo, o ano e o motor do seu veículo pelo WhatsApp para confirmarmos a versão exata.</p>`;

  const faq = [
    ['Como sei se esta peça serve no meu veículo?', `Compare a aplicação e os códigos de referência desta página com a peça instalada no seu carro. Se preferir, mande o modelo, o ano e o motor — ou o chassi — pelo WhatsApp e a ${cfg.name} confirma antes de você pagar.`],
    ['Qual é a garantia?', `${cfg.warrantyDays} dias contra defeito de fabricação. Recomendamos a instalação por um profissional qualificado.`],
    ['Como faço para comprar?', 'Toque em “Comprar pelo WhatsApp” ou adicione ao carrinho para pedir várias peças de uma vez. O atendimento confirma compatibilidade, frete e forma de pagamento na conversa.'],
  ];

  const section = (id, title, html) => (html ? `<section class="pd-sec" id="${id}"><h2>${title}</h2>${html}</section>` : '');
  const symptoms = d.symptoms.length ? d.symptoms : p.type.symptoms;

  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, sku: p.sku,
    image: p.images.map((i) => i.url), description: p.metaDescription, category: p.type.label,
    ...(p.codes[0] ? { mpn: p.codes[0] } : {}), ...(p.gtin ? { gtin13: p.gtin } : {}),
    ...(priced ? { offers: { '@type': 'Offer', priceCurrency: 'BRL', price: p.price.toFixed(2), availability: `https://schema.org/${p.inStock ? 'InStock' : 'OutOfStock'}`, itemCondition: 'https://schema.org/NewCondition', ...(cfg.siteUrl ? { url: `${cfg.siteUrl}/produto/${p.slug}.html` } : {}) } } : {}),
  };

  const body = `
<main class="wrap pd">
  <nav class="crumbs" aria-label="Você está em"><a href="${base}index.html">Início</a> › <a href="${base}index.html?grupo=${g.id}#catalogo">${esc(g.label)}</a> › <a href="${base}index.html?tipo=${p.type.id}#catalogo">${esc(p.type.label)}</a></nav>

  <div class="pd-top">
    <div class="gallery" data-gallery>
      <div class="gallery-main" data-gallery-track>${p.images.length ? p.images.map((im, i) => `<img${i ? ' loading="lazy"' : ''} src="${esc(im.url)}" alt="${esc(p.title)}${i ? ` — foto ${i + 1}` : ''}" width="800" height="800">`).join('') : '<div class="noimg">Sem foto</div>'}</div>
      ${p.images.length > 1 ? `<span class="gallery-count" data-gallery-count aria-hidden="true">1/${p.images.length}</span>` : ''}
      ${p.images.length > 1 ? `<div class="gallery-thumbs">${p.images.map((im, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-gallery-thumb="${i}" aria-label="Foto ${i + 1}"><img loading="lazy" src="${esc(im.thumb)}" alt="" width="80" height="80"></button>`).join('')}</div>` : ''}
    </div>

    <div class="buy">
      <p class="card-type">${esc(p.type.label)}</p>
      <h1>${esc(p.title)}</h1>
      <p class="pd-lead">${esc(p.lead)}</p>
      ${p.codes.length ? `<p class="pd-codes"><span>Códigos de referência:</span> ${p.codes.slice(0, 6).map((c) => `<code>${esc(c)}</code>`).join(' ')}</p>` : ''}
      <div class="buy-box">
        <div class="buy-price">${priced ? `<strong class="price price-lg">${brl(p.price)}</strong>` : '<strong class="price price-lg price-ask">Consulte o preço</strong>'}
          ${p.inStock ? (p.low ? '<span class="stock stock-low">Poucas unidades disponíveis</span>' : '<span class="stock stock-ok">Disponível</span>') : '<span class="stock stock-out">Sob consulta</span>'}
        </div>
        ${p.inStock ? `<a class="btn btn-wa btn-lg btn-block" href="${esc(waUrl(cfg, buyText))}" data-buy="${addData(p, base)}" target="_blank" rel="noopener">${ICON.wa} Comprar pelo WhatsApp</a>
        <button class="btn btn-primary btn-block" type="button" data-add="${addData(p, base)}">Adicionar ao carrinho</button>`
    : `<a class="btn btn-wa btn-lg btn-block" href="${esc(waUrl(cfg, notifyText))}" target="_blank" rel="noopener">${ICON.wa} Consultar disponibilidade</a>`}
        <a class="buy-ask" href="${esc(waUrl(cfg, askText))}" target="_blank" rel="noopener">Não tem certeza se serve? <u>Confirme a compatibilidade grátis</u></a>
      </div>
      <ul class="assure">
        <li>${ICON.check} Garantia de ${cfg.warrantyDays} dias contra defeito de fabricação</li>
        <li>${ICON.check} Conferimos a aplicação com os dados do seu veículo</li>
        <li>${ICON.check} Frete e pagamento combinados no atendimento</li>
      </ul>
      ${p.models.length ? `<div class="pd-fits"><span>Serve em:</span> ${p.models.slice(0, 14).map((m) => `<a class="chip" href="${base}index.html?marca=${m.brand}&amp;modelo=${encodeURIComponent(m.label)}#catalogo">${esc(m.label)}</a>`).join('')}</div>` : ''}
    </div>
  </div>

  <div class="pd-body">
    <div class="pd-main">
      <nav class="pd-nav" aria-label="Nesta página">
        <a href="#aplicacao">Aplicação</a><a href="#especificacoes">Ficha técnica</a>${p.codes.length ? '<a href="#codigos">Códigos</a>' : ''}${symptoms.length ? '<a href="#sintomas">Quando trocar</a>' : ''}${d.install.length ? '<a href="#instalacao">Instalação</a>' : ''}<a href="#duvidas">Dúvidas</a>
      </nav>
      ${section('sobre', 'Sobre esta peça', [...d.intro, ...(d.intro.join(' ').length < 220 ? [p.type.what] : [])].map((t) => `<p>${esc(t)}</p>`).join(''))}
      ${section('aplicacao', 'Aplicação — veículos compatíveis', `${compat}<p class="hint">A compatibilidade pode variar conforme versão, motor e ano de fabricação. Na dúvida, confirme pelo código da peça ou pelo chassi.</p>`)}
      ${section('especificacoes', 'Especificações técnicas', `<div class="table-wrap"><table class="specs"><tbody>${specRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`)}
      ${section('codigos', 'Códigos de referência (OEM e equivalentes)', p.codes.length ? `<p class="code-list">${p.codes.map((c) => `<code>${esc(c)}</code>`).join(' ')}</p><p class="hint">Compare com o código gravado na peça antiga. Os códigos são citados apenas como referência de aplicação.</p>` : '')}
      ${section('beneficios', 'Benefícios', d.benefits.length ? list(d.benefits, 'ticks') : '')}
      ${section('conteudo', 'O que acompanha', d.contents.length ? list(d.contents) : '')}
      ${section('sintomas', 'Sinais de que está na hora de trocar', symptoms.length ? list(symptoms, 'ticks warn') : '')}
      ${section('instalacao', 'Instalação', d.install.map((t) => `<p>${esc(t)}</p>`).join(''))}
      ${section('importante', 'Informações importantes', d.notes.length ? list(d.notes) : '')}
      ${section('duvidas', 'Dúvidas sobre esta peça', faqHtml(faq))}
    </div>
    <aside class="pd-side">
      <div class="guide">
        <p class="eyebrow">Guia rápido</p>
        <h2>${esc(p.type.label)}: para que serve</h2>
        <p>${esc(p.type.what)}</p>
        <h3>Dica de instalação</h3>
        <p>${esc(p.type.tip)}</p>
        <a class="btn btn-wa btn-block" href="${esc(waUrl(cfg, askText))}" target="_blank" rel="noopener">${ICON.wa} Tirar dúvida técnica</a>
      </div>
    </aside>
  </div>

  ${related.length ? `<section class="related"><h2 class="section-title">Peças relacionadas</h2><div class="grid">${related.map((r) => card(r, cfg, base)).join('\n')}</div></section>` : ''}
</main>
${p.inStock ? `<div class="buybar"><div><strong>${priced ? brl(p.price) : 'Consulte'}</strong><span>${p.low ? 'Poucas unidades' : 'Disponível'}</span></div><button class="btn btn-primary" type="button" data-add="${addData(p, base)}" aria-label="Adicionar ao carrinho">+ Carrinho</button><a class="btn btn-wa" href="${esc(waUrl(cfg, buyText))}" data-buy="${addData(p, base)}" target="_blank" rel="noopener">${ICON.wa} Comprar</a></div>` : ''}`;

  return shell({
    cfg, base,
    title: `${p.title} | ${cfg.name}`,
    description: p.metaDescription,
    canonical: cfg.siteUrl ? `${cfg.siteUrl}/produto/${p.slug}.html` : '',
    body,
    head: `${p.images[0] ? `<meta property="og:image" content="${esc(p.images[0].url)}">` : ''}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
${faqLd(faq)}`,
  });
}
