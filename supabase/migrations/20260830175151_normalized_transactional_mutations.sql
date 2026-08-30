-- Server-only transactional primitives for the normalized deep-order path.
-- These functions are SECURITY INVOKER and executable only by service_role.
-- They are exposed through PostgREST only so the trusted server adapter can call
-- one database transaction per state transition; anon/authenticated cannot call
-- them and no security-definer helper is placed in an exposed schema.

alter table public.orders
  add column if not exists delivery_address_snapshot jsonb not null default '{}'::jsonb;

alter table public.shipments
  add column if not exists status text not null default 'planned';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shipments_status_check'
      and conrelid = 'public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_status_check
      check (status in ('planned', 'in_transit', 'delivered', 'fallback'));
  end if;
end
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
  event_rows jsonb;
begin
  select *
    into order_row
    from public.orders
   where reference = p_order_reference
   for update;
  if not found then
    raise exception 'Order was not found' using errcode = 'P0002';
  end if;
  if not (
    (order_row.status = 'allocated' and p_next_status = 'picked')
    or (order_row.status = 'picked' and p_next_status = 'packed')
    or (order_row.status = 'packed' and p_next_status = 'dispatched')
  ) then
    raise exception 'Order cannot advance from % to %', order_row.status, p_next_status using errcode = '22023';
  end if;

  target_task_type := case p_next_status
    when 'picked' then 'pick'
    when 'packed' then 'pack'
    when 'dispatched' then 'dispatch'
  end;
  update public.warehouse_tasks wt
     set status = 'complete', updated_at = now()
   where wt.order_id = order_row.id and wt.task_type = target_task_type and wt.status <> 'complete';

  update public.orders
     set status = p_next_status, updated_at = now()
   where id = order_row.id
  returning * into order_row;
  insert into public.order_events (order_id, status, detail)
  values (
    order_row.id,
    p_next_status,
    case p_next_status
      when 'picked' then 'Warehouse scan confirmed'
      when 'packed' then 'Parcel weight captured for routing'
      else 'Parcel dispatched to the simulated last-mile leg'
    end
  );

  if p_next_status = 'dispatched' then
    select *
      into line_row
      from public.order_lines
     where order_id = order_row.id
     limit 1;
    select coalesce(p_weight_grams, p.weight_grams * line_row.quantity)
      into weight_grams
      from public.products p
     where p.id = line_row.product_id;
    if weight_grams is null or weight_grams < 1 then
      raise exception 'A positive parcel weight is required before dispatch' using errcode = '22023';
    end if;

    select id into origin_node_id from public.ports_nodes where reference = 'KOR-LEKKI-WH' limit 1;
    select id into destination_node_id from public.ports_nodes where reference = 'KOR-LEKKI-HUB' limit 1;
    select id into drone_id from public.drones where operating_company_id = order_row.operating_company_id order by reference limit 1;
    if origin_node_id is null or destination_node_id is null or drone_id is null then
      raise exception 'Delivery route and drone fixtures are not configured' using errcode = '55000';
    end if;

    insert into public.shipments (reference, order_id, operating_company_id, weight_grams, delivery_method, status)
    values ('SHP-' || order_row.reference, order_row.id, order_row.operating_company_id, weight_grams, 'simulated_drone', 'in_transit')
    returning * into shipment_row;
    insert into public.delivery_legs (shipment_id, operating_company_id, sequence_no, mode, origin_node_id, destination_node_id, status)
    values (shipment_row.id, order_row.operating_company_id, 1, 'simulated_drone', origin_node_id, destination_node_id, 'in_transit');
    insert into public.sorties (reference, shipment_id, drone_id, operating_company_id, status, weather_status)
    values ('SORTIE-' || order_row.reference, shipment_row.id, drone_id, order_row.operating_company_id, 'draft', 'clear')
    returning * into sortie_row;
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb)
    into event_rows
    from public.order_events e
   where e.order_id = order_row.id;
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_advanced', 'order', order_row.id, jsonb_build_object('source', 'korama-normalized', 'status', p_next_status));

  return jsonb_build_object(
    'order', to_jsonb(order_row),
    'events', event_rows,
    'shipment', case when shipment_row.id is null then null else to_jsonb(shipment_row) end,
    'sortie', case when sortie_row.id is null then null else to_jsonb(sortie_row) end
  );
