-- Marcha Forte — banco de vendas (Postgres / Supabase)
-- Rode este arquivo inteiro uma vez em: Supabase → SQL Editor → New query → Run.
-- Pode ser rodado de novo sem perder dados.

-- ---------------------------------------------------------------------------
-- Administradores: só quem estiver nesta tabela lê ou altera pedidos e clientes.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Pedidos: um registro por pedido enviado pelo site (carrinho ou compra direta).
-- Entra como "novo"; o administrador muda o status conforme o atendimento.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  status text not null default 'novo'
    check (status in ('novo', 'em_atendimento', 'pago', 'enviado', 'concluido', 'cancelado')),
  source text not null default 'carrinho' check (source in ('carrinho', 'produto', 'manual')),
  customer_name text check (char_length(customer_name) <= 120),
  customer_phone text check (char_length(customer_phone) <= 30),
  customer_email text check (char_length(customer_email) <= 160),
  customer_city text check (char_length(customer_city) <= 120),
  customer_cep text check (char_length(customer_cep) <= 12),
  vehicle text check (char_length(vehicle) <= 200),
  -- [{ "id": 740709, "sku": "5134", "title": "...", "qty": 1, "price": 250.90 }]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 60),
  total numeric(12, 2) not null default 0 check (total >= 0 and total < 1000000),
  notes text check (char_length(notes) <= 2000)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ---------------------------------------------------------------------------
-- Clientes: cadastros opcionais feitos no site.
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 3 and 120),
  phone text not null check (char_length(phone) between 10 and 30),
  email text check (char_length(email) <= 160),
  city text check (char_length(city) <= 120),
  cep text check (char_length(cep) <= 12),
  vehicle text check (char_length(vehicle) <= 200),
  accepts_offers boolean not null default false
);

create index if not exists customers_created_at_idx on public.customers (created_at desc);

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
--   visitante do site (anon): só pode INSERIR pedido novo e cadastro. Não lê nada.
--   administrador: lê e altera tudo.
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;

drop policy if exists "admins leem a propria linha" on public.admins;
create policy "admins leem a propria linha" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "site registra pedido" on public.orders;
create policy "site registra pedido" on public.orders
  for insert to anon, authenticated
  with check (status = 'novo' and source in ('carrinho', 'produto') and notes is null and updated_at is null);

drop policy if exists "admin le pedidos" on public.orders;
create policy "admin le pedidos" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "admin altera pedidos" on public.orders;
create policy "admin altera pedidos" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin lanca venda manual" on public.orders;
create policy "admin lanca venda manual" on public.orders
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin apaga pedidos" on public.orders;
create policy "admin apaga pedidos" on public.orders
  for delete to authenticated using (public.is_admin());

drop policy if exists "site registra cadastro" on public.customers;
create policy "site registra cadastro" on public.customers
  for insert to anon, authenticated with check (true);

drop policy if exists "admin le clientes" on public.customers;
create policy "admin le clientes" on public.customers
  for select to authenticated using (public.is_admin());

drop policy if exists "admin apaga clientes" on public.customers;
create policy "admin apaga clientes" on public.customers
  for delete to authenticated using (public.is_admin());

grant insert on public.orders, public.customers to anon;
grant select, insert, update, delete on public.orders, public.customers to authenticated;
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------------------
-- DEPOIS de criar o usuário administrador em Authentication → Users → Add user,
-- rode (trocando o e-mail) para liberar o acesso dele à dashboard:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------------
