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

## Painel de admin — `/admin/`

Edita nome, preço e descrição de cada produto (e permite ocultar um produto) sem mexer em código.

- **Acesso:** só entra quem tem um token do GitHub com permissão de escrita neste repositório
  (fine-grained token → *Only select repositories* → este repositório → *Contents: Read and write*).
  Quem autoriza é o GitHub; a página não tem senha própria.
- **Como salva:** "Publicar alterações" grava `data/overrides.json` no repositório. O push dispara o
  deploy e o site atualiza em 1–2 minutos.
- **Formato:** `{ "<id do produto>": { "title", "price", "description", "hidden" } }`. Só ficam gravados
  os campos alterados; o resto continua automático (nome limpo, custo × markup, descrição do fornecedor).
- Um preço definido no admin fica fixo mesmo se o custo do fornecedor mudar.
- `adminRepo` em `site.config.json` aponta o repositório usado pelo painel.

## Banco de vendas e dashboard — `/admin/vendas.html`

Postgres no Supabase. Com ele configurado, o site grava cada pedido enviado pelo WhatsApp (carrinho ou
compra direta) e cada cadastro de cliente; a dashboard mostra indicadores, faturamento por dia, pedidos
por situação, produtos mais pedidos, a lista de pedidos (com mudança de situação e observação) e os
clientes cadastrados, com exportação em CSV.

1. Crie um projeto em supabase.com e rode `db/schema.sql` no *SQL Editor*.
2. Em *Authentication → Users*, crie o usuário administrador; depois rode o `insert into public.admins …`
   que está no fim do `schema.sql`. Desative o cadastro público em *Authentication → Sign In / Providers*.
3. Copie *Project URL* e a chave *anon public* para `supabaseUrl` e `supabaseAnonKey` em `site.config.json`.

A chave *anon* é pública por natureza: as regras do banco (RLS) só deixam o visitante **inserir** pedido
e cadastro; ler e alterar exige um usuário listado em `admins`. Nunca coloque a chave `service_role` aqui.

Um pedido registrado é uma intenção de compra (o cliente clicou para enviar no WhatsApp). Ele vira venda
quando o administrador muda a situação para *pago*, *enviado* ou *concluído*.

## Onde mexer

- `scripts/lib/knowledge.mjs` — tipos de peça (texto "para que serve", sintomas, dica), montadoras e modelos.
- `scripts/lib/normalize.mjs` — limpeza de títulos e descrições, extração de códigos, regra de preço.
- `scripts/lib/templates.mjs` — HTML e textos de venda da home e da página de produto.
- `src/assets/` — CSS e JavaScript (filtros, carrinho, WhatsApp).
