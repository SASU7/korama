-- Preserve the provisional compliance evidence that justified a deep order at
-- the order-line and shipment boundaries. These are immutable snapshots for
-- the demo; they are not legal certificates or live customs decisions.
alter table public.order_lines
  add column if not exists compliance_snapshot jsonb not null default '{}'::jsonb;

alter table public.shipments
  add column if not exists compliance_snapshot jsonb not null default '{}'::jsonb;

create or replace function public.korama_create_order(
  p_profile_id uuid,
  p_reference text,
  p_operating_company_id uuid,
  p_market_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_currency text,
  p_subtotal_minor bigint,
  p_tax_minor bigint,
  p_delivery_minor bigint,
  p_total_minor bigint,
  p_delivery_address jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  listing_row public.market_listings%rowtype;
  product_row public.products%rowtype;
  order_row public.orders%rowtype;
  site_id uuid;
  compliance_snapshot jsonb := '{}'::jsonb;
begin
  if p_quantity < 1 or p_quantity > 10 then
    raise exception 'Quantity must be a whole number between 1 and 10' using errcode = '22023';
  end if;
  if jsonb_typeof(p_delivery_address) <> 'object'
     or coalesce(p_delivery_address->>'recipientName', '') = ''
     or coalesce(p_delivery_address->>'addressLine', '') = ''
     or coalesce(p_delivery_address->>'city', '') = ''
     or coalesce(p_delivery_address->>'countryCode', '') <> 'NG' then
    raise exception 'A complete Nigerian delivery address is required' using errcode = '22023';
  end if;

  select ml.* into listing_row
    from public.market_listings ml
   where ml.product_id = p_product_id
     and ml.market_id = p_market_id
     and ml.operating_company_id = p_operating_company_id
   for share;
  if not found or not listing_row.purchasable then
    raise exception 'The requested listing is not purchasable in this market' using errcode = '22023';
  end if;

  select p.* into product_row
    from public.products p
   where p.id = p_product_id
   for share;
  if not found then
    raise exception 'The requested product was not found' using errcode = 'P0002';
  end if;
  if p_currency <> listing_row.currency
     or p_subtotal_minor <> listing_row.price_minor * p_quantity
     or p_total_minor <> p_subtotal_minor + p_tax_minor + p_delivery_minor then
    raise exception 'The order quote does not match the market listing' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'assessment', oa.status,
    'transformation', oa.transformation_summary,
    'evidence', oa.evidence,
    'dutyQuote', coalesce(dq.quote, oa.duty_quote),
    'certificateWatermark', coalesce(cp.watermark, 'DEMO — NOT A VALID CERTIFICATE')
  ) into compliance_snapshot
    from public.origin_assessments oa
    join public.inventory_batches ib on ib.id = oa.batch_id
    left join public.duty_quotes dq on dq.origin_assessment_id = oa.id
    left join public.certificate_previews cp on cp.origin_assessment_id = oa.id
   where ib.product_id = product_row.id
     and oa.status = 'provisionally_eligible'
   order by oa.created_at desc, oa.id
   limit 1;
  compliance_snapshot := coalesce(compliance_snapshot, '{}'::jsonb);

  select s.id into site_id
    from public.sites s
   where s.reference = 'KOR-LEKKI-WAREHOUSE-SITE'
     and s.operating_company_id = p_operating_company_id
   limit 1;
  if not found then
    raise exception 'The destination warehouse is not configured' using errcode = '55000';
  end if;

  insert into public.orders (
    reference, profile_id, operating_company_id, market_id, status, currency,
    subtotal_minor, tax_minor, delivery_minor, total_minor, delivery_address_snapshot
  ) values (
    p_reference, p_profile_id, p_operating_company_id, p_market_id, 'pending_payment',
    p_currency, p_subtotal_minor, p_tax_minor, p_delivery_minor, p_total_minor,
    p_delivery_address
  ) returning * into order_row;

  insert into public.order_lines (
    order_id, product_id, quantity, price_minor, tax_minor, origin_snapshot,
    seller_snapshot, product_snapshot, compliance_snapshot
  ) values (
    order_row.id, product_row.id, p_quantity, listing_row.price_minor, p_tax_minor,
    product_row.inventory_class, product_row.producer,
    jsonb_build_object(
      'reference', product_row.reference,
      'name', product_row.name,
      'description', product_row.description,
      'weight_grams', product_row.weight_grams,
      'inventory_class', product_row.inventory_class
    ),
    compliance_snapshot
  );

  insert into public.addresses (profile_id, label, recipient_name, address_line, city, country_code)
  values (p_profile_id, 'Checkout address', p_delivery_address->>'recipientName',
    p_delivery_address->>'addressLine', p_delivery_address->>'city', p_delivery_address->>'countryCode');

  insert into public.warehouse_tasks (order_id, site_id, operating_company_id, task_type, status)
  values
    (order_row.id, site_id, p_operating_company_id, 'allocate', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'pick', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'pack', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'dispatch', 'open');

  insert into public.order_events (order_id, status, detail)
  values (order_row.id, 'pending_payment', 'Awaiting server-confirmed payment');
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_created', 'order', order_row.id,
    jsonb_build_object('source', 'korama-normalized', 'reference', order_row.reference));

  return jsonb_build_object('order', to_jsonb(order_row), 'compliance_snapshot', compliance_snapshot);
