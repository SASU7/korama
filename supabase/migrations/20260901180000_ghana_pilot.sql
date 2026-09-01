-- Ghana pilot: Ghana becomes the transacting market, Nigeria is parked.
--
-- Why: the Paystack integration only supports GHS. Every NGN initialize came
-- back "Currency not supported by merchant" (HTTP 403), and
-- korama_verify_payment requires the paid currency to equal the order
-- currency, so an NGN order can never be settled on this account.
--
-- Nigeria's rows are left intact and merely checkout-disabled. Switching back
-- is a market_configs flip once a Nigerian Paystack integration exists.
--
-- The three server-owned transaction functions resolved geography from Lekki
-- fixture references. They now resolve it from the order's operating company,
-- which is what the multi-tenant schema already carried. Every patch is
-- asserted, so a replay against drifted source fails loudly instead of
-- silently skipping a safety rule.

-- ---------------------------------------------------------------------------
-- 1. Ghana fulfilment geography
--
-- Ghana had only Tema export staging: no destination warehouse to hold stock,
-- no micro-hub to fly to, no corridor or authorization for preflight.
-- ---------------------------------------------------------------------------
insert into public.sites (id, reference, name, market_id, operating_company_id, site_type)
values
  ('42000000-0000-0000-0000-000000000011', 'KOR-ACCRA-WAREHOUSE-SITE', 'Accra destination warehouse',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'warehouse'),
  ('42000000-0000-0000-0000-000000000012', 'KOR-ACCRA-MICRO-HUB-SITE', 'Fictional Accra micro-hub',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'micro_hub')
on conflict (id) do nothing;

insert into public.ports_nodes (id, reference, name, market_id, operating_company_id, node_type)
values
  ('40000000-0000-0000-0000-000000000011', 'KOR-ACCRA-WH', 'Accra destination warehouse',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'warehouse'),
  ('40000000-0000-0000-0000-000000000012', 'KOR-ACCRA-HUB', 'Fictional Accra micro-hub',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'micro_hub')
on conflict (id) do nothing;

-- Domestic lane: Tema staging feeds the Accra warehouse. The Ghana-to-Nigeria
-- export lane stays on file, owned by the parked Nigerian company.
insert into public.trade_lanes
  (id, reference, origin_market_id, destination_market_id, operating_company_id,
   origin_node_id, destination_node_id, status)
values
  ('41000000-0000-0000-0000-000000000011', 'KOR-GH-DOMESTIC',
   '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000012', 'active')
on conflict (id) do nothing;

insert into public.drones
  (id, reference, operating_company_id, payload_limit_grams, airworthiness_current,
   battery_percent, manual_override_ready)
values
  ('70000000-0000-0000-0000-000000000011', 'KOR-D11', '10000000-0000-0000-0000-000000000001',
   2000, true, 92, true)
on conflict (id) do nothing;

insert into public.authorizations
  (id, operating_company_id, reference, jurisdiction, valid_from, valid_until, status)
values
  ('71000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
   'KOR-GH-POC-AUTH-01', 'Ghana · Accra corridor',
   '2026-08-29T00:00:00+00:00', '2027-09-30T23:59:59+00:00', 'approved')
on conflict (id) do nothing;

insert into public.geofences (id, operating_company_id, reference, geometry, status)
values
  ('72000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
   'KOR-ACCRA-POC-CORRIDOR',
   '{"type": "LineString", "coordinates": [[-0.19, 5.60], [-0.13, 5.63], [-0.07, 5.67]]}'::jsonb,
   'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Ghana catalogue
--
-- Prices carry the naira figures across at the same minor-unit scale the two
-- existing Ghana listings already use, so nothing in the arithmetic moves.
-- Treat the cedi amounts as placeholders and reprice in the admin UI.
--
-- The Nigeria-cleared direct imports (blender, scarf) are deliberately absent:
-- their whole description is that they cleared customs in Nigeria.
-- ---------------------------------------------------------------------------
insert into public.market_listings
  (product_id, market_id, operating_company_id, price_minor, currency, purchasable)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  485000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  620000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  950000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  380000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  760000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',       0, 'GHS', false)
on conflict (product_id, market_id) do update
   set operating_company_id = excluded.operating_company_id,
       price_minor = excluded.price_minor,
       currency = excluded.currency,
       purchasable = excluded.purchasable;

insert into public.market_prices
  (product_id, market_id, operating_company_id, price_minor, currency)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  485000, 'GHS'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  620000, 'GHS'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  950000, 'GHS'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  380000, 'GHS'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',  760000, 'GHS'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',       0, 'GHS')
on conflict (product_id, market_id, operating_company_id) do update
   set price_minor = excluded.price_minor,
       currency = excluded.currency;

