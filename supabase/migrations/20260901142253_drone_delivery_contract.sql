-- Server-owned delivery routing and simulated-sortie safety contract.
--
-- This remains a digital twin. Nothing in this migration communicates with
-- an aircraft. It makes the demo honest: the checkout preference survives,
-- payload fallback is enforced in SQL, courier orders do not create sorties,
-- preflight binds the configured Lagos authorization and corridor, the safety
-- officer can abort, and the sortie log is hash chained.

alter table public.orders
  add column delivery_method text not null default 'simulated_drone'
    check (delivery_method in ('ground_courier', 'simulated_drone'));

alter table public.drones
  add column manual_override_ready boolean not null default false;

update public.drones
   set manual_override_ready = true
 where reference = 'KOR-D01';

alter table public.sorties
  add column authorization_id uuid references public.authorizations(id),
  add column geofence_id uuid references public.geofences(id);

-- Existing orders predate a persisted route. Backfill the only safe answer for
-- parcels already known to exceed the simulated payload ceiling.
update public.orders o
   set delivery_method = 'ground_courier'
  from (
    select ol.order_id, sum(p.weight_grams * ol.quantity)::integer as weight_grams
      from public.order_lines ol
      join public.products p on p.id = ol.product_id
     group by ol.order_id
  ) weights
 where weights.order_id = o.id
   and weights.weight_grams > 2000;

-- Keep the previous pricing implementation private, then expose one public
-- signature that also owns the delivery decision. The private implementation
-- still computes all money and creates the order atomically.
alter function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb)
  set schema private;
alter function private.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb)
  rename to korama_create_order_priced;

