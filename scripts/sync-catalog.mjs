// Baixa o catálogo completo do fornecedor e grava em data/supplier-catalog.json.
// Uso: node scripts/sync-catalog.mjs   (depois rode: node scripts/build.mjs)
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPPLIER = 'https://agresteautoparts.catalogo.com.br';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (catalog-sync)' },
  });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

const byId = new Map();
let page = 1;
let totalPages = 1;
let total = 0;
do {
  // order=name_asc: a ordem padrão do catálogo é aleatória e repetiria itens entre páginas.
  const data = await getJson(`${SUPPLIER}/api/products?page=${page}&order=name_asc`);
  for (const p of data.products) byId.set(p.id, p);
  totalPages = data.pagination.total_pages;
  total = data.pagination.total;
  console.log(`página ${page}/${totalPages} — ${byId.size} produtos`);
  page += 1;
} while (page <= totalPages);

if (byId.size !== total) {
  throw new Error(`Esperava ${total} produtos, recebi ${byId.size}. Nada foi gravado.`);
}

const products = [...byId.values()].sort((a, b) => a.id - b.id);
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(
  path.join(root, 'data', 'supplier-catalog.json'),
  JSON.stringify({ source: SUPPLIER, syncedAt: new Date().toISOString(), products }, null, 1),
);
console.log(`OK: ${products.length} produtos em data/supplier-catalog.json`);
