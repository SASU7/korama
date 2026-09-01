-- Multi-line orders.
--
-- The order pipeline was hard-coded to exactly one line: korama_create_order
-- took a single p_product_id, and korama_allocate_order_fefo raised
-- 'Normalized allocation requires exactly one order line'. A real cart needs
-- many, so this migration generalises creation, allocation and dispatch.
--
-- The other change of substance is that korama_create_order no longer accepts
-- any money at all. It used to be handed subtotal/tax/delivery/total and merely
-- check them; now it computes them from market_listings. The client cannot even
-- propose a price.

-- ---------------------------------------------------------------------------
-- Pre-flight. Fail loudly rather than half-apply against data the new unique
-- index would reject.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.order_lines
     group by order_id, product_id
    having count(*) > 1
  ) then
    raise exception 'Existing orders contain duplicate product lines; resolve before migrating';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.order_lines
  add column if not exists line_no smallint not null default 1,
  add column if not exists market_listing_id uuid references public.market_listings(id),
  add column if not exists subtotal_minor bigint not null default 0,
  add column if not exists delivery_minor bigint not null default 0,
  -- Allocation provenance. The allocate route used to reverse-engineer the
  -- batch by looking for `allocated > 0`, which is also true of batches
  -- reserved by earlier orders.
  add column if not exists allocated_batch_id uuid references public.inventory_batches(id),
  add column if not exists allocated_quantity integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_lines_line_no_positive'
  ) then
    alter table public.order_lines
      add constraint order_lines_line_no_positive check (line_no >= 1),
      add constraint order_lines_subtotal_non_negative check (subtotal_minor >= 0),
      add constraint order_lines_delivery_non_negative check (delivery_minor >= 0),
      add constraint order_lines_allocated_non_negative check (allocated_quantity >= 0);
  end if;
end $$;

-- Backfill pre-migration single-line orders.
update public.order_lines ol
   set subtotal_minor = ol.price_minor * ol.quantity
 where ol.subtotal_minor = 0;
update public.order_lines ol
   set delivery_minor = o.delivery_minor
  from public.orders o
 where o.id = ol.order_id and ol.delivery_minor = 0;

create unique index if not exists order_lines_order_line_no_key
  on public.order_lines(order_id, line_no);
-- A cart is a map, so duplicate products are a client bug, not something to
-- silently fold together.
create unique index if not exists order_lines_order_product_key
  on public.order_lines(order_id, product_id);
create index if not exists order_lines_order_idx
  on public.order_lines(order_id, line_no);

-- ---------------------------------------------------------------------------
-- korama_create_order: p_lines jsonb, server-computed money
--
-- Dropped rather than overloaded: PostgREST resolves overloads by supplied
-- argument names and the type generator would emit a union of both shapes.
-- ---------------------------------------------------------------------------
drop function if exists public.korama_create_order(
  uuid, text, uuid, uuid, uuid, integer, text, bigint, bigint, bigint, bigint, jsonb);