end;
$$;

create or replace function public.korama_command_sortie(
  p_order_reference text,
  p_command text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  order_row public.orders%rowtype;
  shipment_row public.shipments%rowtype;
  sortie_row public.sorties%rowtype;
  drone_row public.drones%rowtype;
  first_leg public.delivery_legs%rowtype;
  payload_grams integer;
  weather_status text;
  event_rows jsonb;
  sortie_event_rows jsonb;
begin
  select o.*
    into order_row
    from public.orders o
    join public.shipments sh on sh.order_id = o.id
    join public.sorties so on so.shipment_id = sh.id
   where o.reference = p_order_reference
   for update;
  if not found then
    raise exception 'Shipment or sortie was not found' using errcode = 'P0002';
  end if;
  select sh.*
    into shipment_row
    from public.shipments sh
   where sh.order_id = order_row.id
   for update;
  select so.*
    into sortie_row
    from public.sorties so
   where so.shipment_id = shipment_row.id
   for update;
  select * into first_leg from public.delivery_legs where shipment_id = shipment_row.id order by sequence_no limit 1 for update;
  select * into drone_row from public.drones where id = sortie_row.drone_id for share;
  select coalesce(sum(p.weight_grams * ol.quantity), 0)
    into payload_grams
    from public.order_lines ol
    join public.products p on p.id = ol.product_id
   where ol.order_id = order_row.id;
  select coalesce((select ws.status from public.weather_snapshots ws where ws.sortie_id = sortie_row.id order by ws.observed_at desc limit 1), sortie_row.weather_status)
    into weather_status;

  if p_command = 'inject_weather' then
    if sortie_row.status = 'lockout' then
      return jsonb_build_object('sortie', to_jsonb(sortie_row), 'order', to_jsonb(order_row), 'shipment', to_jsonb(shipment_row), 'idempotent', true);
    end if;
    insert into public.weather_snapshots (sortie_id, status, wind_kph, precipitation)
    values (sortie_row.id, 'unsafe', 48, true);
    update public.sorties set weather_status = 'unsafe', status = 'lockout' where id = sortie_row.id returning * into sortie_row;
    update public.delivery_legs set status = 'fallback' where id = first_leg.id;
    update public.shipments set status = 'fallback' where id = shipment_row.id returning * into shipment_row;
    if not exists (select 1 from public.delivery_legs where shipment_id = shipment_row.id and mode = 'ground_courier') then
      insert into public.delivery_legs (shipment_id, operating_company_id, sequence_no, mode, origin_node_id, destination_node_id, status)
      values (shipment_row.id, shipment_row.operating_company_id, first_leg.sequence_no + 1, 'ground_courier', first_leg.origin_node_id, first_leg.destination_node_id, 'in_transit');
    end if;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'lockout', 'Unsafe weather locked the simulated sortie and created a ground-courier fallback');
  elsif p_command = 'reset_weather' then
    insert into public.weather_snapshots (sortie_id, status, wind_kph, precipitation)
    values (sortie_row.id, 'clear', 8, false);
    update public.sorties set weather_status = 'clear', status = 'draft' where id = sortie_row.id returning * into sortie_row;
    update public.delivery_legs set status = 'in_transit' where id = first_leg.id;
    update public.delivery_legs set status = 'planned' where shipment_id = shipment_row.id and mode = 'ground_courier';
    update public.shipments set status = 'in_transit' where id = shipment_row.id returning * into shipment_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'draft', 'Weather cleared; simulated sortie reset');
  elsif p_command = 'preflight' then
    if sortie_row.status <> 'draft' then
      raise exception 'The sortie is not awaiting preflight' using errcode = '22023';
    end if;
    if weather_status <> 'clear' then
      raise exception 'Preflight blocked: weather is unsafe' using errcode = '22023';
    end if;
    if drone_row.airworthiness_current = false or drone_row.battery_percent < 20 then
      raise exception 'Preflight blocked: aircraft condition or battery is unsafe' using errcode = '22023';
    end if;
    if payload_grams > drone_row.payload_limit_grams then
      raise exception 'Preflight blocked: payload exceeds the simulated limit' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.authorizations a
       where a.operating_company_id = sortie_row.operating_company_id
         and a.status = 'approved'
         and a.valid_from <= now()
         and a.valid_until >= now()
    ) then
      raise exception 'Preflight blocked: no current authorization is on file' using errcode = '22023';
    end if;
    if not exists (select 1 from public.geofences g where g.operating_company_id = sortie_row.operating_company_id and g.status = 'active') then
      raise exception 'Preflight blocked: no active geofence is on file' using errcode = '22023';
    end if;
    update public.sorties set status = 'cleared' where id = sortie_row.id returning * into sortie_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'cleared', 'All normalized safety gates passed');
  elsif p_command = 'launch' then
    if sortie_row.status <> 'cleared' then
      raise exception 'Complete a successful preflight before launch' using errcode = '22023';
    end if;
    update public.sorties set status = 'launched' where id = sortie_row.id returning * into sortie_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'launched', 'Simulated sortie launched');
  elsif p_command = 'advance' then
    if sortie_row.status <> 'launched' then
      raise exception 'Launch the sortie before advancing telemetry' using errcode = '22023';
    end if;
    update public.sorties set status = 'en_route' where id = sortie_row.id returning * into sortie_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'en_route', 'Simulated telemetry advanced en route');
  elsif p_command = 'complete' then
    if sortie_row.status <> 'en_route' then
      raise exception 'The sortie is not en route' using errcode = '22023';
    end if;
    update public.sorties set status = 'delivered' where id = sortie_row.id returning * into sortie_row;
    update public.delivery_legs set status = 'complete' where id = first_leg.id;
    update public.shipments set status = 'delivered' where id = shipment_row.id returning * into shipment_row;
    update public.orders set status = 'delivered', updated_at = now() where id = order_row.id returning * into order_row;
    insert into public.order_events (order_id, status, detail)
    values (order_row.id, 'delivered', 'Simulated delivery completed at the fictional micro-hub');
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'delivered', 'Simulated sortie completed');
  elsif p_command = 'fallback' then
    if sortie_row.status not in ('launched', 'en_route') then
      raise exception 'Manual courier fallback is only available after launch' using errcode = '22023';
    end if;
    update public.sorties set status = 'courier_fallback' where id = sortie_row.id returning * into sortie_row;
    update public.delivery_legs set status = 'fallback' where id = first_leg.id;
    if not exists (select 1 from public.delivery_legs where shipment_id = shipment_row.id and mode = 'ground_courier') then
      insert into public.delivery_legs (shipment_id, operating_company_id, sequence_no, mode, origin_node_id, destination_node_id, status)
      values (shipment_row.id, shipment_row.operating_company_id, first_leg.sequence_no + 1, 'ground_courier', first_leg.origin_node_id, first_leg.destination_node_id, 'in_transit');
    end if;
    update public.shipments set status = 'fallback' where id = shipment_row.id returning * into shipment_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, 'courier_fallback', 'Safety officer handed the parcel to a ground courier');
  else
    raise exception 'Unsupported sortie command' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb)
    into event_rows
    from public.order_events e
   where e.order_id = order_row.id;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb)
    into sortie_event_rows
    from public.sortie_events e
   where e.sortie_id = sortie_row.id;
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'sortie_commanded', 'sortie', sortie_row.id, jsonb_build_object('source', 'korama-normalized', 'reference', p_order_reference, 'command', p_command));

  return jsonb_build_object('sortie', to_jsonb(sortie_row), 'order', to_jsonb(order_row), 'shipment', to_jsonb(shipment_row), 'events', event_rows, 'sortieEvents', sortie_event_rows);
