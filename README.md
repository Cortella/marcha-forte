# Marcha Forte

Loja estática (HTML/CSS/JS, sem dependências) gerada a partir do catálogo do fornecedor.

## Uso

```bash
node scripts/sync-catalog.mjs   # baixa o catálogo do fornecedor → data/supplier-catalog.json
node scripts/build.mjs          # gera o site em site/
```

Publique a pasta `site/` em qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages, Hostinger…).
Para ver localmente, abra `site/index.html` ou rode `npx serve site`.

## Configuração — `site.config.json`

| Campo | O que faz |
| --- | --- |
| `whatsapp` | Número que recebe os pedidos, com DDI e DDD (ex.: `5511999999999`). **Obrigatório.** |
| `markup` | Multiplicador sobre o preço de atacado do fornecedor (1.8 = +80%). O preço final termina em ,90. |
| `showPrices` | `false` troca os preços por "Consulte o preço". |
| `warrantyDays` | Garantia exibida no site. |
| `lowStockThreshold` | Estoque do fornecedor a partir do qual aparece "Poucas unidades". |
| `siteUrl` | Domínio final (ex.: `https://marchaforte.com.br`). Gera sitemap, robots e links canônicos. |
| `instagram`, `cityLine` | Opcionais, aparecem no rodapé. |

## Onde mexer

- `scripts/lib/knowledge.mjs` — tipos de peça (texto "para que serve", sintomas, dica), montadoras e modelos.
- `scripts/lib/normalize.mjs` — limpeza de títulos e descrições, extração de códigos, regra de preço.
- `scripts/lib/templates.mjs` — HTML e textos de venda da home e da página de produto.
- `src/assets/` — CSS e JavaScript (filtros, carrinho, WhatsApp).
