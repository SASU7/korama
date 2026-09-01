-- Ghana-only Tema E2E pilot. Historical Accra rows remain, while all new
-- pricing, stock allocation and delivery routing resolve from market_configs.

alter table public.market_configs
  add column tax_rate_basis_points integer,
  add column delivery_ghana_origin_minor bigint,
  add column delivery_direct_import_minor bigint,
  add column fulfilment_site_id uuid references public.sites(id),
  add column delivery_origin_node_id uuid references public.ports_nodes(id),
  add column delivery_destination_node_id uuid references public.ports_nodes(id),
  add constraint market_configs_tax_rate_basis_points_check
    check (tax_rate_basis_points between 0 and 10000),
  add constraint market_configs_delivery_ghana_origin_minor_check
    check (delivery_ghana_origin_minor >= 0),
  add constraint market_configs_delivery_direct_import_minor_check
    check (delivery_direct_import_minor >= 0);

insert into public.sites (id, reference, name, market_id, operating_company_id, site_type)
values
  ('42000000-0000-0000-0000-000000000021', 'KOR-TEMA-DOMESTIC-WAREHOUSE-SITE', 'Tema domestic warehouse',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'warehouse'),
  ('42000000-0000-0000-0000-000000000022', 'KOR-TEMA-MICRO-HUB-SITE', 'Fictional Tema micro-hub',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'micro_hub')
on conflict (id) do update set name = excluded.name;

insert into public.ports_nodes (id, reference, name, market_id, operating_company_id, node_type)
values
  ('40000000-0000-0000-0000-000000000021', 'KOR-TEMA-DOMESTIC-WH', 'Tema domestic warehouse',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'warehouse'),
  ('40000000-0000-0000-0000-000000000022', 'KOR-TEMA-LOCAL-HUB', 'Fictional Tema micro-hub',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'micro_hub')
on conflict (id) do update set name = excluded.name;

insert into public.trade_lanes
  (id, reference, origin_market_id, destination_market_id, operating_company_id,
   origin_node_id, destination_node_id, status)
values
  ('41000000-0000-0000-0000-000000000021', 'KOR-GH-TEMA-DOMESTIC',
   '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000022', 'active')
on conflict (id) do update
  set origin_node_id = excluded.origin_node_id,
      destination_node_id = excluded.destination_node_id,
      status = excluded.status;

update public.authorizations
   set jurisdiction = 'Ghana · Tema simulated local corridor'
 where reference = 'KOR-GH-POC-AUTH-01';

update public.geofences set status = 'inactive'
 where reference = 'KOR-ACCRA-POC-CORRIDOR';

insert into public.geofences (id, operating_company_id, reference, geometry, status)
values (
  '72000000-0000-0000-0000-000000000021',
  '10000000-0000-0000-0000-000000000001',
  'KOR-TEMA-POC-CORRIDOR',
  '{"type":"LineString","coordinates":[[-0.0166,5.6698],[0.002,5.676],[0.020,5.684]]}'::jsonb,
  'active'
)
on conflict (id) do update set geometry = excluded.geometry, status = excluded.status;

update public.market_configs
   set checkout_enabled = true,
       tax_rate_basis_points = 750,
       delivery_ghana_origin_minor = 4500,
       delivery_direct_import_minor = 5500,
       fulfilment_site_id = '42000000-0000-0000-0000-000000000021',
       delivery_origin_node_id = '40000000-0000-0000-0000-000000000021',
       delivery_destination_node_id = '40000000-0000-0000-0000-000000000022',
       tax_duty_status = 'Illustrative Ghana pilot: 7.5% tax; compliance validation required'
 where market_id = '20000000-0000-0000-0000-000000000001'
   and operating_company_id = '10000000-0000-0000-0000-000000000001';

update public.market_configs
   set checkout_enabled = false,
       tax_rate_basis_points = 750,
       delivery_ghana_origin_minor = 450000,
       delivery_direct_import_minor = 550000,
       fulfilment_site_id = (select id from public.sites where reference = 'KOR-LEKKI-WAREHOUSE-SITE'),
       delivery_origin_node_id = (select id from public.ports_nodes where reference = 'KOR-LEKKI-WH'),
       delivery_destination_node_id = (select id from public.ports_nodes where reference = 'KOR-LEKKI-HUB'),
       tax_duty_status = 'Parked: awaiting a Nigerian payment integration'
 where market_id = '20000000-0000-0000-0000-000000000002'
   and operating_company_id = '10000000-0000-0000-0000-000000000002';