-- ---------------------------------------------------------------------------
-- 3. Ghana stock at the Accra warehouse
--
-- Mirrors the Nigerian fixtures, including the two that make the demo honest:
-- an expired batch and a quarantined batch that FEFO must skip. The granola is
-- again left without stock, so an order containing it proves allocation is
-- all-or-nothing.
-- ---------------------------------------------------------------------------
insert into public.inventory_batches
  (id, reference, product_id, site_id, operating_company_id, inventory_class,
   expiry_date, quantity, allocated, quarantined, customs_cleared, origin_supported)
values
  ('43000000-0000-0000-0000-000000000011', 'GH-NK-SB-2407', '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', '2027-01-07', 42, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000012', 'GH-NK-SB-2401', '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', '2026-08-02',  8, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000013', 'GH-NK-SB-QA',   '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', '2027-03-01',  4, 0, true,  true, true),
  ('43000000-0000-0000-0000-000000000014', 'GH-NK-DO-2408', '30000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', '2027-04-12', 18, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000015', 'GH-AW-KT-18',   '30000000-0000-0000-0000-000000000005', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', null,        9, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000016', 'GH-TB-24-11',   '30000000-0000-0000-0000-000000000008', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'ghana_origin_export', null,        5, 0, false, true, true)
on conflict (id) do nothing;

insert into public.inventory_balances
  (id, batch_id, site_id, operating_company_id, available_quantity, reserved_quantity)
values
  ('65000000-0000-0000-0000-000000000011', '43000000-0000-0000-0000-000000000011', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 42, 0),
  ('65000000-0000-0000-0000-000000000012', '43000000-0000-0000-0000-000000000012', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',  8, 0),
  ('65000000-0000-0000-0000-000000000013', '43000000-0000-0000-0000-000000000013', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',  4, 0),
  ('65000000-0000-0000-0000-000000000014', '43000000-0000-0000-0000-000000000014', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 18, 0),
  ('65000000-0000-0000-0000-000000000015', '43000000-0000-0000-0000-000000000015', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',  9, 0),
  ('65000000-0000-0000-0000-000000000016', '43000000-0000-0000-0000-000000000016', '42000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',  5, 0)
on conflict (id) do nothing;

-- The Ghana lamp sat in export staging. Move it to the warehouse that now
-- serves Ghanaian orders so FEFO can reach it.
update public.inventory_batches
   set site_id = '42000000-0000-0000-0000-000000000011'
 where id = '43000000-0000-0000-0000-000000000005';
update public.inventory_balances
   set site_id = '42000000-0000-0000-0000-000000000011'
 where batch_id = '43000000-0000-0000-0000-000000000005';

-- ---------------------------------------------------------------------------
-- 4. Move checkout to Ghana
-- ---------------------------------------------------------------------------
update public.market_configs mc
   set checkout_enabled = true,
       tax_duty_status = 'Illustrative pilot validation required'
  from public.markets m
 where m.id = mc.market_id and m.code = 'GH';

update public.market_configs mc
   set checkout_enabled = false,
       tax_duty_status = 'Parked: awaiting a Nigerian payment integration'
  from public.markets m
 where m.id = mc.market_id and m.code = 'NG';

-- ---------------------------------------------------------------------------
-- 5. Unbind the transaction functions from Lekki
-- ---------------------------------------------------------------------------
do $do$
declare
  body text;
  changed text;
begin
  select pg_get_functiondef(oid) into body
    from pg_proc
   where proname = 'korama_create_order_priced'
     and pronamespace = 'private'::regnamespace;
  if body is null then
    raise exception 'private.korama_create_order_priced was not found';
  end if;

  -- address country follows the market
  changed := replace(body, '     or coalesce(p_delivery_address->>''countryCode'', '''') <> ''NG'' then
    raise exception ''A complete Nigerian delivery address is required'' using errcode = ''22023'';', '     or coalesce(p_delivery_address->>''countryCode'', '''') <>
        (select m.code from public.markets m where m.id = p_market_id) then
    raise exception ''A complete delivery address for the selected market is required'' using errcode = ''22023'';');
  if changed = body then
    raise exception 'private.korama_create_order_priced: could not apply patch (address country follows the market)';
  end if;
  body := changed;
  -- destination warehouse resolved per operating company
  changed := replace(body, '  select s.id into site_id
    from public.sites s
   where s.reference = ''KOR-LEKKI-WAREHOUSE-SITE''
     and s.operating_company_id = p_operating_company_id
   limit 1;', '  select s.id into site_id
    from public.sites s
   where s.operating_company_id = p_operating_company_id
     and s.site_type = ''warehouse''
     and (s.market_id = p_market_id or s.market_id is null)
   order by s.reference
   limit 1;');
  if changed = body then
    raise exception 'private.korama_create_order_priced: could not apply patch (destination warehouse resolved per operating company)';
  end if;
  body := changed;

  execute body;
end $do$;

do $do$
declare
  body text;
  changed text;
begin
  select pg_get_functiondef(oid) into body
    from pg_proc
   where proname = 'korama_advance_order'
     and pronamespace = 'public'::regnamespace;
  if body is null then
    raise exception 'public.korama_advance_order was not found';
  end if;

  -- delivery legs resolved per operating company
  changed := replace(body, '    select id into origin_node_id from public.ports_nodes where reference = ''KOR-LEKKI-WH'' limit 1;
    select id into destination_node_id from public.ports_nodes where reference = ''KOR-LEKKI-HUB'' limit 1;', '    select id into origin_node_id from public.ports_nodes
      where operating_company_id = order_row.operating_company_id
        and node_type = ''warehouse''
      order by reference limit 1;
    select id into destination_node_id from public.ports_nodes
      where operating_company_id = order_row.operating_company_id
        and node_type = ''micro_hub''
      order by reference limit 1;');
  if changed = body then
    raise exception 'public.korama_advance_order: could not apply patch (delivery legs resolved per operating company)';
  end if;
  body := changed;

  execute body;
end $do$;

do $do$
declare
  body text;
  changed text;
begin
  select pg_get_functiondef(oid) into body
    from pg_proc
   where proname = 'korama_command_sortie'
     and pronamespace = 'public'::regnamespace;
  if body is null then
    raise exception 'public.korama_command_sortie was not found';
  end if;

  -- authorization bound to the tenant, not to Lagos
  changed := replace(body, '         and a.jurisdiction = ''Nigeria · Lagos corridor''
         and a.status = ''approved''', '         and coalesce(a.jurisdiction, '''') <> ''''
         and a.status = ''approved''');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (authorization bound to the tenant, not to Lagos)';
  end if;
  body := changed;
  -- authorization message drops the Lagos wording
  changed := replace(body, '      raise exception ''Preflight blocked: the Lagos route authorization is missing or outside its validity window'' using errcode = ''22023'';', '      raise exception ''Preflight blocked: the route authorization is missing or outside its validity window'' using errcode = ''22023'';');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (authorization message drops the Lagos wording)';
  end if;
  body := changed;
  -- geofence corridor shape stays required, Lekki does not
  changed := replace(body, '         and g.reference like ''KOR-LEKKI-%-CORRIDOR''
         and g.status = ''active''', '         and g.reference like ''%-CORRIDOR''
         and g.status = ''active''');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (geofence corridor shape stays required, Lekki does not)';
  end if;
  body := changed;
  -- geofence message drops the Lekki wording
  changed := replace(body, '      raise exception ''Preflight blocked: the Lekki route geofence is missing or inactive'' using errcode = ''22023'';', '      raise exception ''Preflight blocked: the route geofence is missing or inactive'' using errcode = ''22023'';');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (geofence message drops the Lekki wording)';
  end if;
  body := changed;
  -- preflight evidence binds the tenant authorization
  changed := replace(body, '            and jurisdiction = ''Nigeria · Lagos corridor''
            and status = ''approved'' and valid_from <= now() and valid_until >= now()', '            and coalesce(jurisdiction, '''') <> ''''
            and status = ''approved'' and valid_from <= now() and valid_until >= now()');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (preflight evidence binds the tenant authorization)';
  end if;
  body := changed;
  -- preflight evidence binds the tenant corridor
  changed := replace(body, '            and reference like ''KOR-LEKKI-%-CORRIDOR''
            and status = ''active'' and geometry->>''type'' = ''LineString''', '            and reference like ''%-CORRIDOR''
            and status = ''active'' and geometry->>''type'' = ''LineString''');
  if changed = body then
    raise exception 'public.korama_command_sortie: could not apply patch (preflight evidence binds the tenant corridor)';
  end if;
  body := changed;

  execute body;
end $do$;

-- ---------------------------------------------------------------------------
-- 6. Prove the pilot market can actually transact
-- ---------------------------------------------------------------------------
do $$
declare
  market_code text;
  warehouse_count integer;
begin
  select m.code into market_code
    from public.market_configs mc
    join public.markets m on m.id = mc.market_id
   where mc.checkout_enabled
   limit 1;
  if market_code is distinct from 'GH' then
    raise exception 'Ghana is not the checkout-enabled market (found %)', coalesce(market_code, 'none');
  end if;

  select count(*) into warehouse_count
    from public.sites
   where operating_company_id = '10000000-0000-0000-0000-000000000001'
     and site_type = 'warehouse';
  if warehouse_count < 1 then
    raise exception 'Ghana has no destination warehouse';
  end if;
end $$;

comment on function public.korama_advance_order(text, public.order_status, integer)
  is 'Server-only order transition; delivery legs resolve from the order operating company';
comment on function public.korama_command_sortie(text, text)
  is 'Server-only simulated sortie transition with tenant-bound preflight and safety abort';
