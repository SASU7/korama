-- Phase 2 completion: complete the domain contract, expose only intentional
-- Data API grants, and register sanitized order/sortie tables for Realtime.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column tenant_id uuid references public.tenants(id);

create table public.ports_nodes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null,
  market_id uuid not null references public.markets(id),
  operating_company_id uuid not null references public.operating_companies(id),
  node_type text not null check (node_type in ('port', 'warehouse', 'staging', 'micro_hub')),
  created_at timestamptz not null default now()
);

create table public.trade_lanes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  origin_market_id uuid not null references public.markets(id),
  destination_market_id uuid not null references public.markets(id),
  operating_company_id uuid not null references public.operating_companies(id),
  origin_node_id uuid references public.ports_nodes(id),
  destination_node_id uuid references public.ports_nodes(id),
  status text not null default 'active' check (status in ('active', 'roadmap', 'paused')),
  created_at timestamptz not null default now()
);

create table public.market_configs (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id),
  operating_company_id uuid not null references public.operating_companies(id),
  checkout_enabled boolean not null default false,
  language text not null,
  tax_duty_status text not null,
  created_at timestamptz not null default now(),
  unique (market_id, operating_company_id)
);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reference text not null unique,
  name text not null,
  sku text not null unique,
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.market_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  market_id uuid not null references public.markets(id),
  operating_company_id uuid not null references public.operating_companies(id),
  price_minor bigint not null check (price_minor >= 0),
  currency text not null check (length(currency) = 3),
  valid_from timestamptz not null default now(),
  unique (product_id, market_id, operating_company_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  market_id uuid not null references public.markets(id),
  status text not null default 'open' check (status in ('open', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  address_line text not null,
  city text not null,
  country_code text not null check (length(country_code) = 2),
  created_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, profile_id, product_id)
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'under_review', 'approved', 'rejected', 'refunded')),
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  operating_company_id uuid not null references public.operating_companies(id),
  reference text not null unique,
  name text not null,
  country_code text not null check (length(country_code) = 2),
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  supplier_id uuid references public.suppliers(id),
  site_id uuid not null references public.sites(id),
  operating_company_id uuid not null references public.operating_companies(id),
  received_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('draft', 'received', 'reconciled'))
);

create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id) on delete cascade,
  site_id uuid not null references public.sites(id),
  operating_company_id uuid not null references public.operating_companies(id),
  available_quantity integer not null check (available_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (batch_id, site_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id),
  operating_company_id uuid not null references public.operating_companies(id),
  order_id uuid references public.orders(id),
  from_site_id uuid references public.sites(id),
  to_site_id uuid references public.sites(id),
  quantity integer not null check (quantity > 0),
  movement_type text not null check (movement_type in ('receive', 'reserve', 'allocate', 'pick', 'transfer', 'dispatch', 'release')),
  created_at timestamptz not null default now()
);

create table public.warehouse_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  site_id uuid not null references public.sites(id),
  operating_company_id uuid not null references public.operating_companies(id),
  task_type text not null check (task_type in ('receive', 'allocate', 'pick', 'pack', 'dispatch')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete', 'blocked')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_legs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  sequence_no smallint not null check (sequence_no > 0),
  mode text not null check (mode in ('bulk_export', 'ground_courier', 'simulated_drone')),
  origin_node_id uuid references public.ports_nodes(id),
  destination_node_id uuid references public.ports_nodes(id),
  status text not null default 'planned' check (status in ('planned', 'in_transit', 'complete', 'fallback')),
  created_at timestamptz not null default now(),
  unique (shipment_id, sequence_no)
);