end;
$$;


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

  select ml.*
    into listing_row
    from public.market_listings ml
   where ml.product_id = p_product_id
     and ml.market_id = p_market_id
     and ml.operating_company_id = p_operating_company_id
   for share;
  if not found or not listing_row.purchasable then
    raise exception 'The requested listing is not purchasable in this market' using errcode = '22023';
  end if;
  select p.*
    into product_row
    from public.products p
   where p.id = p_product_id
   for share;
  if not found then
    raise exception 'The requested product was not found' using errcode = '22023';
  end if;
  if p_currency <> listing_row.currency
     or p_subtotal_minor <> listing_row.price_minor * p_quantity
     or p_total_minor <> p_subtotal_minor + p_tax_minor + p_delivery_minor then
    raise exception 'The order quote does not match the market listing' using errcode = '22023';
  end if;

  select s.id
    into site_id
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
  )
  values (
    p_reference, p_profile_id, p_operating_company_id, p_market_id, 'pending_payment',
    p_currency, p_subtotal_minor, p_tax_minor, p_delivery_minor, p_total_minor,
    p_delivery_address
  )
  returning * into order_row;

  insert into public.order_lines (
    order_id, product_id, quantity, price_minor, tax_minor, origin_snapshot,
    seller_snapshot, product_snapshot
  )
  values (
    order_row.id, product_row.id, p_quantity, listing_row.price_minor, p_tax_minor,
    product_row.inventory_class, product_row.producer,
    jsonb_build_object(
      'reference', product_row.reference,
      'name', product_row.name,
      'description', product_row.description,
      'weight_grams', product_row.weight_grams,
      'inventory_class', product_row.inventory_class
    )
  );

  insert into public.addresses (profile_id, label, recipient_name, address_line, city, country_code)
  values (
    p_profile_id, 'Checkout address', p_delivery_address->>'recipientName',
    p_delivery_address->>'addressLine', p_delivery_address->>'city',
    p_delivery_address->>'countryCode'
  );

  insert into public.warehouse_tasks (order_id, site_id, operating_company_id, task_type, status)
  values
    (order_row.id, site_id, p_operating_company_id, 'allocate', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'pick', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'pack', 'open'),
    (order_row.id, site_id, p_operating_company_id, 'dispatch', 'open');

  insert into public.order_events (order_id, status, detail)
  values (order_row.id, 'pending_payment', 'Awaiting server-confirmed payment');

  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_created', 'order', order_row.id, jsonb_build_object('source', 'korama-normalized', 'reference', order_row.reference));

  return jsonb_build_object('order', to_jsonb(order_row));