-- Roadmap markets have no checkout route yet, but the arithmetic columns are
-- total so future readers never need nullable pricing branches.
update public.market_configs
   set tax_rate_basis_points = coalesce(tax_rate_basis_points, 0),
       delivery_ghana_origin_minor = coalesce(delivery_ghana_origin_minor, 0),
       delivery_direct_import_minor = coalesce(delivery_direct_import_minor, 0);

alter table public.market_configs
  alter column tax_rate_basis_points set not null,
  alter column delivery_ghana_origin_minor set not null,
  alter column delivery_direct_import_minor set not null;

-- Move current Ghana stock only. Order/task/shipment history is untouched.
update public.inventory_batches
   set site_id = '42000000-0000-0000-0000-000000000021'
 where operating_company_id = '10000000-0000-0000-0000-000000000001'
   and site_id = '42000000-0000-0000-0000-000000000011';

update public.inventory_balances
   set site_id = '42000000-0000-0000-0000-000000000021', updated_at = now()
 where operating_company_id = '10000000-0000-0000-0000-000000000001'
   and site_id = '42000000-0000-0000-0000-000000000011';

insert into public.inventory_batches
  (id, reference, product_id, site_id, operating_company_id, inventory_class,
   expiry_date, quantity, allocated, quarantined, customs_cleared, origin_supported)
values
  ('43000000-0000-0000-0000-000000000021', 'GH-VCW-2409', '30000000-0000-0000-0000-000000000009',
   '42000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001',
   'ghana_origin_export', '2027-02-04', 31, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000022', 'GH-AF-CG-2406', '30000000-0000-0000-0000-000000000006',
   '42000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001',
   'ghana_origin_export', '2026-11-18', 26, 0, false, true, true)
on conflict (id) do update
  set site_id = excluded.site_id,
      quantity = excluded.quantity,
      expiry_date = excluded.expiry_date,
      quarantined = false,
      customs_cleared = true,
      origin_supported = true;

insert into public.inventory_balances
  (id, batch_id, site_id, operating_company_id, available_quantity, reserved_quantity)
values
  ('65000000-0000-0000-0000-000000000021', '43000000-0000-0000-0000-000000000021',
   '42000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001', 31, 0),
  ('65000000-0000-0000-0000-000000000022', '43000000-0000-0000-0000-000000000022',
   '42000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000001', 26, 0)
on conflict (batch_id, site_id) do update
  set available_quantity = excluded.available_quantity,
      reserved_quantity = excluded.reserved_quantity,
      updated_at = now();

insert into public.origin_assessments
  (id, batch_id, operating_company_id, status, transformation_summary, evidence, duty_quote, certificate_watermark)
values (
  '66000000-0000-0000-0000-000000000021', '43000000-0000-0000-0000-000000000021',
  '10000000-0000-0000-0000-000000000001', 'provisionally_eligible',
  'Fermented, roasted, milled, and packed in Ghana.',
  '["Producer declaration · Volta Cocoa Works", "Transformation log · VCW-2409", "Batch test summary · illustrative POC evidence"]'::jsonb,
  'Illustrative Ghana pilot treatment; validate tax, duty and origin before production.',
  'PREVIEW — NOT A VALID CERTIFICATE'
)
on conflict (id) do update set evidence = excluded.evidence, transformation_summary = excluded.transformation_summary;

insert into public.duty_quotes (id, origin_assessment_id, operating_company_id, quote, status)
values ('67000000-0000-0000-0000-000000000021', '66000000-0000-0000-0000-000000000021',
        '10000000-0000-0000-0000-000000000001',
        'Illustrative Ghana pilot treatment; not a production tax or duty decision.', 'illustrative')
on conflict (id) do update set quote = excluded.quote, status = excluded.status;

insert into public.certificate_previews
  (id, origin_assessment_id, operating_company_id, watermark)
values ('68000000-0000-0000-0000-000000000021', '66000000-0000-0000-0000-000000000021',
        '10000000-0000-0000-0000-000000000001', 'PREVIEW — NOT A VALID CERTIFICATE')
on conflict (id) do update set watermark = excluded.watermark;