end;
$$;

create or replace function public.korama_advance_order(
  p_order_reference text,
  p_next_status public.order_status,
  p_weight_grams integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  order_row public.orders%rowtype;
  line_row public.order_lines%rowtype;
  shipment_row public.shipments%rowtype;
  sortie_row public.sorties%rowtype;
  origin_node_id uuid;
  destination_node_id uuid;
  drone_id uuid;
  target_task_type text;
  weight_grams integer;
  compliance_snapshot jsonb := '{}'::jsonb;
  event_rows jsonb;
begin
  select * into order_row from public.orders where reference = p_order_reference for update;
  if not found then raise exception 'Order was not found' using errcode = 'P0002'; end if;
  if not (
    (order_row.status = 'allocated' and p_next_status = 'picked')
    or (order_row.status = 'picked' and p_next_status = 'packed')
    or (order_row.status = 'packed' and p_next_status = 'dispatched')
  ) then
    raise exception 'Order cannot advance from % to %', order_row.status, p_next_status using errcode = '22023';
  end if;

  target_task_type := case p_next_status when 'picked' then 'pick' when 'packed' then 'pack' when 'dispatched' then 'dispatch' end;
  update public.warehouse_tasks wt set status = 'complete', updated_at = now()
   where wt.order_id = order_row.id and wt.task_type = target_task_type and wt.status <> 'complete';
  update public.orders set status = p_next_status, updated_at = now() where id = order_row.id returning * into order_row;
  insert into public.order_events (order_id, status, detail) values (
    order_row.id, p_next_status,
    case p_next_status when 'picked' then 'Warehouse scan confirmed' when 'packed' then 'Parcel weight captured for routing' else 'Parcel dispatched to the simulated last-mile leg' end
  );

  if p_next_status = 'dispatched' then
    select * into line_row from public.order_lines where order_id = order_row.id limit 1;
    compliance_snapshot := coalesce(line_row.compliance_snapshot, '{}'::jsonb);
    select coalesce(p_weight_grams, p.weight_grams * line_row.quantity) into weight_grams
      from public.products p where p.id = line_row.product_id;
    if weight_grams is null or weight_grams < 1 then raise exception 'A positive parcel weight is required before dispatch' using errcode = '22023'; end if;
    select id into origin_node_id from public.ports_nodes where reference = 'KOR-LEKKI-WH' limit 1;
    select id into destination_node_id from public.ports_nodes where reference = 'KOR-LEKKI-HUB' limit 1;
    select id into drone_id from public.drones where operating_company_id = order_row.operating_company_id order by reference limit 1;
    if origin_node_id is null or destination_node_id is null or drone_id is null then raise exception 'Delivery route and drone fixtures are not configured' using errcode = '55000'; end if;

    insert into public.shipments (reference, order_id, operating_company_id, weight_grams, delivery_method, status, compliance_snapshot)
    values ('SHP-' || order_row.reference, order_row.id, order_row.operating_company_id, weight_grams, 'simulated_drone', 'in_transit', compliance_snapshot)
    returning * into shipment_row;
    insert into public.delivery_legs (shipment_id, operating_company_id, sequence_no, mode, origin_node_id, destination_node_id, status)
    values (shipment_row.id, order_row.operating_company_id, 1, 'simulated_drone', origin_node_id, destination_node_id, 'in_transit');
    insert into public.sorties (reference, shipment_id, drone_id, operating_company_id, status, weather_status)
    values ('SORTIE-' || order_row.reference, shipment_row.id, drone_id, order_row.operating_company_id, 'draft', 'clear') returning * into sortie_row;
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb) into event_rows
    from public.order_events e where e.order_id = order_row.id;
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_advanced', 'order', order_row.id,
    jsonb_build_object('source', 'korama-normalized', 'status', p_next_status));
  return jsonb_build_object(
    'order', to_jsonb(order_row), 'events', event_rows,
    'shipment', case when shipment_row.id is null then null else to_jsonb(shipment_row) end,
    'sortie', case when sortie_row.id is null then null else to_jsonb(sortie_row) end
  );
end;
$$;
