// Gera o site estático em site/ a partir de data/supplier-catalog.json.
// Uso: node scripts/build.mjs
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GROUPS, TYPES, BRANDS } from './lib/knowledge.mjs';
import { norm, cleanTitle, detectType, detectVehicles, parseDescription, cleanDescriptionText, extractCodes, gtinOf, retailPrice } from './lib/normalize.mjs';
import { homePage, productPage } from './lib/templates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'site');
const cfg = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
cfg.whatsapp = String(cfg.whatsapp ?? '').replace(/\D/g, '');
cfg.siteUrl = String(cfg.siteUrl ?? '').replace(/\/+$/, '');
const raw = JSON.parse(await readFile(path.join(root, 'data', 'supplier-catalog.json'), 'utf8'));

const joinPt = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} e ${arr.at(-1)}`);

function leadFor(type, brands, models) {
  let target = '';
  if (brands.length) {
    const parts = brands.slice(0, 3).map((b) => {
      const ms = models.filter((m) => m.brand === b.id).slice(0, 5).map((m) => m.label);
      return ms.length ? `${b.label} ${joinPt(ms)}` : b.label;
    });
    target = ` para ${parts.join('; ')}${brands.length > 3 ? ' e outros' : ''}`;
  }
  return `${type.singular}${target}. Confira abaixo a aplicação, os códigos de referência e as especificações — e confirme a compatibilidade com o seu veículo pelo WhatsApp antes de comprar.`;
}

// Edições feitas no painel de admin (site/admin): { "<id do produto>": { title?, price?, description?, hidden? } }
const overrides = await readFile(path.join(root, 'data', 'overrides.json'), 'utf8').then(JSON.parse, () => ({}));
const costOf = (p) => (p.on_sale && p.sale_price ? p.sale_price : p.price);
const available = raw.products.filter((p) => p.active && !p.hidden);

const products = available
  .filter((p) => !overrides[p.id]?.hidden)
  .map((p) => {
    const ov = overrides[p.id] ?? {};
    const hasDesc = typeof ov.description === 'string' && ov.description.trim() !== '';
    const title = (typeof ov.title === 'string' && ov.title.trim()) || cleanTitle(p.name);
    const type = detectType(p.name);
    const { brands, models } = detectVehicles(p.name, hasDesc ? ov.description : p.description);
    const parsed = hasDesc ? parseDescription(ov.description, { trusted: true }) : parseDescription(p.description);
    // Descarta introdução que só repete o título.
    parsed.intro = parsed.intro.filter((t) => norm(t).replace(/\W/g, '') !== norm(p.name).replace(/\W/g, ''));
    const codes = extractCodes(p, parsed);
    const price = Number(ov.price) > 0 ? Math.round(Number(ov.price) * 100) / 100 : retailPrice(costOf(p), cfg);
    const inStock = Boolean(p.available_to_purchase);
    const lead = leadFor(type, brands, models);
    const images = (p.images ?? []).slice().sort((a, b) => a.order - b.order).map((i) => ({ url: i.url, thumb: i.thumb || i.url }));
    const fit = models.map((m) => m.label).slice(0, 8).join(', ');
    return {
      id: p.id, sku: String(p.sku ?? p.id), slug: p.slug, title, type, brands, models, parsed, codes,
      gtin: gtinOf(p), price, inStock, low: inStock && p.manage_stock && p.stock_quantity <= cfg.lowStockThreshold,
      highlight: Boolean(p.highlight), images, lead,
      metaDescription: `${title}.${fit ? ` Serve em ${fit}.` : ''}${codes.length ? ` Códigos: ${codes.slice(0, 3).join(', ')}.` : ''} Garantia de ${cfg.warrantyDays} dias e compatibilidade confirmada pelo WhatsApp.`.slice(0, 300),
      search: norm([title, type.label, type.singular, p.sku, ...codes, ...codes.map((c) => c.replace(/[.\-]/g, '')), ...brands.map((b) => b.label), ...models.map((m) => m.label)].join(' ')),
    };
  });

// Ordem de vitrine: disponíveis primeiro, destaques do fornecedor na frente, resto embaralhado de forma estável.
const shuffleKey = (id) => (Math.imul(id, 2654435761) >>> 0) % 9973;
products.sort((a, b) => b.inStock - a.inStock || b.highlight - a.highlight || shuffleKey(a.id) - shuffleKey(b.id));

const count = (keyFn) => products.reduce((acc, p) => { for (const k of [keyFn(p)].flat()) acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
const typeCounts = count((p) => p.type.id);
const groupCounts = count((p) => p.type.group);
const brandCounts = count((p) => p.brands.map((b) => b.id));
const brandOptions = BRANDS.filter((b) => brandCounts[b.id]).map((b) => ({ id: b.id, label: b.label, count: brandCounts[b.id] }))
  .sort((a, b) => b.count - a.count);
const modelsByBrand = {};
for (const p of products) for (const m of p.models) (modelsByBrand[m.brand] ??= new Set()).add(m.label);

function relatedOf(p) {
  const mine = new Set(p.models.map((m) => m.label));
  const myBrands = new Set(p.brands.map((b) => b.id));
  return products
    .filter((o) => o.id !== p.id && o.inStock)
    .map((o) => ({
      o,
      score: o.models.filter((m) => mine.has(m.label)).length * 3 + (o.type.id === p.type.id ? 2 : 0)
        + (o.type.group === p.type.group ? 1 : 0) + (o.brands.some((b) => myBrands.has(b.id)) ? 1 : 0),
    }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.o);
}

// Limpa o conteúdo sem apagar a pasta site/ (ela pode estar em uso por um servidor local).
await mkdir(out, { recursive: true });
for (const entry of await readdir(out)) await rm(path.join(out, entry), { recursive: true, force: true });
await mkdir(path.join(out, 'produto'), { recursive: true });
await cp(path.join(root, 'src', 'assets'), path.join(out, 'assets'), { recursive: true });

// Painel de admin: página estática + os valores automáticos de cada produto (base para as edições).
await cp(path.join(root, 'src', 'admin'), path.join(out, 'admin'), { recursive: true });
const adminData = {
  repo: cfg.adminRepo ?? '', branch: cfg.adminBranch ?? 'main', path: 'data/overrides.json', name: cfg.name,
  db: cfg.supabaseUrl && cfg.supabaseAnonKey ? { url: cfg.supabaseUrl.replace(/\/+$/, ''), key: cfg.supabaseAnonKey } : null,
  products: available.map((p) => ({
    id: p.id, sku: String(p.sku ?? p.id), slug: p.slug, title: cleanTitle(p.name), price: retailPrice(costOf(p), cfg),
    description: cleanDescriptionText(p.description), thumb: p.images?.[0]?.thumb ?? '', inStock: Boolean(p.available_to_purchase),
  })),
};
await writeFile(path.join(out, 'admin', 'data.js'), `window.MF_ADMIN=${JSON.stringify(adminData)};`);

// Foto de capa de cada sistema: a peça indicada em GROUPS[].cover (referência do fornecedor)
// ou, na falta dela, a primeira peça disponível do tipo mais comum do grupo.
const groupImages = {};
for (const g of GROUPS) {
  const inGroup = products.filter((p) => p.type.group === g.id && p.images[0]);
  const topType = Object.entries(inGroup.reduce((acc, p) => { acc[p.type.id] = (acc[p.type.id] ?? 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const pick = inGroup.find((p) => p.sku === g.cover) ?? inGroup.find((p) => p.type.id === topType && p.inStock) ?? inGroup[0];
  if (pick) groupImages[g.id] = pick.images[0].thumb;
}

await writeFile(path.join(out, 'index.html'), homePage({ cfg, products, brandOptions, groupCounts, typeCounts, groupImages }));
for (const p of products) {
  await writeFile(path.join(out, 'produto', `${p.slug}.html`), productPage({ cfg, p, related: relatedOf(p) }));
}

// Índice usado pelos filtros da página inicial.
const catalog = {
  items: products.map((p) => [p.id, p.search, p.type.id, p.type.group, p.brands.map((b) => b.id), p.models.map((m) => `${m.brand}:${m.label}`), p.price ?? 0, p.inStock ? 1 : 0, p.title]),
  models: Object.fromEntries(Object.entries(modelsByBrand).map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))])),
  groups: Object.fromEntries(GROUPS.map((g) => [g.id, g.label])),
  types: Object.fromEntries(TYPES.map((t) => [t.id, t.label])),
};
await writeFile(path.join(out, 'assets', 'catalog.js'), `window.MF_CATALOG=${JSON.stringify(catalog)};`);

if (cfg.siteUrl) {
  const urls = [`${cfg.siteUrl}/`, ...products.map((p) => `${cfg.siteUrl}/produto/${p.slug}.html`)];
  await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
}

console.log(`OK: ${products.length} produtos (${products.filter((p) => !p.inStock).length} sob consulta), ${brandOptions.length} montadoras → site/`);
if (!cfg.whatsapp) console.warn('ATENÇÃO: "whatsapp" está vazio em site.config.json — os botões abrem o WhatsApp sem destinatário.');
if (!cfg.siteUrl) console.warn('Aviso: "siteUrl" vazio — sitemap.xml, robots.txt e links canônicos não foram gerados.');
