-- Executable acceptance test for the simulated drone delivery contract.
-- Run only against a local/disposable database after every migration:
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/drone_delivery_contract_test.sql
-- Every mutation is rolled back.

begin;

do $$
declare
  consumer_id uuid;
  pilot_market_id uuid;
  pilot_operating_company_id uuid;
  pilot_country_code text;
  light_product_id uuid;
  heavy_product_id uuid;
  light_weight_grams integer;
  heavy_unit_weight_grams integer;
  heavy_quantity integer;
  heavy_weight_grams integer;
  delivery_address jsonb;
  created jsonb;
begin
  select p.id into consumer_id
    from public.profiles p
    join public.role_assignments ra on ra.profile_id = p.id and ra.role = 'consumer'
   order by p.created_at limit 1;
  if consumer_id is null then raise exception 'A seeded consumer is required'; end if;

  select mc.market_id, mc.operating_company_id, m.code
    into pilot_market_id, pilot_operating_company_id, pilot_country_code
    from public.market_configs mc
    join public.markets m on m.id = mc.market_id
   where mc.checkout_enabled
   order by m.code limit 1;
  if pilot_market_id is null then raise exception 'No checkout-enabled pilot market exists'; end if;

  select p.id, p.weight_grams into light_product_id, light_weight_grams
    from public.market_listings ml join public.products p on p.id = ml.product_id
   where ml.market_id = pilot_market_id
     and ml.operating_company_id = pilot_operating_company_id and ml.purchasable
   order by p.weight_grams asc, p.id limit 1;
  select p.id, p.weight_grams into heavy_product_id, heavy_unit_weight_grams
    from public.market_listings ml join public.products p on p.id = ml.product_id
   where ml.market_id = pilot_market_id
     and ml.operating_company_id = pilot_operating_company_id and ml.purchasable
   order by p.weight_grams desc, p.id limit 1;
  if light_product_id is null or heavy_product_id is null then
    raise exception 'Pilot catalogue needs purchasable products';
  end if;

  heavy_quantity := floor(2000.0 / heavy_unit_weight_grams)::integer + 1;
  if heavy_quantity > 10 then
    raise exception 'No pilot product can exceed the payload limit within the per-line quantity cap';
  end if;
  heavy_weight_grams := heavy_unit_weight_grams * heavy_quantity;
  delivery_address := jsonb_build_object(
    'recipientName', 'Drone Contract Tester',
    'addressLine', '12 Pilot Corridor Road',
    'city', case when pilot_country_code = 'GH' then 'Accra' else 'Lagos' end,
    'countryCode', pilot_country_code
  );

  -- The caller asks for a drone, but SQL must hard-route any >2 kg parcel.
  created := public.korama_create_order(
    consumer_id, 'KOR-DRONE-CONTRACT-HEAVY', pilot_operating_company_id,
    pilot_market_id,
    jsonb_build_array(jsonb_build_object('productId', heavy_product_id, 'quantity', heavy_quantity)),
    delivery_address, 'simulated_drone'
  );
  if created->'order'->>'delivery_method' <> 'ground_courier' then
    raise exception 'Overweight order did not resolve to ground courier';
  end if;
  update public.orders set status = 'packed' where reference = 'KOR-DRONE-CONTRACT-HEAVY';
  perform public.korama_advance_order('KOR-DRONE-CONTRACT-HEAVY', 'dispatched', heavy_weight_grams);
  if not exists (
    select 1 from public.shipments sh join public.orders o on o.id = sh.order_id
    where o.reference = 'KOR-DRONE-CONTRACT-HEAVY' and sh.delivery_method = 'ground_courier'
  ) then raise exception 'Overweight dispatch did not create a courier shipment'; end if;
  if exists (
    select 1 from public.sorties so join public.shipments sh on sh.id = so.shipment_id
    join public.orders o on o.id = sh.order_id where o.reference = 'KOR-DRONE-CONTRACT-HEAVY'
  ) then raise exception 'Overweight dispatch created a sortie'; end if;

  -- A lightweight order follows the requested simulated route.
  perform public.korama_create_order(
    consumer_id, 'KOR-DRONE-CONTRACT-LIGHT', pilot_operating_company_id,
    pilot_market_id,
    jsonb_build_array(jsonb_build_object('productId', light_product_id, 'quantity', 1)),
    delivery_address, 'simulated_drone'
  );
  update public.orders set status = 'packed' where reference = 'KOR-DRONE-CONTRACT-LIGHT';
  perform public.korama_advance_order('KOR-DRONE-CONTRACT-LIGHT', 'dispatched', light_weight_grams);
  perform public.korama_command_sortie('KOR-DRONE-CONTRACT-LIGHT', 'preflight');
  if not exists (
    select 1 from public.sorties so
    join public.authorizations a on a.id = so.authorization_id
    join public.geofences g on g.id = so.geofence_id
    where so.reference = 'SORTIE-KOR-DRONE-CONTRACT-LIGHT' and so.status = 'cleared'
      and a.operating_company_id = pilot_operating_company_id
      and a.status = 'approved' and a.valid_from <= now() and a.valid_until >= now()
      and g.operating_company_id = pilot_operating_company_id
      and g.reference like '%-CORRIDOR' and g.status = 'active'
      and g.geometry->>'type' = 'LineString'
  ) then raise exception 'Preflight did not bind the pilot authorization and route corridor'; end if;

  perform public.korama_command_sortie('KOR-DRONE-CONTRACT-LIGHT', 'launch');
  perform public.korama_command_sortie('KOR-DRONE-CONTRACT-LIGHT', 'abort');
  if not exists (
    select 1 from public.sorties where reference = 'SORTIE-KOR-DRONE-CONTRACT-LIGHT' and status = 'abort'
  ) then raise exception 'Abort did not stop the simulated sortie'; end if;
  if (
    select count(*) from public.delivery_legs dl
    join public.shipments sh on sh.id = dl.shipment_id
    join public.orders o on o.id = sh.order_id
    where o.reference = 'KOR-DRONE-CONTRACT-LIGHT' and dl.mode = 'ground_courier'
  ) <> 1 then raise exception 'Abort did not create exactly one courier fallback'; end if;
end $$;

do $$
declare broken_links integer;
begin
  with ordered as (
    select previous_event_hash,
           lag(event_hash) over (partition by sortie_id order by event_sequence) as expected_previous,
           event_sequence as sequence_no
      from public.sortie_events
     where sortie_id = (select id from public.sorties where reference = 'SORTIE-KOR-DRONE-CONTRACT-LIGHT')
  )
  select count(*) into broken_links from ordered
   where (sequence_no = 1 and previous_event_hash is not null)
      or (sequence_no > 1 and previous_event_hash is distinct from expected_previous);
  if broken_links <> 0 then raise exception 'Sortie event hash chain is broken'; end if;
  if exists (
    select 1 from public.sortie_events
     where sortie_id = (select id from public.sorties where reference = 'SORTIE-KOR-DRONE-CONTRACT-LIGHT')
       and event_hash is null
  ) then raise exception 'A sortie event is missing its hash'; end if;
end $$;

rollback;
select 'drone delivery database contract pass' as result;