create function public.korama_create_order(
  p_profile_id           uuid,
  p_reference            text,
  p_operating_company_id uuid,
  p_market_id            uuid,
  p_lines                jsonb,   -- [{ "productId": uuid, "quantity": int }, ...]
  p_delivery_address     jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  max_lines           constant integer := 10;
  max_line_quantity   constant integer := 10;
  max_total_quantity  constant integer := 30;
  tax_rate            constant numeric := 0.075;
  delivery_ghana      constant bigint  := 450000;
  delivery_import     constant bigint  := 550000;

  market_row   public.markets%rowtype;
  listing_row  public.market_listings%rowtype;
  product_row  public.products%rowtype;
  order_row    public.orders%rowtype;
  element      jsonb;
  ordinality   integer;
  line_count   integer;
  line_product uuid;
  line_qty     integer;
  line_subtotal bigint;
  line_tax      bigint;
  order_currency text;
  total_quantity integer := 0;
  subtotal_total bigint := 0;
  tax_total      bigint := 0;
  delivery_total bigint := 0;
  has_direct_import boolean := false;
  site_id uuid;
  compliance_snapshot jsonb;
  staged jsonb := '[]'::jsonb;
  apportioned bigint := 0;
  remainder bigint;
begin
  -- Shape ---------------------------------------------------------------
  if jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Order lines must be an array' using errcode = '22023';
  end if;
  line_count := jsonb_array_length(p_lines);
  if line_count < 1 then
    raise exception 'An order needs at least one line' using errcode = '22023';
  end if;
  if line_count > max_lines then
    raise exception 'An order may contain at most % lines', max_lines using errcode = '22023';
  end if;
  if line_count <> (
    select count(distinct e->>'productId') from jsonb_array_elements(p_lines) e
  ) then
    raise exception 'Order lines must not repeat a product' using errcode = '22023';
  end if;

  -- Address. Re-checked here even though the route validates it: the RPC must
  -- never trust its caller.
  if jsonb_typeof(p_delivery_address) <> 'object'
     or coalesce(p_delivery_address->>'recipientName', '') = ''
     or coalesce(p_delivery_address->>'addressLine', '') = ''
     or coalesce(p_delivery_address->>'city', '') = ''
     or coalesce(p_delivery_address->>'countryCode', '') <> 'NG' then
    raise exception 'A complete Nigerian delivery address is required' using errcode = '22023';
  end if;

  -- Market. A cart may not mix markets; this is one of four independent
  -- places that holds, alongside the per-line market_id filter, the currency
  -- check, and the operating-company filter.
  select * into market_row from public.markets where id = p_market_id;
  if not found then
    raise exception 'The requested market was not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.market_configs mc
     where mc.market_id = p_market_id
       and mc.operating_company_id = p_operating_company_id
       and mc.checkout_enabled
  ) then
    raise exception 'Checkout is not enabled for %', market_row.name using errcode = '22023';
  end if;

  select s.id into site_id
    from public.sites s
   where s.reference = 'KOR-LEKKI-WAREHOUSE-SITE'
     and s.operating_company_id = p_operating_company_id
   limit 1;
  if site_id is null then
    raise exception 'The destination warehouse is not configured' using errcode = '55000';
  end if;

  -- Price every line from the listing --------------------------------------
  for element, ordinality in
    select value, ord from jsonb_array_elements(p_lines) with ordinality as t(value, ord)
  loop
    if coalesce(element->>'productId', '') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Line %: productId must be a uuid', ordinality using errcode = '22023';
    end if;
    line_product := (element->>'productId')::uuid;

    begin
      line_qty := (element->>'quantity')::integer;
    exception when others then
      raise exception 'Line %: quantity must be a whole number', ordinality using errcode = '22023';
    end;
    if line_qty is null or line_qty < 1 or line_qty > max_line_quantity then
      raise exception 'Line %: quantity must be between 1 and %', ordinality, max_line_quantity using errcode = '22023';
    end if;
    total_quantity := total_quantity + line_qty;
    if total_quantity > max_total_quantity then
      raise exception 'An order may contain at most % units in total', max_total_quantity using errcode = '22023';
    end if;

    select ml.* into listing_row
      from public.market_listings ml
     where ml.product_id = line_product
       and ml.market_id = p_market_id
       and ml.operating_company_id = p_operating_company_id
     for share;
    if not found or not listing_row.purchasable then
      raise exception 'Line %: the listing is not purchasable in this market', ordinality using errcode = '22023';
    end if;

    select p.* into product_row from public.products p where p.id = line_product for share;
    if not found then
      raise exception 'Line %: the product was not found', ordinality using errcode = 'P0002';
    end if;

    if order_currency is null then
      order_currency := listing_row.currency;
      if order_currency <> market_row.currency then
        raise exception 'Listing currency % does not match market currency %',
          order_currency, market_row.currency using errcode = '22023';
      end if;
    elsif listing_row.currency <> order_currency then
      raise exception 'Line %: an order cannot mix currencies', ordinality using errcode = '22023';
    end if;

    line_subtotal := listing_row.price_minor::bigint * line_qty;
    -- Per line and summed, so sum(lines.tax) = orders.tax is an invariant
    -- rather than an approximation. lib/domain.ts must round identically.
    line_tax := round(line_subtotal * tax_rate)::bigint;
    subtotal_total := subtotal_total + line_subtotal;
    tax_total := tax_total + line_tax;
    if product_row.inventory_class <> 'ghana_origin_export' then
      has_direct_import := true;
    end if;

    select jsonb_build_object(
      'assessment', oa.status,
      'transformation', oa.transformation_summary,
      'evidence', oa.evidence,
      'dutyQuote', coalesce(dq.quote, oa.duty_quote),
      'certificateWatermark', coalesce(cp.watermark, 'PREVIEW — NOT A VALID CERTIFICATE'),
      'productReference', product_row.reference,
      'productName', product_row.name,
      'batchReference', ib.reference,
      'assessedAt', oa.created_at
    ) into compliance_snapshot
      from public.origin_assessments oa
      join public.inventory_batches ib on ib.id = oa.batch_id
      left join public.duty_quotes dq on dq.origin_assessment_id = oa.id
      left join public.certificate_previews cp on cp.origin_assessment_id = oa.id
     where ib.product_id = product_row.id
       and oa.status = 'provisionally_eligible'
     order by oa.created_at desc, oa.id
     limit 1;

    staged := staged || jsonb_build_object(
      'lineNo', ordinality,
      'productId', product_row.id,
      'listingId', listing_row.id,
      'quantity', line_qty,
      'priceMinor', listing_row.price_minor,
      'subtotalMinor', line_subtotal,
      'taxMinor', line_tax,
      'originSnapshot', product_row.inventory_class,
      'sellerSnapshot', product_row.producer,
      'productSnapshot', jsonb_build_object(
        'reference', product_row.reference,
        'name', product_row.name,
        'description', product_row.description,
        'weight_grams', product_row.weight_grams,
        'inventory_class', product_row.inventory_class
      ),
      'complianceSnapshot', coalesce(compliance_snapshot, '{}'::jsonb)
    );
  end loop;

  -- Delivery is an order-level cost: one parcel, one address. Summing per line
  -- would charge five delivery fees for one box, so the rule is the maximum of
  -- the rates present, which also means no existing single-line quote changes.
  delivery_total := case when has_direct_import then delivery_import else delivery_ghana end;

  insert into public.orders (
    reference, profile_id, operating_company_id, market_id, status, currency,
    subtotal_minor, tax_minor, delivery_minor, total_minor, delivery_address_snapshot
  ) values (
    p_reference, p_profile_id, p_operating_company_id, p_market_id, 'pending_payment',
    order_currency, subtotal_total, tax_total, delivery_total,
    subtotal_total + tax_total + delivery_total, p_delivery_address
  ) returning * into order_row;

  -- Apportion delivery across lines by subtotal, pushing the integer residual
  -- onto line 1 so sum(lines.delivery) = orders.delivery exactly.
  for element in select value from jsonb_array_elements(staged) loop
    if subtotal_total > 0 then
      remainder := (delivery_total * (element->>'subtotalMinor')::bigint) / subtotal_total;
    else
      remainder := delivery_total / line_count;
    end if;
    apportioned := apportioned + remainder;

    insert into public.order_lines (
      order_id, line_no, product_id, market_listing_id, quantity, price_minor,
      subtotal_minor, tax_minor, delivery_minor, origin_snapshot, seller_snapshot,
      product_snapshot, compliance_snapshot
    ) values (
      order_row.id,
      (element->>'lineNo')::smallint,
      (element->>'productId')::uuid,
      (element->>'listingId')::uuid,
      (element->>'quantity')::integer,
      (element->>'priceMinor')::bigint,
      (element->>'subtotalMinor')::bigint,
      (element->>'taxMinor')::bigint,
      remainder,
      (element->>'originSnapshot')::public.inventory_class,
      element->>'sellerSnapshot',
      element->'productSnapshot',
      element->'complianceSnapshot'
    );
  end loop;
  if delivery_total <> apportioned then
    update public.order_lines
       set delivery_minor = delivery_minor + (delivery_total - apportioned)
     where order_id = order_row.id and line_no = 1;
  end if;

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
    jsonb_build_object('source', 'korama-normalized', 'reference', order_row.reference,
                       'lineCount', line_count, 'itemCount', total_quantity));

  return jsonb_build_object(
    'order', to_jsonb(order_row),
    'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb)
                from public.order_lines l where l.order_id = order_row.id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- korama_allocate_order_fefo: per line, all or nothing
-- ---------------------------------------------------------------------------
create or replace function public.korama_allocate_order_fefo(p_order_reference text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  order_row   public.orders%rowtype;
  line_row    public.order_lines%rowtype;
  batch_row   public.inventory_batches%rowtype;
  balance_row public.inventory_balances%rowtype;
  allocations jsonb := '[]'::jsonb;
begin
  select * into order_row from public.orders where reference = p_order_reference for update;
  if not found then
    raise exception 'Order was not found' using errcode = 'P0002';
  end if;

  -- Idempotent replay. Without this a retry after a partial failure hit
  -- 'Only a paid order can be allocated', which is a confusing second error.
  if order_row.status <> 'pending_payment' and order_row.status <> 'paid' then
    if order_row.status = 'allocated' then
      select coalesce(jsonb_agg(jsonb_build_object(
               'lineNo', l.line_no, 'batchId', l.allocated_batch_id,
               'batchReference', b.reference, 'quantity', l.allocated_quantity)
               order by l.line_no), '[]'::jsonb)
        into allocations
        from public.order_lines l
        left join public.inventory_batches b on b.id = l.allocated_batch_id
       where l.order_id = order_row.id;
      return jsonb_build_object('order', to_jsonb(order_row), 'allocations', allocations, 'idempotent', true);
    end if;
  end if;
  if order_row.status <> 'paid' then
    raise exception 'Only a paid order can be allocated' using errcode = '22023';
  end if;

  -- Two concurrent multi-line allocations can take batch locks in opposite
  -- orders and deadlock; ordering by line_no does not help because different
  -- orders hold different products. Serialise per operating company.
  perform pg_advisory_xact_lock(hashtext('korama_allocate:' || order_row.operating_company_id::text));

  -- No exception block around this loop: a BEGIN...EXCEPTION would open a
  -- subtransaction and let partial allocation survive a later failure.
  for line_row in
    select * from public.order_lines where order_id = order_row.id order by line_no for update
  loop
    select b.*
      into batch_row
      from public.inventory_batches b
      join public.inventory_balances ib on ib.batch_id = b.id and ib.site_id = b.site_id
     where b.product_id = line_row.product_id
       and b.operating_company_id = order_row.operating_company_id
       and b.quarantined = false
       and b.customs_cleared = true
       -- origin_supported is a Ghana-origin concept. Applying it to every
       -- class made directly imported stock permanently unallocatable.
       and (b.inventory_class <> 'ghana_origin_export' or b.origin_supported = true)
       and (b.expiry_date is null or b.expiry_date >= current_date)
       and b.quantity - b.allocated >= line_row.quantity
       and ib.available_quantity >= line_row.quantity
     order by b.expiry_date asc nulls last, b.id
     limit 1
     for update of b, ib;
    if not found then
      raise exception 'Line %: no valid, in-date, non-quarantined stock covers % unit(s)',
        line_row.line_no, line_row.quantity using errcode = '23514';
    end if;

    select * into balance_row
      from public.inventory_balances
     where batch_id = batch_row.id and site_id = batch_row.site_id
     for update;

    update public.inventory_batches
       set allocated = allocated + line_row.quantity
     where id = batch_row.id
    returning * into batch_row;

    update public.inventory_balances
       set available_quantity = available_quantity - line_row.quantity,
           reserved_quantity  = reserved_quantity + line_row.quantity,
           updated_at = now()
     where id = balance_row.id
    returning * into balance_row;

    -- Record which batch actually covered this line.
    update public.order_lines
       set allocated_batch_id = batch_row.id,
           allocated_quantity = line_row.quantity,
           -- The certificate should name the batch that shipped, not an
           -- arbitrary assessed one.
           compliance_snapshot = case
             when compliance_snapshot ? 'assessment'
               then jsonb_set(compliance_snapshot, '{batchReference}', to_jsonb(batch_row.reference))
             else compliance_snapshot
           end
     where id = line_row.id;

    insert into public.inventory_movements (batch_id, operating_company_id, order_id, to_site_id, quantity, movement_type)
    values (batch_row.id, order_row.operating_company_id, order_row.id, batch_row.site_id, line_row.quantity, 'allocate');

    allocations := allocations || jsonb_build_object(
      'lineNo', line_row.line_no,
      'batchId', batch_row.id,
      'batchReference', batch_row.reference,
      'quantity', line_row.quantity
    );
  end loop;

  update public.orders set status = 'allocated', updated_at = now()
   where id = order_row.id returning * into order_row;
  update public.warehouse_tasks set status = 'complete', updated_at = now()
   where order_id = order_row.id and task_type = 'allocate' and status <> 'complete';
  insert into public.order_events (order_id, status, detail)
  values (order_row.id, 'allocated',
    'FEFO allocated ' || jsonb_array_length(allocations) || ' line(s) from the earliest valid batches');
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'inventory_allocated', 'order', order_row.id,
    jsonb_build_object('source', 'korama-normalized', 'allocations', allocations));

  return jsonb_build_object('order', to_jsonb(order_row), 'allocations', allocations);
end;
$$;

-- ---------------------------------------------------------------------------
-- korama_advance_order: weight and compliance across every line
-- ---------------------------------------------------------------------------
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
  shipment_row public.shipments%rowtype;
  sortie_row public.sorties%rowtype;
  origin_node_id uuid;
  destination_node_id uuid;
  drone_id uuid;
  target_task_type text;
  weight_grams integer;
  compliance_snapshot jsonb := '{}'::jsonb;
  line_snapshots jsonb;
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
    -- One parcel carries every line, so weight sums across them.
    select coalesce(p_weight_grams, sum(p.weight_grams * ol.quantity)::integer)
      into weight_grams
      from public.order_lines ol
      join public.products p on p.id = ol.product_id
     where ol.order_id = order_row.id;
    if weight_grams is null or weight_grams < 1 then
      raise exception 'A positive parcel weight is required before dispatch' using errcode = '22023';
    end if;

    -- A parcel can carry a Ghana-origin line and a direct import together, so
    -- one flat snapshot cannot represent it honestly. The legacy top-level
    -- keys are kept, taken from the first Ghana-origin line, so existing
    -- readers keep working.
    select coalesce(jsonb_agg(jsonb_build_object('lineNo', ol.line_no) || ol.compliance_snapshot
                              order by ol.line_no), '[]'::jsonb)
      into line_snapshots
      from public.order_lines ol
     where ol.order_id = order_row.id and ol.compliance_snapshot ? 'assessment';

    select ol.compliance_snapshot into compliance_snapshot
      from public.order_lines ol
     where ol.order_id = order_row.id
       and ol.origin_snapshot = 'ghana_origin_export'
       and ol.compliance_snapshot ? 'assessment'
     order by ol.line_no
     limit 1;
    compliance_snapshot := coalesce(compliance_snapshot, '{}'::jsonb)
      || jsonb_build_object('lines', line_snapshots);

    select id into origin_node_id from public.ports_nodes where reference = 'KOR-LEKKI-WH' limit 1;
    select id into destination_node_id from public.ports_nodes where reference = 'KOR-LEKKI-HUB' limit 1;
    select id into drone_id from public.drones where operating_company_id = order_row.operating_company_id order by reference limit 1;
    if origin_node_id is null or destination_node_id is null or drone_id is null then
      raise exception 'Delivery route and drone fixtures are not configured' using errcode = '55000';
    end if;

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

-- ---------------------------------------------------------------------------
-- korama_command_sortie: let a payload-rejected preflight reach fallback
--
-- Multi-line carts make this reachable for the first time. Preflight rejects a
-- parcel over the 2kg payload limit and leaves the sortie in 'draft', but
-- 'fallback' required 'launched' or 'en_route' — so a heavy parcel could never
-- be handed to a ground courier, which is exactly what should happen to it.
-- ---------------------------------------------------------------------------
do $$
declare
  body text;
begin
  select pg_get_functiondef(oid) into body
    from pg_proc
   where proname = 'korama_command_sortie'
     and pronamespace = 'public'::regnamespace;

  body := replace(
    body,
    'if sortie_row.status not in (''launched'', ''en_route'') then
      raise exception ''Manual courier fallback is only available after launch'' using errcode = ''22023'';',
    'if sortie_row.status not in (''draft'', ''preflight'', ''lockout'', ''launched'', ''en_route'') then
      raise exception ''Courier fallback is not available from this state'' using errcode = ''22023'';');

  execute body;
end $$;

-- ---------------------------------------------------------------------------
-- Grants. korama_create_order changed signature, so its ACL went with the
-- dropped function and must be restated. The other two were replaced in place
-- and kept theirs, but restating keeps a fresh `db reset` self-documenting.
-- ---------------------------------------------------------------------------
comment on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb)
  is 'Server-only atomic normalized multi-line order creation; all money is computed server-side';
comment on function public.korama_allocate_order_fefo(text)
  is 'Server-only atomic normalized per-line FEFO allocation; all-or-nothing';
comment on function public.korama_advance_order(text, public.order_status, integer)
  is 'Server-only atomic normalized order transition across every line';

revoke execute on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.korama_allocate_order_fefo(text) from public, anon, authenticated;
revoke execute on function public.korama_advance_order(text, public.order_status, integer) from public, anon, authenticated;

grant execute on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb) to service_role;
grant execute on function public.korama_allocate_order_fefo(text) to service_role;
grant execute on function public.korama_advance_order(text, public.order_status, integer) to service_role;