-- Park stale signed-in Nigerian carts. Ghana now has one open cart per user;
-- market-specific carts remain the schema contract for a future NG reactivation.
update public.carts
   set status = 'abandoned', updated_at = now()
 where status = 'open'
   and (market_id <> '20000000-0000-0000-0000-000000000001'
        or operating_company_id <> '10000000-0000-0000-0000-000000000001');

with ranked as (
  select id, row_number() over (partition by profile_id, market_id order by updated_at desc, id desc) as rn
    from public.carts where status = 'open'
)
update public.carts c set status = 'abandoned', updated_at = now()
  from ranked r where r.id = c.id and r.rn > 1;

create unique index carts_one_open_per_profile_market
  on public.carts(profile_id, market_id) where status = 'open';

-- Authoritative server pricing and stock preflight. Money is integer minor
-- units; round(subtotal * bps / 10000) matches TypeScript Math.round.
create or replace function private.korama_create_order_priced(
  p_profile_id uuid, p_reference text, p_operating_company_id uuid,
  p_market_id uuid, p_lines jsonb, p_delivery_address jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  max_lines constant integer := 10;
  max_line_quantity constant integer := 10;
  max_total_quantity constant integer := 30;
  market_row public.markets%rowtype;
  config_row public.market_configs%rowtype;
  listing_row public.market_listings%rowtype;
  product_row public.products%rowtype;
  order_row public.orders%rowtype;
  element jsonb; ordinality integer; line_count integer; line_product uuid; line_qty integer;
  line_subtotal bigint; line_tax bigint; order_currency text; allocatable integer;
  total_quantity integer := 0; subtotal_total bigint := 0; tax_total bigint := 0;
  delivery_total bigint := 0; has_direct_import boolean := false;
  compliance_snapshot jsonb; staged jsonb := '[]'::jsonb;
  apportioned bigint := 0; remainder bigint;
begin
  if jsonb_typeof(p_lines) <> 'array' then raise exception 'Order lines must be an array' using errcode = '22023'; end if;
  line_count := jsonb_array_length(p_lines);
  if line_count < 1 or line_count > max_lines then raise exception 'An order needs 1 to % lines', max_lines using errcode = '22023'; end if;
  if line_count <> (select count(distinct e->>'productId') from jsonb_array_elements(p_lines) e) then
    raise exception 'Order lines must not repeat a product' using errcode = '22023';
  end if;

  select * into market_row from public.markets where id = p_market_id;
  if not found then raise exception 'The requested market was not found' using errcode = 'P0002'; end if;
  select * into config_row from public.market_configs
   where market_id = p_market_id and operating_company_id = p_operating_company_id and checkout_enabled;
  if not found then raise exception 'Checkout is not enabled for %', market_row.name using errcode = '22023'; end if;
  if config_row.fulfilment_site_id is null or config_row.delivery_origin_node_id is null
     or config_row.delivery_destination_node_id is null then
    raise exception 'The market fulfilment route is not configured' using errcode = '55000';
  end if;
  if jsonb_typeof(p_delivery_address) <> 'object'
     or length(trim(coalesce(p_delivery_address->>'recipientName',''))) < 2
     or length(trim(coalesce(p_delivery_address->>'addressLine',''))) < 5
     or length(trim(coalesce(p_delivery_address->>'city',''))) < 2
     or upper(coalesce(p_delivery_address->>'countryCode','')) <> market_row.code then
    raise exception 'A complete % delivery address is required', market_row.name using errcode = '22023';
  end if;

  for element, ordinality in
    select value, ord from jsonb_array_elements(p_lines) with ordinality as t(value, ord)
  loop
    if coalesce(element->>'productId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Line %: productId must be a uuid', ordinality using errcode = '22023';
    end if;
    line_product := (element->>'productId')::uuid;
    begin line_qty := (element->>'quantity')::integer;
    exception when others then raise exception 'Line %: quantity must be a whole number', ordinality using errcode = '22023'; end;
    if line_qty is null or line_qty < 1 or line_qty > max_line_quantity then
      raise exception 'Line %: quantity must be between 1 and %', ordinality, max_line_quantity using errcode = '22023';
    end if;
    total_quantity := total_quantity + line_qty;
    if total_quantity > max_total_quantity then raise exception 'An order may contain at most % units', max_total_quantity using errcode = '22023'; end if;

    select * into listing_row from public.market_listings
     where product_id = line_product and market_id = p_market_id
       and operating_company_id = p_operating_company_id for share;
    if not found or not listing_row.purchasable then
      raise exception 'Line %: the listing is not purchasable in this market', ordinality using errcode = '22023';
    end if;
    select * into product_row from public.products where id = line_product for share;
    if not found then raise exception 'Line %: product not found', ordinality using errcode = 'P0002'; end if;

    select coalesce(sum(least(b.quantity - b.allocated, ib.available_quantity)), 0)::integer into allocatable
      from public.inventory_batches b
      join public.inventory_balances ib on ib.batch_id = b.id and ib.site_id = b.site_id
     where b.product_id = line_product and b.operating_company_id = p_operating_company_id
       and b.site_id = config_row.fulfilment_site_id and not b.quarantined and b.customs_cleared
       and (b.inventory_class <> 'ghana_origin_export' or b.origin_supported)
       and (b.expiry_date is null or b.expiry_date >= current_date);
    if allocatable < line_qty then
      raise exception 'Line %: only % allocatable unit(s) remain at the configured fulfilment site', ordinality, allocatable using errcode = '23514';
    end if;

    if order_currency is null then order_currency := listing_row.currency;
    elsif listing_row.currency <> order_currency then raise exception 'An order cannot mix currencies' using errcode = '22023'; end if;
    if listing_row.currency <> market_row.currency then raise exception 'Listing currency does not match market currency' using errcode = '22023'; end if;
    line_subtotal := listing_row.price_minor::bigint * line_qty;
    line_tax := round(line_subtotal::numeric * config_row.tax_rate_basis_points / 10000)::bigint;
    subtotal_total := subtotal_total + line_subtotal; tax_total := tax_total + line_tax;
    if product_row.inventory_class <> 'ghana_origin_export' then has_direct_import := true; end if;

    select jsonb_build_object('assessment', oa.status, 'transformation', oa.transformation_summary,
      'evidence', oa.evidence, 'dutyQuote', coalesce(dq.quote, oa.duty_quote),
      'certificateWatermark', coalesce(cp.watermark, 'PREVIEW — NOT A VALID CERTIFICATE'),
      'productReference', product_row.reference, 'productName', product_row.name,
      'batchReference', ib.reference, 'assessedAt', oa.created_at)
      into compliance_snapshot
      from public.origin_assessments oa join public.inventory_batches ib on ib.id = oa.batch_id
      left join public.duty_quotes dq on dq.origin_assessment_id = oa.id
      left join public.certificate_previews cp on cp.origin_assessment_id = oa.id
     where ib.product_id = product_row.id and ib.operating_company_id = p_operating_company_id
       and ib.site_id = config_row.fulfilment_site_id and oa.status = 'provisionally_eligible'
     order by oa.created_at desc, oa.id limit 1;
    staged := staged || jsonb_build_object('lineNo', ordinality, 'productId', product_row.id,
      'listingId', listing_row.id, 'quantity', line_qty, 'priceMinor', listing_row.price_minor,
      'subtotalMinor', line_subtotal, 'taxMinor', line_tax, 'originSnapshot', product_row.inventory_class,
      'sellerSnapshot', product_row.producer, 'productSnapshot', jsonb_build_object('reference', product_row.reference,
      'name', product_row.name, 'description', product_row.description, 'weight_grams', product_row.weight_grams,
      'inventory_class', product_row.inventory_class), 'complianceSnapshot', coalesce(compliance_snapshot, '{}'::jsonb));
  end loop;

  delivery_total := case when has_direct_import then config_row.delivery_direct_import_minor else config_row.delivery_ghana_origin_minor end;
  insert into public.orders (reference, profile_id, operating_company_id, market_id, status, currency,
    subtotal_minor, tax_minor, delivery_minor, total_minor, delivery_address_snapshot)
  values (p_reference, p_profile_id, p_operating_company_id, p_market_id, 'pending_payment', order_currency,
    subtotal_total, tax_total, delivery_total, subtotal_total + tax_total + delivery_total, p_delivery_address)
  returning * into order_row;

  for element in select value from jsonb_array_elements(staged) loop
    remainder := case when subtotal_total > 0 then (delivery_total * (element->>'subtotalMinor')::bigint) / subtotal_total else delivery_total / line_count end;
    apportioned := apportioned + remainder;
    insert into public.order_lines (order_id, line_no, product_id, market_listing_id, quantity, price_minor,
      subtotal_minor, tax_minor, delivery_minor, origin_snapshot, seller_snapshot, product_snapshot, compliance_snapshot)
    values (order_row.id, (element->>'lineNo')::smallint, (element->>'productId')::uuid,
      (element->>'listingId')::uuid, (element->>'quantity')::integer, (element->>'priceMinor')::bigint,
      (element->>'subtotalMinor')::bigint, (element->>'taxMinor')::bigint, remainder,
      (element->>'originSnapshot')::public.inventory_class, element->>'sellerSnapshot',
      element->'productSnapshot', element->'complianceSnapshot');
  end loop;
  if delivery_total <> apportioned then update public.order_lines set delivery_minor = delivery_minor + (delivery_total - apportioned) where order_id = order_row.id and line_no = 1; end if;
  insert into public.addresses (profile_id, label, recipient_name, address_line, city, country_code)
  values (p_profile_id, 'Checkout address', p_delivery_address->>'recipientName', p_delivery_address->>'addressLine', p_delivery_address->>'city', market_row.code);
  insert into public.warehouse_tasks (order_id, site_id, operating_company_id, task_type, status) values
    (order_row.id, config_row.fulfilment_site_id, p_operating_company_id, 'allocate', 'open'),
    (order_row.id, config_row.fulfilment_site_id, p_operating_company_id, 'pick', 'open'),
    (order_row.id, config_row.fulfilment_site_id, p_operating_company_id, 'pack', 'open'),
    (order_row.id, config_row.fulfilment_site_id, p_operating_company_id, 'dispatch', 'open');
  insert into public.order_events (order_id, status, detail) values (order_row.id, 'pending_payment', 'Awaiting server-confirmed payment');
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_created', 'order', order_row.id,
    jsonb_build_object('source','korama-normalized','reference',order_row.reference,'lineCount',line_count,'itemCount',total_quantity));
  return jsonb_build_object('order', to_jsonb(order_row), 'lines',
    (select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb) from public.order_lines l where l.order_id = order_row.id));
