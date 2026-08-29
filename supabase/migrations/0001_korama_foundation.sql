create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.inventory_class as enum ('direct_import', 'ghana_origin_export', 'marketplace_future');
create type public.market_status as enum ('active', 'roadmap', 'future');
create type public.user_role as enum ('consumer', 'business_buyer', 'warehouse_operator', 'dispatcher', 'safety_officer', 'ground_courier', 'finance', 'administrator');
create type public.order_status as enum ('pending_payment', 'paid', 'allocated', 'picked', 'packed', 'dispatched', 'delivered');
create type public.transfer_status as enum ('draft', 'cleared_for_export', 'in_transit', 'customs_received', 'warehouse_received');
create type public.origin_status as enum ('unassessed', 'evidence_pending', 'provisionally_eligible', 'demo_approved', 'rejected');
create type public.sortie_status as enum ('draft', 'preflight', 'cleared', 'launched', 'en_route', 'delivered', 'lockout', 'override', 'abort', 'return', 'courier_fallback');

create table public.operating_companies (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  legal_name text not null,
  country_code text not null check (length(country_code) = 2),
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) = 2),
  name text not null,
  currency text not null check (length(currency) = 3),
  language text not null,
  status public.market_status not null,
  launch_phase smallint not null check (launch_phase between 1 and 9),
  localization_required text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  operating_company_id uuid references public.operating_companies(id),
  market_id uuid references public.markets(id),
  created_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (profile_id, role)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  category text not null,
  producer text not null,
  inventory_class public.inventory_class not null,
  description text not null,
  weight_grams integer not null check (weight_grams > 0),
  created_at timestamptz not null default now()
);

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  price_minor bigint not null check (price_minor >= 0),
  currency text not null check (length(currency) = 3),
  purchasable boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, market_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  profile_id uuid not null references public.profiles(id),
  operating_company_id uuid not null references public.operating_companies(id),
  market_id uuid not null references public.markets(id),
  status public.order_status not null default 'pending_payment',
  currency text not null check (length(currency) = 3),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  delivery_minor bigint not null check (delivery_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price_minor bigint not null check (price_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  origin_snapshot public.inventory_class not null,
  seller_snapshot text not null,
  product_snapshot jsonb not null default '{}'::jsonb
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_reference text not null unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (length(currency) = 3),
  status text not null check (status in ('initialized', 'paid', 'failed', 'reversed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  market_id uuid references public.markets(id),
  operating_company_id uuid not null references public.operating_companies(id),
  site_type text not null check (site_type in ('warehouse', 'port', 'staging', 'micro_hub'))
);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  product_id uuid not null references public.products(id),
  site_id uuid not null references public.sites(id),
  operating_company_id uuid not null references public.operating_companies(id),
  inventory_class public.inventory_class not null,
  expiry_date date,
  quantity integer not null check (quantity >= 0),
  allocated integer not null default 0 check (allocated >= 0 and allocated <= quantity),
  quarantined boolean not null default false,
  customs_cleared boolean not null default false,
  origin_supported boolean not null default false
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  operating_company_id uuid not null references public.operating_companies(id),
  origin_site_id uuid not null references public.sites(id),
  destination_site_id uuid not null references public.sites(id),
  status public.transfer_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.origin_assessments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id),
  operating_company_id uuid not null references public.operating_companies(id),
  status public.origin_status not null default 'unassessed',
  transformation_summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  duty_quote text not null,
  certificate_watermark text not null default 'DEMO — NOT A VALID CERTIFICATE',
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  order_id uuid not null references public.orders(id),
  operating_company_id uuid not null references public.operating_companies(id),
  weight_grams integer not null check (weight_grams > 0),
  delivery_method text not null check (delivery_method in ('ground_courier', 'simulated_drone')),
  created_at timestamptz not null default now()
);

create table public.drones (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  operating_company_id uuid not null references public.operating_companies(id),
  payload_limit_grams integer not null check (payload_limit_grams > 0),
  airworthiness_current boolean not null default false,
  battery_percent integer not null check (battery_percent between 0 and 100)
);

create table public.sorties (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  shipment_id uuid not null references public.shipments(id),
  drone_id uuid not null references public.drones(id),
  operating_company_id uuid not null references public.operating_companies(id),
  status public.sortie_status not null default 'draft',
  weather_status text not null default 'clear' check (weather_status in ('clear', 'unsafe')),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  operating_company_id uuid references public.operating_companies(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  key text primary key,
  actor_id uuid references auth.users(id),
  operation text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index orders_profile_idx on public.orders(profile_id, created_at desc);
create index orders_opco_idx on public.orders(operating_company_id, status);
create index inventory_batches_fefo_idx on public.inventory_batches(product_id, expiry_date) where quarantined = false and customs_cleared = true and origin_supported = true;
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index order_events_order_idx on public.order_events(order_id, created_at);

create or replace function private.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.role_assignments ra
    where ra.profile_id = auth.uid() and ra.role = required_role
  );
$$;

create or replace function private.same_operating_company(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.operating_company_id = target_id
  );
$$;

alter table public.operating_companies enable row level security;
alter table public.markets enable row level security;
alter table public.profiles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.products enable row level security;
alter table public.market_listings enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.order_events enable row level security;
alter table public.sites enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.transfers enable row level security;
alter table public.origin_assessments enable row level security;
alter table public.shipments enable row level security;
alter table public.drones enable row level security;
alter table public.sorties enable row level security;
alter table public.audit_events enable row level security;
alter table public.idempotency_keys enable row level security;

create policy markets_are_readable on public.markets for select using (true);
create policy active_listings_are_readable on public.market_listings for select using (true);
create policy products_are_readable on public.products for select using (true);
create policy profile_is_self_readable on public.profiles for select using (id = auth.uid());
create policy roles_are_not_self_editable on public.role_assignments for select using (profile_id = auth.uid());
create policy customers_read_own_orders on public.orders for select using (profile_id = auth.uid());
create policy customers_read_own_lines on public.order_lines for select using (exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid()));
create policy customers_read_own_events on public.order_events for select using (exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid()));
create policy staff_read_scoped_orders on public.orders for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_sites on public.sites for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_batches on public.inventory_batches for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_transfers on public.transfers for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_origin on public.origin_assessments for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_sorties on public.sorties for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_drones on public.drones for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_shipments on public.shipments for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));

revoke all on function private.has_role(public.user_role) from public;
revoke all on function private.same_operating_company(uuid) from public;
