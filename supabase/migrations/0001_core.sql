-- ═══════════════════════════════════════════════════════════════════════════
-- DeryMarket — Migration 0001: Core trade infrastructure (Phase 1)
-- Lesson 0 of the backend course: the schema IS the app.
--
-- Design decisions to study (each is explained in the course):
--  * UUID primary keys      → safe to generate client-side, no guessable IDs
--  * every table has created_at/updated_at
--  * money as BIGINT cents  → never floats. 1 UGX = 1 cent here (UGX has no
--                             subunit), but we keep the pattern for USD etc.
--  * RLS on everything      → defense-in-depth; the API enforces policy too,
--                             and the database refuses if the API has a bug
--  * one state machine      → orders: created → reserved → paid → fulfilled
--                             → released (| refunded | disputed | cancelled)
--  * double-entry ledger    → balances are never stored, only derived sums
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Identity ─────────────────────────────────────────────────────────────
-- auth.users (Supabase) holds credentials. profiles holds OUR data about the
-- human: one identity per person (FR-ACC-01), phone-first.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text unique not null,
  email           text,
  full_name       text not null default '',
  -- verification_level gates role activation (SRS §2.1):
  -- 0 = phone verified, 1 = national ID, 2 = trade license, 3 = tax ID
  verification    int not null default 0,
  is_admin        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Workspaces: role-scoped environments inside one account (FR-ACC-02).
-- A person's shop, their business, their farm — each a workspace.
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('personal','business','supplier','farm','institution')),
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workspaces_owner on public.workspaces(owner_id);

-- Staff sub-accounts (FR-ACC-05): scoped membership in a workspace.
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id    uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, member_id)
);

-- ── 2. Catalog ─────────────────────────────────────────────────────────────
create table public.categories (
  id        uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name      text not null,
  slug      text not null unique
);

-- Listings: any publishable offer (product, used good). Later phases add
-- service/rental/auction types via the `type` column — no new tables.
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,
  type         text not null default 'product' check (type in ('product','used_good')),
  title        text not null,
  description  text not null default '',
  price_cents  bigint not null check (price_cents >= 0),
  currency     text not null default 'UGX',
  stock        int not null default 1,          -- 1 for used goods
  status       text not null default 'active' check (status in ('draft','active','paused','sold')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index listings_workspace on public.listings(workspace_id);
create index listings_browse   on public.listings(status, category_id) where status = 'active';

-- ── 3. Trade Engine: orders + state machine ────────────────────────────────
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references public.profiles(id),
  seller_ws_id      uuid not null references public.workspaces(id),
  status            text not null default 'created'
                    check (status in ('created','reserved','paid','fulfilled','released',
                                      'refunded','disputed','cancelled')),
  total_cents       bigint not null check (total_cents >= 0),
  currency          text not null default 'UGX',
  delivery_address  text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_buyer  on public.orders(buyer_id);
create index orders_seller on public.orders(seller_ws_id);

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  listing_id uuid not null references public.listings(id),
  quantity   int not null check (quantity > 0),
  unit_price_cents bigint not null,      -- frozen at purchase time
  title      text not null              -- frozen at purchase time
);
create index order_items_order on public.order_items(order_id);

-- Allowed transitions of the state machine (FR-CORE-01). The API consults
-- this table — a nice pattern: policy as data, not code.
create table public.order_transitions (
  from_status text not null,
  to_status   text not null,
  primary key (from_status, to_status)
);
insert into public.order_transitions (from_status, to_status) values
  ('created','reserved'), ('created','cancelled'),
  ('reserved','paid'),    ('reserved','cancelled'),
  ('paid','fulfilled'),
  ('fulfilled','released'), ('fulfilled','disputed'),
  ('disputed','released'),  ('disputed','refunded');

-- ── 4. Finance: double-entry ledger (FR-CORE-02) ───────────────────────────
-- Balances are NEVER stored. Every money movement posts >= 2 entries whose
-- sums cancel to zero. account balance = sum(debit) - sum(credit).
create table public.ledger_accounts (
  id    uuid primary key default gen_random_uuid(),
  kind  text not null check (kind in ('user','workspace','escrow','platform','revenue')),
  ref_id uuid,                        -- profile/workspace id this account belongs to
  label text not null,
  unique (kind, ref_id)
);

create table public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  txn_id      uuid not null,          -- groups the entries of one movement
  account_id  uuid not null references public.ledger_accounts(id),
  debit_cents  bigint not null default 0,
  credit_cents bigint not null default 0,
  memo        text not null default '',
  order_id    uuid references public.orders(id),
  created_at  timestamptz not null default now()
);
create index ledger_entries_txn     on public.ledger_entries(txn_id);
create index ledger_entries_account on public.ledger_entries(account_id);

-- ── 5. Reliability: outbox + idempotency (FR-CORE-03/04) ────────────────────
-- Outbox: state changes emit events here in the SAME transaction; a worker
-- delivers them to subscribers later. If the process dies, the event is not
-- lost — it is still in the table.
create table public.outbox_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,          -- 'order.paid', 'payment.released', ...
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);
create index outbox_unprocessed on public.outbox_events(created_at) where processed_at is null;

-- Idempotency: external writes carry a client-supplied key; retries can
-- never duplicate a payment or an order.
create table public.idempotency_keys (
  key         text primary key,       -- client-supplied
  user_id     uuid not null references public.profiles(id),
  response    jsonb,
  created_at  timestamptz not null default now()
);

-- ── 6. Row-Level Security: workspace scoping as defense-in-depth ────────────
alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.categories        enable row level security;
alter table public.listings          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.ledger_accounts   enable row level security;
alter table public.ledger_entries    enable row level security;
alter table public.outbox_events     enable row level security;
alter table public.idempotency_keys  enable row level security;

-- helper used by policies: is `uid` a member of workspace `ws`?
create function public.is_ws_member(ws uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members
                 where workspace_id = ws and member_id = uid);
$$;

create policy own_profile on public.profiles
  for all using (id = auth.uid());
create policy workspaces_owner on public.workspaces
  for all using (owner_id = auth.uid());
create policy ws_members_read on public.workspace_members
  for select using (member_id = auth.uid() or public.is_ws_member(workspace_id, auth.uid()));
create policy ws_members_write on public.workspace_members
  for all using (public.is_ws_member(workspace_id, auth.uid()));
create policy categories_public on public.categories
  for select using (true);
create policy listings_public_read on public.listings
  for select using (status = 'active' or public.is_ws_member(workspace_id, auth.uid()));
create policy listings_ws_write on public.listings
  for all using (public.is_ws_member(workspace_id, auth.uid()));
create policy orders_parties on public.orders
  for select using (buyer_id = auth.uid() or public.is_ws_member(seller_ws_id, auth.uid()));
create policy order_items_parties on public.order_items
  for select using (exists (select 1 from public.orders o
                      where o.id = order_id
                        and (o.buyer_id = auth.uid() or public.is_ws_member(o.seller_ws_id, auth.uid()))));
-- orders are written through API service-role paths in Phase 1; RLS read
-- policies above still protect the data.

-- ── 7. updated_at maintenance ───────────────────────────────────────────────
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch  before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();
create trigger listings_touch  before update on public.listings
  for each row execute function public.touch_updated_at();
create trigger orders_touch    before update on public.orders
  for each row execute function public.touch_updated_at();