revoke all on function private.korama_create_order_priced(uuid, text, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.korama_create_order_priced(uuid, text, uuid, uuid, jsonb, jsonb) to service_role;

create function public.korama_create_order(
  p_profile_id           uuid,
  p_reference            text,
  p_operating_company_id uuid,
  p_market_id            uuid,
  p_lines                jsonb,
  p_delivery_address     jsonb,
  p_delivery_method      text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  result jsonb;
  order_row public.orders%rowtype;
  parcel_weight_grams integer;
  resolved_method text;
begin
  if p_delivery_method not in ('ground_courier', 'simulated_drone') then
    raise exception 'Choose a supported delivery method' using errcode = '22023';
  end if;

  result := private.korama_create_order_priced(
    p_profile_id, p_reference, p_operating_company_id, p_market_id,
    p_lines, p_delivery_address
  );

  select coalesce(sum(p.weight_grams * ol.quantity), 0)::integer
    into parcel_weight_grams
    from public.order_lines ol
    join public.products p on p.id = ol.product_id
    join public.orders o on o.id = ol.order_id
   where o.reference = p_reference;

  resolved_method := case
    when parcel_weight_grams > 2000 then 'ground_courier'
    else p_delivery_method
  end;

  update public.orders
     set delivery_method = resolved_method,
         updated_at = now()
   where reference = p_reference
  returning * into order_row;

  insert into public.audit_events (
    actor_id, operating_company_id, action, entity_type, entity_id, payload
  ) values (
    null, order_row.operating_company_id, 'delivery_routed', 'order', order_row.id,
    jsonb_build_object(
      'source', 'korama-normalized',
      'requestedMethod', p_delivery_method,
      'resolvedMethod', resolved_method,
      'weightGrams', parcel_weight_grams,
      'payloadLimitGrams', 2000
    )
  );

  return jsonb_build_object(
    'order', to_jsonb(order_row),
    'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb)
                from public.order_lines l where l.order_id = order_row.id)
  );
end;
$$;

-- Dispatch follows the server-resolved method. A courier order has a shipment
-- and ground leg, but deliberately has no drone or sortie row.
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
  declared_weight_grams integer;
  catalogue_weight_grams integer;
  weight_grams integer;
  resolved_method text;
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
    case p_next_status when 'picked' then 'Warehouse scan confirmed' when 'packed' then 'Parcel weight captured for routing' else 'Parcel dispatched to the server-selected last-mile leg' end
  );

  if p_next_status = 'dispatched' then
    select coalesce(sum(p.weight_grams * ol.quantity), 0)::integer
      into catalogue_weight_grams
      from public.order_lines ol
      join public.products p on p.id = ol.product_id
     where ol.order_id = order_row.id;
    declared_weight_grams := coalesce(p_weight_grams, catalogue_weight_grams);
    -- A caller may report a heavier packed parcel, but may not lower the
    -- product-derived weight to defeat the payload rule.
    weight_grams := greatest(declared_weight_grams, catalogue_weight_grams);
    if weight_grams is null or weight_grams < 1 then
      raise exception 'A positive parcel weight is required before dispatch' using errcode = '22023';
    end if;

    resolved_method := case
      when weight_grams > 2000 then 'ground_courier'
      else order_row.delivery_method
    end;
    if resolved_method <> order_row.delivery_method then
      update public.orders set delivery_method = resolved_method, updated_at = now()
       where id = order_row.id returning * into order_row;
    end if;

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
     order by ol.line_no limit 1;
    compliance_snapshot := coalesce(compliance_snapshot, '{}'::jsonb)
      || jsonb_build_object('lines', line_snapshots);

    select id into origin_node_id from public.ports_nodes where reference = 'KOR-LEKKI-WH' limit 1;
    select id into destination_node_id from public.ports_nodes where reference = 'KOR-LEKKI-HUB' limit 1;
    if origin_node_id is null or destination_node_id is null then
      raise exception 'Delivery route fixtures are not configured' using errcode = '55000';
    end if;

    if resolved_method = 'simulated_drone' then
      select id into drone_id
        from public.drones
       where operating_company_id = order_row.operating_company_id
       order by reference limit 1;
      if drone_id is null then
        raise exception 'The simulated drone fixture is not configured' using errcode = '55000';
      end if;
    end if;

    insert into public.shipments (
      reference, order_id, operating_company_id, weight_grams,
      delivery_method, status, compliance_snapshot
    ) values (
      'SHP-' || order_row.reference, order_row.id, order_row.operating_company_id,
      weight_grams, resolved_method, 'in_transit', compliance_snapshot
    ) returning * into shipment_row;

    insert into public.delivery_legs (
      shipment_id, operating_company_id, sequence_no, mode,
      origin_node_id, destination_node_id, status
    ) values (
      shipment_row.id, order_row.operating_company_id, 1, resolved_method,
      origin_node_id, destination_node_id, 'in_transit'
    );

    if resolved_method = 'simulated_drone' then
      insert into public.sorties (
        reference, shipment_id, drone_id, operating_company_id, status, weather_status
      ) values (
        'SORTIE-' || order_row.reference, shipment_row.id, drone_id,
        order_row.operating_company_id, 'draft', 'clear'
      ) returning * into sortie_row;
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at, e.id), '[]'::jsonb)
    into event_rows from public.order_events e where e.order_id = order_row.id;
  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, order_row.operating_company_id, 'order_advanced', 'order', order_row.id,
    jsonb_build_object('source', 'korama-normalized', 'status', p_next_status,
                       'deliveryMethod', order_row.delivery_method));
  return jsonb_build_object(
    'order', to_jsonb(order_row), 'events', event_rows,
    'shipment', case when shipment_row.id is null then null else to_jsonb(shipment_row) end,
    'sortie', case when sortie_row.id is null then null else to_jsonb(sortie_row) end
  );
end;
$$;

-- Patch the established sortie transaction in place. Each replacement is
-- asserted so a future edit to the source function cannot silently skip a
-- safety rule during a fresh migration replay.
do $$
declare
  body text;
  changed text;
