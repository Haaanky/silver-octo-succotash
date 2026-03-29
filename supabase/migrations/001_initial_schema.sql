-- =============================================================================
-- LagerApp – initial schema
-- Kör detta i Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with role info. Created automatically on user signup.

create table if not exists public.profiles (
  id    uuid primary key references auth.users on delete cascade,
  email text not null,
  role  text not null default 'worker' check (role in ('admin', 'worker'))
);

-- ── Products ──────────────────────────────────────────────────────────────────

create table if not exists public.products (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  sku           text        not null default '',
  barcode       text        not null default '',
  unit          text        not null default 'st',
  min_stock     integer     not null default 0 check (min_stock >= 0),
  current_stock integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Stock transactions ────────────────────────────────────────────────────────

create table if not exists public.stock_transactions (
  id         uuid        primary key default gen_random_uuid(),
  product_id uuid        not null references public.products on delete cascade,
  type       text        not null check (type in ('in', 'out')),
  quantity   integer     not null check (quantity > 0),
  timestamp  timestamptz not null default now(),
  user_id    uuid        not null references auth.users on delete restrict
);

create index if not exists stock_transactions_product_id_idx on public.stock_transactions (product_id);
create index if not exists stock_transactions_timestamp_idx  on public.stock_transactions (timestamp desc);

-- ── Trigger: update current_stock on transaction insert ───────────────────────

create or replace function public.update_product_stock()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.type = 'in' then
    update public.products
    set current_stock = current_stock + new.quantity
    where id = new.product_id;
  else
    update public.products
    set current_stock = greatest(0, current_stock - new.quantity)
    where id = new.product_id;
  end if;
  return new;
end;
$$;

create or replace trigger after_transaction_insert
  after insert on public.stock_transactions
  for each row execute function public.update_product_stock();

-- ── Trigger: auto-create profile on signup ────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'worker')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.products          enable row level security;
alter table public.stock_transactions enable row level security;

-- Profiles: alla inloggade kan läsa, ingen user-facing insert (trigger sköter det)
create policy "profiles_select"      on public.profiles for select to authenticated using (true);
create policy "profiles_update_own"  on public.profiles for update to authenticated using (auth.uid() = id);

-- Products: läsa = alla inloggade; skriva = bara admin
create policy "products_select"  on public.products for select to authenticated using (true);
create policy "products_insert"  on public.products for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "products_update"  on public.products for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "products_delete"  on public.products for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Transactions: läsa = alla inloggade; insert = inloggad user (måste vara sin egen user_id)
create policy "transactions_select" on public.stock_transactions for select to authenticated using (true);
create policy "transactions_insert" on public.stock_transactions for insert to authenticated
  with check (auth.uid() = user_id);

-- =============================================================================
-- MANUELLT STEG EFTER KÖRNING:
-- Skapa admin-användaren i Supabase Dashboard → Authentication → Users → Add user
--   Email:    admin@lager.se
--   Password: admin123  (byt i produktion!)
-- Kör sedan:
--   update public.profiles set role = 'admin' where email = 'admin@lager.se';
-- =============================================================================