end;
$$;

create or replace function public.korama_verify_payment(
  p_order_id uuid,
  p_provider_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  order_row public.orders%rowtype;
  payment_row public.payment_attempts%rowtype;
begin
  if coalesce(trim(p_provider_reference), '') = '' or coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'Payment reference and idempotency key are required' using errcode = '22023';
  end if;

  select *
    into order_row
    from public.orders
   where id = p_order_id
   for update;
  if not found then
    raise exception 'Order was not found' using errcode = 'P0002';
  end if;
  if order_row.total_minor <> p_amount_minor or order_row.currency <> p_currency then
    raise exception 'Payment amount or currency does not match the server quote' using errcode = '22023';
  end if;

  select *
    into payment_row
    from public.payment_attempts
   where order_id = p_order_id
     and provider_reference = p_provider_reference;
  if found then
    if payment_row.amount_minor <> p_amount_minor
       or payment_row.currency <> p_currency
       or payment_row.status <> 'paid' then
      raise exception 'Duplicate payment does not match the original verified payment' using errcode = '22023';
    end if;
    return jsonb_build_object('order', to_jsonb(order_row), 'payment', to_jsonb(payment_row), 'idempotent', true);
  end if;
  if order_row.status <> 'pending_payment' then
    raise exception 'The order is not awaiting payment' using errcode = '22023';
  end if;

  insert into public.payment_attempts (order_id, provider_reference, amount_minor, currency, status, idempotency_key)
  values (p_order_id, p_provider_reference, p_amount_minor, p_currency, 'paid', p_idempotency_key)
  returning * into payment_row;

  update public.orders
     set status = 'paid', updated_at = now()
   where id = order_row.id
  returning * into order_row;

  insert into public.order_events (order_id, status, detail)
  values (order_row.id, 'paid', 'Payment amount and currency matched the server quote');
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'payment_verified', 'order', order_row.id, jsonb_build_object('source', 'korama-normalized', 'provider_reference', p_provider_reference));

  return jsonb_build_object('order', to_jsonb(order_row), 'payment', to_jsonb(payment_row), 'idempotent', false);
end;
$$;

