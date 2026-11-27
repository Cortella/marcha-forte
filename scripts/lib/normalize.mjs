// Transforma o produto bruto do fornecedor no produto exibido pela loja:
// título limpo, tipo de peça, veículos, códigos e descrição dividida em seções.
import { TYPES, BRANDS, MODEL_ALIASES } from './knowledge.mjs';

export const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- Título ----------
const ACCENTS = {
  valvula: 'válvula', valvulas: 'válvulas', termostatica: 'termostática', carcaca: 'carcaça',
  cambio: 'câmbio', agua: 'água', oleo: 'óleo', reservatorio: 'reservatório', calco: 'calço',
  citroen: 'citroën', aluminio: 'alumínio', eletronica: 'eletrônica', hidraulico: 'hidráulico',
  automatico: 'automático', pressao: 'pressão', ignicao: 'ignição', macaneta: 'maçaneta',
  admissao: 'admissão', combustivel: 'combustível', vacuo: 'vácuo', bau: 'baú', conexao: 'conexão',
  saida: 'saída', "d'agua": "d'água", dagua: "d'água", 'd´agua': "d'água", eletrico: 'elétrico',
  eletrica: 'elétrica', torcao: 'torção', peugeout: 'peugeot', amorok: 'amarok', beatle: 'beetle',
  zenet: 'zetec', wv: 'vw', motorvw: 'motor VW', ate: 'até', injecao: 'injeção',
  cabecote: 'cabeçote', carter: 'cárter', femea: 'fêmea',
};
const SMALL = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'à', 'ao', 'para', 'com', 'em', 'no', 'na', 'ou', 'até', 'p/', 'c/']);
const UPPER = new Set(['vw', 'gm', 'bmw', 'tbi', 'abs', 'thp', 'tsi', 'fsi', 'tdi', 'mpi', 'egr', 'hr', 'oem', 'tt', 'tts', 'ap', 'at', 'cc', 'hpe', 'jac', 'crdi', 'ii', 'sw4', 'glx', 'xtr', 'ds']);