create table public.authorizations (
  id uuid primary key default gen_random_uuid(),
  operating_company_id uuid not null references public.operating_companies(id),
  reference text not null unique,
  jurisdiction text not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text not null check (status in ('pending', 'approved', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  sortie_id uuid not null references public.sorties(id) on delete cascade,
  observed_at timestamptz not null default now(),
  status text not null check (status in ('clear', 'unsafe')),
  wind_kph numeric not null check (wind_kph >= 0),
  precipitation boolean not null default false
);

create table public.geofences (
  id uuid primary key default gen_random_uuid(),
  operating_company_id uuid not null references public.operating_companies(id),
  reference text not null unique,
  geometry jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.sortie_events (
  id uuid primary key default gen_random_uuid(),
  sortie_id uuid not null references public.sorties(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  status public.sortie_status not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create table public.origin_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  status public.origin_status not null default 'unassessed',
  created_at timestamptz not null default now()
);

create table public.transformation_records (
  id uuid primary key default gen_random_uuid(),
  origin_record_id uuid not null references public.origin_records(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  summary text not null,
  facility text not null,
  recorded_at timestamptz not null default now()
);

create table public.origin_evidence (
  id uuid primary key default gen_random_uuid(),
  origin_record_id uuid not null references public.origin_records(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  evidence_type text not null,
  storage_path text,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.duty_quotes (
  id uuid primary key default gen_random_uuid(),
  origin_assessment_id uuid not null references public.origin_assessments(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  quote text not null,
  status text not null default 'illustrative' check (status in ('illustrative', 'validated', 'expired')),
  created_at timestamptz not null default now()
);

create table public.certificate_previews (
  id uuid primary key default gen_random_uuid(),
  origin_assessment_id uuid not null references public.origin_assessments(id) on delete cascade,
  operating_company_id uuid not null references public.operating_companies(id),
  storage_path text,
  watermark text not null default 'PREVIEW — NOT A VALID CERTIFICATE',
  created_at timestamptz not null default now()
);

create index carts_profile_idx on public.carts(profile_id, status);
create index cart_items_cart_idx on public.cart_items(cart_id);
create index receipts_site_idx on public.receipts(site_id, received_at desc);
create index inventory_movements_batch_idx on public.inventory_movements(batch_id, created_at desc);
create index warehouse_tasks_scope_idx on public.warehouse_tasks(operating_company_id, status, updated_at desc);
create index delivery_legs_shipment_idx on public.delivery_legs(shipment_id, sequence_no);
create index weather_snapshots_sortie_idx on public.weather_snapshots(sortie_id, observed_at desc);
create index sortie_events_sortie_idx on public.sortie_events(sortie_id, created_at desc);
create index origin_evidence_record_idx on public.origin_evidence(origin_record_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tenants', 'ports_nodes', 'trade_lanes', 'market_configs', 'variants', 'media',
    'market_prices', 'carts', 'cart_items', 'addresses', 'ratings', 'returns',
    'suppliers', 'receipts', 'inventory_balances', 'inventory_movements',
    'warehouse_tasks', 'delivery_legs', 'authorizations', 'weather_snapshots',
    'geofences', 'sortie_events', 'origin_records', 'transformation_records',
    'origin_evidence', 'duty_quotes', 'certificate_previews'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy markets_configs_are_readable on public.market_configs for select using (true);
create policy ports_nodes_are_readable on public.ports_nodes for select using (true);
create policy trade_lanes_are_readable on public.trade_lanes for select using (true);
create policy market_prices_are_readable on public.market_prices for select using (true);
create policy variants_are_readable on public.variants for select using (true);
create policy media_are_readable on public.media for select using (true);

-- These tables are intentionally server-only. The explicit deny policies make the
-- boundary visible to policy audits while service-role operations still bypass RLS.
create policy operating_companies_server_only on public.operating_companies for select using (false);
create policy tenants_server_only on public.tenants for select using (false);
create policy audit_events_server_only on public.audit_events for select using (false);
create policy idempotency_keys_server_only on public.idempotency_keys for select using (false);
create policy payment_attempts_server_only on public.payment_attempts for select using (false);

create policy tenant_profile_is_readable on public.tenants for select using (exists (select 1 from public.profiles p where p.tenant_id = id and p.id = auth.uid()));
create policy customers_read_own_carts on public.carts for select using (profile_id = auth.uid());
create policy customers_write_own_carts on public.carts for insert with check (profile_id = auth.uid());
create policy customers_update_own_carts on public.carts for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy customers_read_own_cart_items on public.cart_items for select using (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid()));
create policy customers_write_own_cart_items on public.cart_items for insert with check (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid()));
create policy customers_update_own_cart_items on public.cart_items for update using (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid()));
create policy customers_read_own_addresses on public.addresses for select using (profile_id = auth.uid());
create policy customers_write_own_addresses on public.addresses for insert with check (profile_id = auth.uid());
create policy customers_update_own_addresses on public.addresses for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy customers_read_own_ratings on public.ratings for select using (profile_id = auth.uid());
create policy customers_write_own_ratings on public.ratings for insert with check (profile_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid()));
create policy customers_read_own_returns on public.returns for select using (profile_id = auth.uid());
create policy customers_write_own_returns on public.returns for insert with check (profile_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.profile_id = auth.uid()));

create policy staff_read_scoped_suppliers on public.suppliers for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_receipts on public.receipts for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_balances on public.inventory_balances for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_movements on public.inventory_movements for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_tasks on public.warehouse_tasks for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_origin_records on public.origin_records for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_transformations on public.transformation_records for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_origin_evidence on public.origin_evidence for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_duty_quotes on public.duty_quotes for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy staff_read_scoped_certificate_previews on public.certificate_previews for select using (private.has_role('warehouse_operator') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_delivery_legs on public.delivery_legs for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_authorizations on public.authorizations for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_weather on public.weather_snapshots for select using (private.has_role('safety_officer') and exists (select 1 from public.sorties s where s.id = sortie_id and private.same_operating_company(s.operating_company_id)));
create policy safety_read_scoped_geofences on public.geofences for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));
create policy safety_read_scoped_sortie_events on public.sortie_events for select using (private.has_role('safety_officer') and private.same_operating_company(operating_company_id));

grant usage on schema public to anon, authenticated;
grant select on public.markets, public.products, public.market_listings, public.market_configs, public.market_prices, public.variants, public.media, public.ports_nodes, public.trade_lanes to anon, authenticated;
grant select on public.profiles, public.role_assignments, public.orders, public.order_lines, public.order_events, public.carts, public.cart_items, public.addresses, public.ratings, public.returns, public.sites, public.inventory_batches, public.transfers, public.origin_assessments, public.shipments, public.sorties to authenticated;
grant insert, update on public.carts, public.cart_items, public.addresses, public.ratings, public.returns to authenticated;
grant execute on function private.has_role(public.user_role) to authenticated;
grant execute on function private.same_operating_company(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.order_events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.sortie_events;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