create or replace function public.korama_allocate_order_fefo(p_order_reference text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  order_row public.orders%rowtype;
  line_row public.order_lines%rowtype;
  batch_row public.inventory_batches%rowtype;
  balance_row public.inventory_balances%rowtype;
  line_count integer;
begin
  select *
    into order_row
    from public.orders
   where reference = p_order_reference
   for update;
  if not found then
    raise exception 'Order was not found' using errcode = 'P0002';
  end if;
  if order_row.status <> 'paid' then
    raise exception 'Only a paid order can be allocated' using errcode = '22023';
  end if;

  select count(*) into line_count from public.order_lines where order_id = order_row.id;
  if line_count <> 1 then
    raise exception 'Normalized allocation requires exactly one order line' using errcode = '22023';
  end if;
  select *
    into line_row
    from public.order_lines
   where order_id = order_row.id;

  select b.*
    into batch_row
    from public.inventory_batches b
    join public.inventory_balances ib on ib.batch_id = b.id and ib.site_id = b.site_id
   where b.product_id = line_row.product_id
     and b.operating_company_id = order_row.operating_company_id
     and b.quarantined = false
     and b.customs_cleared = true
     and b.origin_supported = true
     and (b.expiry_date is null or b.expiry_date >= current_date)
     and b.quantity - b.allocated >= line_row.quantity
     and ib.available_quantity >= line_row.quantity
   order by b.expiry_date asc nulls last, b.id
   limit 1
   for update of b, ib;
  if not found then
    raise exception 'No valid, non-quarantined, uncleared stock is available' using errcode = '23514';
  end if;

  select *
    into balance_row
    from public.inventory_balances
   where batch_id = batch_row.id
     and site_id = batch_row.site_id
   for update;

  update public.inventory_batches
     set allocated = allocated + line_row.quantity
   where id = batch_row.id
  returning * into batch_row;
  update public.inventory_balances
     set available_quantity = available_quantity - line_row.quantity,
         reserved_quantity = reserved_quantity + line_row.quantity,
         updated_at = now()
   where id = balance_row.id
  returning * into balance_row;
  update public.orders
     set status = 'allocated', updated_at = now()
   where id = order_row.id
  returning * into order_row;
  update public.warehouse_tasks
     set status = 'complete', updated_at = now()
   where order_id = order_row.id and task_type = 'allocate' and status <> 'complete';
  insert into public.inventory_movements (batch_id, operating_company_id, order_id, to_site_id, quantity, movement_type)
  values (batch_row.id, order_row.operating_company_id, order_row.id, batch_row.site_id, line_row.quantity, 'allocate');
  insert into public.order_events (order_id, status, detail)
  values (order_row.id, 'allocated', 'FEFO selected the earliest valid, non-quarantined batch');
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'inventory_allocated', 'order', order_row.id, jsonb_build_object('source', 'korama-normalized', 'batch', batch_row.reference, 'quantity', line_row.quantity));

  return jsonb_build_object('order', to_jsonb(order_row), 'batch', to_jsonb(batch_row), 'balance', to_jsonb(balance_row));
end;
$$;

comment on function public.korama_create_order(uuid, text, uuid, uuid, uuid, integer, text, bigint, bigint, bigint, bigint, jsonb) is 'Server-only atomic normalized order creation';
comment on function public.korama_verify_payment(uuid, text, bigint, text, text) is 'Server-only atomic normalized payment verification';
comment on function public.korama_allocate_order_fefo(text) is 'Server-only atomic normalized FEFO allocation';
comment on function public.korama_advance_order(text, public.order_status, integer) is 'Server-only atomic normalized order transition';
comment on function public.korama_command_sortie(text, text) is 'Server-only atomic normalized sortie transition';

revoke execute on function public.korama_create_order(uuid, text, uuid, uuid, uuid, integer, text, bigint, bigint, bigint, bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.korama_verify_payment(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.korama_allocate_order_fefo(text) from public, anon, authenticated;
revoke execute on function public.korama_advance_order(text, public.order_status, integer) from public, anon, authenticated;
revoke execute on function public.korama_command_sortie(text, text) from public, anon, authenticated;

grant execute on function public.korama_create_order(uuid, text, uuid, uuid, uuid, integer, text, bigint, bigint, bigint, bigint, jsonb) to service_role;
grant execute on function public.korama_verify_payment(uuid, text, bigint, text, text) to service_role;
grant execute on function public.korama_allocate_order_fefo(text) to service_role;
grant execute on function public.korama_advance_order(text, public.order_status, integer) to service_role;
grant execute on function public.korama_command_sortie(text, text) to service_role;