export function cleanTitle(raw) {
  let s = String(raw).replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').replace(/[.\s]+$/, '').trim();
  s = s.replace(/(^|\s)c\/\s*/gi, '$1com ').replace(/(^|\s)p\/\s*/gi, '$1para ').replace(/,(?=\p{L})/gu, ', ');
  s = s.replace(/\s*\/\s*/g, ' / ').replace(/(?<=\d) \/ (?=\d)/g, '/');
  const words = s.split(' ').map((w, i) => {
    const core = w.replace(/^[("]+|[),"]+$/g, '');
    const low = core.toLowerCase();
    let out;
    const base = ACCENTS[low] ?? low;
    if (UPPER.has(base)) out = base.toUpperCase();
    else if (/^(ix35|i30|\d+x\d+|\d{3}[id])$/.test(base)) out = base;
    else if (/\d/.test(base)) out = /^[\d.,/\\-]+$/.test(base) ? base : base.toUpperCase();
    else if (i > 0 && SMALL.has(base)) out = base;
    else out = base.replace(/(^|[-'’/])(\p{L})/gu, (m0, a, b) => a + b.toUpperCase());
    out = out.replace(/^D'á/, "D'Á");
    return w.replace(core, out);
  });
  return words.join(' ').replace(/\\/g, '/');
}

// ---------- Tipo de peça ----------
export function detectType(name) {
  const n = norm(name);
  return TYPES.find((t) => t.test.test(n));
}

// ---------- Veículos ----------
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const prep = (s) => {
  let t = norm(s).replace(/[^a-z0-9\-.\n ]+/g, ' ').replace(/[ \t]+/g, ' ');
  for (const [re, to] of MODEL_ALIASES) t = t.replace(re, to);
  return t;
};

export function detectVehicles(name, description) {
  const n = ` ${prep(name)} `;
  const d = ` ${prep(description)} `;
  const brands = [];
  const models = [];
  for (const b of BRANDS) {
    const aliasRe = new RegExp(`(?<![a-z0-9])(${b.alias.map(esc).join('|')})(?![a-z0-9])`);
    const found = [];
    for (const mo of b.models) {
      const k = esc(norm(mo.label));
      const word = new RegExp(`(?<![a-z0-9-])${k}(?![a-z0-9]|-[a-z])`);
      // modelos "strict" só valem na descrição quando vêm logo após a montadora
      const afterBrand = new RegExp(`(${b.alias.map(esc).join('|')}) (novo |nova |new )?${k}(?![a-z0-9])`);
      if (word.test(n) || (mo.strict ? afterBrand.test(d) : word.test(d))) found.push(mo.label);
    }
    if (found.length || aliasRe.test(n)) {
      brands.push({ id: b.id, label: b.label });
      for (const f of found) models.push({ brand: b.id, label: f });
    }
  }
  return { brands, models };
}

// ---------- Descrição ----------
const HEADINGS = [
  ['compat', /^(aplicac(ao|oes)|compatibilidade|veiculos? (compativeis|de aplicacao)|aplicavel nos seguintes veiculos|principais aplicacoes|este produto e compativel com os seguintes veiculos|veiculos?|serve (em|nos|para)|modelos compativeis|aplicacao e compatibilidade)$/],
  ['specs', /^(especificacoes( tecnicas)?|caracteristicas( do produto| tecnicas)?|detalhes( do produto)?|ficha tecnica|dados tecnicos|informacoes tecnicas)$/],
  ['benefits', /^((principais )?beneficios|vantagens|diferenciais)$/],
  ['contents', /^(conteudo( da embalagem)?|ite(m|ns) inclusos?|contem|o kit contem|acompanha|o que acompanha)$/],
  ['install', /^(instalacao|recomendac(ao|oes) de instalacao|dicas? de instalacao)$/],
  ['symptoms', /^(sinais de que a peca precisa ser trocada|sintomas.*|quando trocar)$/],
  ['notes', /^(informacoes importantes|importante.*|atencao|observac(ao|oes)( tecnicas)?|obs)$/],
  ['codes', /^(codigos?( de referencia| origina(l|is)( de referencia)?| oem| similares)?|n\.? ?o? original|numeracao|outros codigos para referencia|oem|referencias?|codigo do fabricante)$/],
  ['warranty', /^(garantia.*|politica de (troca|devolucao).*)$/],
  ['intro', /^(descricao( curta| do produto)?|sobre o produto|funcao)$/],
];

// Linhas herdadas de anúncios de marketplace: políticas e promessas de outro vendedor.
const DROP = /mercado ?livre|mercadocar|an[uú]ncio|nota fiscal|\bfrete\b|\benvios?\b|enviad[oa]s|pronta entrega|vendedor|loja f[ií]sica|loja de auto|estoque|p[oó]s-venda|genuine parts|clientes|tribut[aá]ria|compras realizadas|\bdeixei\b|pergunt|somos uma empresa|nossos produtos|noss[oa] (equipe|time|loja)|^\W*marca\W*$|estamos [aà] disposi|garantia.*\b(30 dias|1 m[eê]s)\b|^\W*app aconselha|fotos? reais/i;

const classifyHeading = (text) => {
  const k = norm(text).replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!k || k.length > 60) return null;
  for (const [id, re] of HEADINGS) if (re.test(k)) return id;
  return null;
};

// Títulos "soltos" de anúncios: "Aplicação detalhada:", "Destaques e especificações técnicas".
const LOOSE = [
  ['compat', /^(principais |lista de )?(aplicac|compatib|veiculos? compat|modelos compat)/],
  ['specs', /especificac|caracteristicas|ficha tecnica|^destaques/],
  ['benefits', /^(principais )?(beneficios|vantagens|diferenciais)/],
  ['install', /^(dicas? |recomendac\w+ )?(de |para )?(instalacao|montagem)/],
  ['contents', /^(conteudo|itens? inclus|o que acompanha)/],
];
const classifyLoose = (text) => {
  const hasColon = /[:：]\s*$/.test(text);
  const k = norm(text).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = k.split(' ').length;
  if (!k || words > (hasColon ? 9 : 6) || text.length > 90) return null;
  if (/\d{4}/.test(k) || /[:：]\s*\S/.test(text)) return null; // "Aplicação: Ka 1997" é chave: valor, não título
  for (const [id, re] of LOOSE) if (re.test(k)) return id;
  return null;
};

const isShouty = (s) => {
  const letters = s.replace(/[^\p{L}]/gu, '');
  return letters.length > 12 && letters.replace(/[^\p{Lu}]/gu, '').length / letters.length > 0.8;
};
const sentence = (s) => {
  if (!isShouty(s)) return s;
  const t = cleanTitle(s).toLowerCase().replace(/\b[a-z]*\d[a-z\d-]*\b/g, (w) => w.toUpperCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const stripBullet = (l) => l.replace(/^[\s\-–—•*·●▪►✔✅➤>]+/, '').replace(/^\d{1,2}[-.)]\s+/, '').trim();

export function parseDescription(raw) {
  const sections = { intro: [], compat: [], specs: [], benefits: [], contents: [], install: [], symptoms: [], notes: [], codes: [] };
  const specs = [];
  let cur = 'intro';
  const text = String(raw ?? '')
    .replace(/\r/g, '')
    .replace(/(pelas|nas|pelo campo de|no campo de|utilize o campo de) perguntas( abaixo| ao vendedor)?/gi, 'pelo nosso WhatsApp')
    .replace(/antes de clicar em comprar/gi, 'antes de comprar');

  for (let line of text.split('\n')) {
    line = line.replace(/^["“”\s]+|["“”\s]+$/g, '').replace(/\s+/g, ' ');
    if (!line || /^[=\-_*#~.]{3,}$/.test(line)) continue;
    if (DROP.test(line)) continue;
    const body = stripBullet(line);
    if (!body) continue;

    // Título de seção sozinho na linha ("COMPATIBILIDADE", "Aplicações:")
    const solo = classifyHeading(body.replace(/[:：]+$/, '')) ?? classifyLoose(body);
    if (solo) { cur = solo; continue; }

    // "Chave: valor"
    const kv = body.match(/^([\p{L}0-9ºª°/. ()]{2,42}?)\s*[:：]\s*(.+)$/u);
    if (kv) {
      const head = classifyHeading(kv[1]);
      const value = kv[2].trim();
      // Dentro da ficha técnica, "Aplicação: suporte do motor" é uma linha da ficha, não uma nova seção.
      const staysInSpecs = cur === 'specs' && head !== 'notes' && head !== 'warranty' && value.length < 80;
      if (head && head !== 'specs' && !staysInSpecs) {
        cur = head;
        if (cur !== 'warranty') sections[cur].push(sentence(value));
        continue;
      }
      if (cur === 'warranty') continue;
      const key = kv[1].trim();
      if (cur === 'codes' && CODE_KEY.test(key)) { sections.codes.push(value); continue; }
      const specHome = cur === 'intro' || cur === 'specs' || cur === 'codes';
      if (specHome && value.length <= 180 && !/^https?$/i.test(key)) {
        const label = key.charAt(0).toUpperCase() + (isShouty(key) || key === key.toUpperCase() ? key.slice(1).toLowerCase() : key.slice(1));
        if (!specs.some((s) => norm(s[0]) === norm(label) && s[1] === value)) specs.push([label, sentence(value)]);
        continue;
      }
    }
    if (cur === 'warranty') continue;
    sections[cur].push(cur === 'compat' ? body : sentence(body));
  }

  // Introdução: junta linhas curtas em parágrafos legíveis.
  const intro = [];
  for (const l of sections.intro) {
    const prev = intro[intro.length - 1];
    if (prev && !/[.!?:]$/.test(prev) && prev.length < 90 && l.length < 90 && /^[\p{Ll}]/u.test(l)) intro[intro.length - 1] = `${prev} ${l}`;
    else intro.push(l);
  }
  return { ...sections, intro, specs };
}

// ---------- Códigos de referência ----------
const CODE_KEY = /c[oó]d|oem|original|refer|numera|n[º°]/i;
const isCode = (t) => {
  if (t.length < 5 || t.length > 22) return false;
  if (!/^[A-Z0-9][A-Z0-9.\-]*[A-Z0-9]$/i.test(t)) return false;
  const digits = t.replace(/\D/g, '').length;
  if (digits < 4) return false;
  if (/^(19|20)\d{2}$/.test(t)) return false; // ano
  if (/^(19|20)\d{2}-(19|20)?\d{2,4}$/.test(t)) return false; // faixa de anos
  if (/^\d+[.,]\d+$/.test(t) && t.length < 7) return false; // 1.6, 3370.8
  return true;
};
const tokens = (s) => String(s).split(/[\s,;/|()]+/).map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''));

export function extractCodes(product, parsed) {
  const out = new Map();
  const add = (t) => { if (isCode(t)) out.set(t.toUpperCase().replace(/[.\-]/g, ''), t.toUpperCase()); };
  for (const t of tokens(product.name)) if (/[A-Za-z]/.test(t) ? t.replace(/\D/g, '').length >= 5 : t.length >= 7) add(t);
  for (const [k, v] of parsed.specs) if (CODE_KEY.test(k)) tokens(v).forEach(add);
  for (const l of parsed.codes) tokens(l).forEach(add);
  const ean = String(product.ean ?? '').trim();
  if (ean && !/^\d{12,14}$/.test(ean)) add(ean);
  return [...out.values()].slice(0, 14);
}

export const gtinOf = (product) => {
  const ean = String(product.ean ?? '').trim();
  return /^\d{13}$/.test(ean) ? ean : null;
};

// ---------- Preço ----------
export function retailPrice(cost, config) {
  const v = Number(cost) * config.markup;
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.max(Math.floor(v) + 0.9, 9.9);
}
