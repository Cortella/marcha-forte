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

## Área do cliente — `/minha-conta.html`

Meus pedidos (itens, total, andamento, rastreio, "pedir de novo"), meus dados, meus veículos e ajuda.
Não há login: cadastro e histórico ficam no aparelho do cliente. Com o banco configurado, o andamento e
o código de rastreio vêm da loja pela função `order_status` do `schema.sql`, consultada pelo id do
pedido (UUID aleatório). O link "Copiar link de acompanhamento" abre o mesmo pedido em outro aparelho.
O número curto do pedido (`#ABCD1234`) aparece na mensagem de WhatsApp, na área do cliente e na dashboard.
A transportadora e o código de rastreio são preenchidos pelo administrador em `/admin/vendas.html`.

## Checkout — `/checkout.html`

O carrinho leva para uma página de checkout só com a marca (sem busca, menu ou rodapé de navegação):
dados do cliente, entrega, veículo, forma de pagamento preferida e resumo do pedido. Ao enviar, o pedido
é registrado e o WhatsApp abre com a mensagem pronta — não há gateway de pagamento.

- **Preenchimento automático:** usa o cadastro; sem cadastro, usa os dados do último pedido feito no
  aparelho. Quem já é conhecido vê os dados recolhidos e o endereço principal já marcado.
- **Endereços:** até 6 por cliente, com apelido (casa, oficina…) e um principal. O CEP preenche rua,
  bairro, cidade e UF pelo ViaCEP. Também são geridos em *Minha conta → Meus endereços*.
- **Pagamento:** as opções vêm de `paymentOptions` em `site.config.json`
  (padrão: Pix, Cartão de crédito, Combinar no atendimento). É só a preferência do cliente.
- Endereço, pagamento e observação vão para a mensagem, para o banco e para a dashboard.

## Onde mexer

- `scripts/lib/knowledge.mjs` — tipos de peça (texto "para que serve", sintomas, dica), montadoras e modelos.
- `scripts/lib/normalize.mjs` — limpeza de títulos e descrições, extração de códigos, regra de preço.
- `scripts/lib/templates.mjs` — HTML e textos de venda da home e da página de produto.
- `src/assets/` — CSS e JavaScript (filtros, carrinho, WhatsApp).