begin
  select pg_get_functiondef(oid) into body
    from pg_proc
   where proname = 'korama_command_sortie'
     and pronamespace = 'public'::regnamespace;

  changed := replace(body,
    'if drone_row.airworthiness_current = false or drone_row.battery_percent < 20 then
      raise exception ''Preflight blocked: aircraft condition or battery is unsafe'' using errcode = ''22023'';
    end if;',
    'if drone_row.airworthiness_current = false or drone_row.battery_percent < 20 or drone_row.manual_override_ready = false then
      raise exception ''Preflight blocked: aircraft condition, battery, or manual override is unsafe'' using errcode = ''22023'';
    end if;');
  if changed = body then raise exception 'Could not install manual-override preflight rule'; end if;
  body := changed;

  changed := replace(body,
    'if not exists (
      select 1 from public.authorizations a
       where a.operating_company_id = sortie_row.operating_company_id
         and a.status = ''approved''
         and a.valid_from <= now()
         and a.valid_until >= now()
    ) then
      raise exception ''Preflight blocked: no current authorization is on file'' using errcode = ''22023'';
    end if;
    if not exists (select 1 from public.geofences g where g.operating_company_id = sortie_row.operating_company_id and g.status = ''active'') then
      raise exception ''Preflight blocked: no active geofence is on file'' using errcode = ''22023'';
    end if;',
    'if not exists (
      select 1 from public.authorizations a
       where a.operating_company_id = sortie_row.operating_company_id
         and a.jurisdiction = ''Nigeria · Lagos corridor''
         and a.status = ''approved''
         and a.valid_from <= now()
         and a.valid_until >= now()
    ) then
      raise exception ''Preflight blocked: the Lagos route authorization is missing or outside its validity window'' using errcode = ''22023'';
    end if;
    if not exists (
      select 1 from public.geofences g
       where g.operating_company_id = sortie_row.operating_company_id
         and g.reference like ''KOR-LEKKI-%-CORRIDOR''
         and g.status = ''active''
         and g.geometry->>''type'' = ''LineString''
    ) then
      raise exception ''Preflight blocked: the Lekki route geofence is missing or inactive'' using errcode = ''22023'';
    end if;');
  if changed = body then raise exception 'Could not install route-bound preflight rules'; end if;
  body := changed;

  changed := replace(body,
    'update public.sorties set status = ''cleared'' where id = sortie_row.id returning * into sortie_row;',
    'update public.sorties set
       status = ''cleared'',
       authorization_id = (
         select id from public.authorizations
          where operating_company_id = sortie_row.operating_company_id
            and jurisdiction = ''Nigeria · Lagos corridor''
            and status = ''approved'' and valid_from <= now() and valid_until >= now()
          order by valid_until desc limit 1
       ),
       geofence_id = (
         select id from public.geofences
          where operating_company_id = sortie_row.operating_company_id
            and reference like ''KOR-LEKKI-%-CORRIDOR''
            and status = ''active'' and geometry->>''type'' = ''LineString''
          order by created_at desc limit 1
       )
     where id = sortie_row.id returning * into sortie_row;');
  if changed = body then raise exception 'Could not bind preflight evidence to the sortie'; end if;
  body := changed;

  changed := replace(body,
    'elsif p_command = ''fallback'' then',
    'elsif p_command = ''abort'' then
    if sortie_row.status not in (''cleared'', ''launched'', ''en_route'') then
      raise exception ''Only a cleared or active sortie can be aborted'' using errcode = ''22023'';
    end if;
    update public.sorties set status = ''abort'' where id = sortie_row.id returning * into sortie_row;
    update public.delivery_legs set status = ''fallback'' where id = first_leg.id;
    if not exists (select 1 from public.delivery_legs where shipment_id = shipment_row.id and mode = ''ground_courier'') then
      insert into public.delivery_legs (shipment_id, operating_company_id, sequence_no, mode, origin_node_id, destination_node_id, status)
      values (shipment_row.id, shipment_row.operating_company_id, first_leg.sequence_no + 1, ''ground_courier'', first_leg.origin_node_id, first_leg.destination_node_id, ''in_transit'');
    end if;
    update public.shipments set status = ''fallback'' where id = shipment_row.id returning * into shipment_row;
    insert into public.sortie_events (sortie_id, operating_company_id, status, detail)
    values (sortie_row.id, sortie_row.operating_company_id, ''abort'', ''Safety officer aborted the simulated sortie and created a ground-courier fallback'');
  elsif p_command = ''fallback'' then');
  if changed = body then raise exception 'Could not install abort transition'; end if;

  execute changed;
end $$;

-- Hash-chain the black-box events. This is tamper-evident, not immutable:
-- database administrators remain trusted, but ordinary mutation is detectable.
alter table public.sortie_events
  add column event_sequence integer,
  add column previous_event_hash text,
  add column event_hash text;

do $$
declare
  event_row public.sortie_events%rowtype;
  previous_sortie_id uuid;
  sequence_no integer := 0;
  previous_hash text;
  computed_hash text;
begin
  for event_row in select * from public.sortie_events order by sortie_id, created_at, id loop
    if event_row.sortie_id is distinct from previous_sortie_id then
      previous_hash := null;
      sequence_no := 0;
    end if;
    sequence_no := sequence_no + 1;
    computed_hash := encode(extensions.digest(
      coalesce(previous_hash, 'GENESIS') || jsonb_build_object(
        'id', event_row.id,
        'eventSequence', sequence_no,
        'sortieId', event_row.sortie_id,
        'operatingCompanyId', event_row.operating_company_id,
        'status', event_row.status,
        'detail', event_row.detail,
        'createdAt', event_row.created_at
      )::text,
      'sha256'
    ), 'hex');
    update public.sortie_events
       set event_sequence = sequence_no,
           previous_event_hash = previous_hash,
           event_hash = computed_hash
     where id = event_row.id;
    previous_hash := computed_hash;
    previous_sortie_id := event_row.sortie_id;
  end loop;
end $$;

create or replace function private.chain_sortie_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  prior_hash text;
  prior_sequence integer;
begin
  perform pg_advisory_xact_lock(hashtext('korama_sortie_event:' || new.sortie_id::text));
  select event_hash, event_sequence into prior_hash, prior_sequence
    from public.sortie_events
   where sortie_id = new.sortie_id
   order by event_sequence desc
   limit 1;
  new.event_sequence := coalesce(prior_sequence, 0) + 1;
  new.previous_event_hash := prior_hash;
  new.event_hash := encode(extensions.digest(
    coalesce(prior_hash, 'GENESIS') || jsonb_build_object(
      'id', new.id,
      'eventSequence', new.event_sequence,
      'sortieId', new.sortie_id,
      'operatingCompanyId', new.operating_company_id,
      'status', new.status,
      'detail', new.detail,
      'createdAt', new.created_at
    )::text,
    'sha256'
  ), 'hex');
  return new;
end;
$$;

create trigger sortie_events_hash_chain
before insert on public.sortie_events
for each row execute function private.chain_sortie_event();

alter table public.sortie_events
  alter column event_sequence set not null,
  alter column event_hash set not null,
  add constraint sortie_events_sequence_positive check (event_sequence > 0),
  add constraint sortie_events_hash_format check (event_hash ~ '^[0-9a-f]{64}$'),
  add constraint sortie_events_previous_hash_format check (
    previous_event_hash is null or previous_event_hash ~ '^[0-9a-f]{64}$'
  );

create unique index sortie_events_sortie_sequence_key
  on public.sortie_events(sortie_id, event_sequence);

comment on column public.orders.delivery_method is 'Server-resolved last-mile method; overweight always resolves to ground_courier';
comment on column public.sorties.authorization_id is 'Exact authorization bound when preflight clears';
comment on column public.sorties.geofence_id is 'Exact route corridor bound when preflight clears';
comment on column public.sortie_events.event_hash is 'SHA-256 chain hash for tamper-evident simulated flight records';
comment on column public.sortie_events.event_sequence is 'Monotonic per-sortie insertion order used by the event hash chain';
comment on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb, text)
  is 'Server-only multi-line order creation with authoritative delivery routing';
comment on function public.korama_advance_order(text, public.order_status, integer)
  is 'Server-only order transition that creates a courier leg or simulated sortie according to persisted routing';
comment on function public.korama_command_sortie(text, text)
  is 'Server-only simulated sortie transition with route-bound preflight and safety abort';

revoke execute on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.korama_advance_order(text, public.order_status, integer) from public, anon, authenticated;
revoke execute on function public.korama_command_sortie(text, text) from public, anon, authenticated;
revoke all on function private.chain_sortie_event() from public;

grant execute on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb, text) to service_role;
grant execute on function public.korama_advance_order(text, public.order_status, integer) to service_role;
grant execute on function public.korama_command_sortie(text, text) to service_role;