end;
$$;

revoke execute on function private.korama_create_order_priced(uuid,text,uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function private.korama_create_order_priced(uuid,text,uuid,uuid,jsonb,jsonb) to service_role;

-- Allocation must use the same configured site that passed checkout stock
-- preflight, otherwise an old Accra batch could win FEFO.
create or replace function public.korama_allocate_order_fefo(p_order_reference text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare
  order_row public.orders%rowtype; line_row public.order_lines%rowtype;
  batch_row public.inventory_batches%rowtype; balance_row public.inventory_balances%rowtype;
  config_row public.market_configs%rowtype; allocations jsonb := '[]'::jsonb;
begin
  select * into order_row from public.orders where reference = p_order_reference for update;
  if not found then raise exception 'Order was not found' using errcode = 'P0002'; end if;
  if order_row.status = 'allocated' then
    select coalesce(jsonb_agg(jsonb_build_object('lineNo',l.line_no,'batchId',l.allocated_batch_id,
      'batchReference',b.reference,'quantity',l.allocated_quantity) order by l.line_no),'[]'::jsonb)
      into allocations from public.order_lines l left join public.inventory_batches b on b.id=l.allocated_batch_id where l.order_id=order_row.id;
    return jsonb_build_object('order',to_jsonb(order_row),'allocations',allocations,'idempotent',true);
  end if;
  if order_row.status <> 'paid' then raise exception 'Only a paid order can be allocated' using errcode='22023'; end if;
  select * into config_row from public.market_configs where market_id=order_row.market_id and operating_company_id=order_row.operating_company_id;
  if config_row.fulfilment_site_id is null then raise exception 'The fulfilment site is not configured' using errcode='55000'; end if;
  perform pg_advisory_xact_lock(hashtext('korama_allocate:'||order_row.operating_company_id::text));
  for line_row in select * from public.order_lines where order_id=order_row.id order by line_no for update loop
    select b.* into batch_row from public.inventory_batches b
      join public.inventory_balances ib on ib.batch_id=b.id and ib.site_id=b.site_id
     where b.product_id=line_row.product_id and b.operating_company_id=order_row.operating_company_id
       and b.site_id=config_row.fulfilment_site_id and not b.quarantined and b.customs_cleared
       and (b.inventory_class <> 'ghana_origin_export' or b.origin_supported)
       and (b.expiry_date is null or b.expiry_date >= current_date)
       and b.quantity-b.allocated >= line_row.quantity and ib.available_quantity >= line_row.quantity
     order by b.expiry_date asc nulls last,b.id limit 1 for update of b,ib;
    if not found then raise exception 'Line %: no valid stock at the configured fulfilment site',line_row.line_no using errcode='23514'; end if;
    select * into balance_row from public.inventory_balances where batch_id=batch_row.id and site_id=batch_row.site_id for update;
    update public.inventory_batches set allocated=allocated+line_row.quantity where id=batch_row.id returning * into batch_row;
    update public.inventory_balances set available_quantity=available_quantity-line_row.quantity,
      reserved_quantity=reserved_quantity+line_row.quantity,updated_at=now() where id=balance_row.id;
    update public.order_lines set allocated_batch_id=batch_row.id,allocated_quantity=line_row.quantity,
      compliance_snapshot=case when compliance_snapshot?'assessment' then jsonb_set(compliance_snapshot,'{batchReference}',to_jsonb(batch_row.reference)) else compliance_snapshot end
     where id=line_row.id;
    insert into public.inventory_movements(batch_id,operating_company_id,order_id,to_site_id,quantity,movement_type)
    values(batch_row.id,order_row.operating_company_id,order_row.id,batch_row.site_id,line_row.quantity,'allocate');
    allocations:=allocations||jsonb_build_object('lineNo',line_row.line_no,'batchId',batch_row.id,'batchReference',batch_row.reference,'quantity',line_row.quantity);
  end loop;
  update public.orders set status='allocated',updated_at=now() where id=order_row.id returning * into order_row;
  update public.warehouse_tasks set status='complete',updated_at=now() where order_id=order_row.id and task_type='allocate';
  insert into public.order_events(order_id,status,detail) values(order_row.id,'allocated','FEFO allocated every line from the configured Tema fulfilment site');
  insert into public.audit_events(actor_id,operating_company_id,action,entity_type,entity_id,payload)
  values(null,order_row.operating_company_id,'inventory_allocated','order',order_row.id,jsonb_build_object('source','korama-normalized','allocations',allocations));
  return jsonb_build_object('order',to_jsonb(order_row),'allocations',allocations);
end;
$$;

revoke execute on function public.korama_allocate_order_fefo(text) from public, anon, authenticated;
grant execute on function public.korama_allocate_order_fefo(text) to service_role;

-- Replace the accidental "first warehouse alphabetically" route lookup with
-- the exact nodes configured for the order market and operating company.
do $do$
declare body text; changed text;
begin
  select pg_get_functiondef(oid) into body from pg_proc
   where proname='korama_advance_order' and pronamespace='public'::regnamespace;
  changed := replace(body,
    '    select id into origin_node_id from public.ports_nodes
      where operating_company_id = order_row.operating_company_id
        and node_type = ''warehouse''
      order by reference limit 1;
    select id into destination_node_id from public.ports_nodes
      where operating_company_id = order_row.operating_company_id
        and node_type = ''micro_hub''
      order by reference limit 1;',
    '    select mc.delivery_origin_node_id, mc.delivery_destination_node_id
      into origin_node_id, destination_node_id
      from public.market_configs mc
     where mc.market_id = order_row.market_id
       and mc.operating_company_id = order_row.operating_company_id;');
  if changed=body then raise exception 'Could not bind order dispatch to configured route nodes'; end if;
  execute changed;
end $do$;

revoke execute on function public.korama_advance_order(text,public.order_status,integer) from public, anon, authenticated;
grant execute on function public.korama_advance_order(text,public.order_status,integer) to service_role;

do $$
declare cocoa integer; granola integer;
begin
  select sum(least(b.quantity-b.allocated,ib.available_quantity))::integer into cocoa
    from public.inventory_batches b join public.inventory_balances ib on ib.batch_id=b.id and ib.site_id=b.site_id
   where b.reference='GH-VCW-2409' and b.site_id='42000000-0000-0000-0000-000000000021';
  select sum(least(b.quantity-b.allocated,ib.available_quantity))::integer into granola
    from public.inventory_batches b join public.inventory_balances ib on ib.batch_id=b.id and ib.site_id=b.site_id
   where b.reference='GH-AF-CG-2406' and b.site_id='42000000-0000-0000-0000-000000000021';
  if cocoa is distinct from 31 or granola is distinct from 26 then raise exception 'Tema pilot stock seed failed: cocoa %, granola %',cocoa,granola; end if;
end $$;

comment on table public.market_configs is 'Server-owned checkout, pricing, fulfilment site and delivery route policy per operating company and market';
