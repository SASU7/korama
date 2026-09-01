-- Hosted-equivalent Ghana checkout-to-delivery contract. Disposable DB only;
-- every mutation rolls back.
begin;

do $$
declare
  consumer_id uuid;
  cocoa_id uuid := '30000000-0000-0000-0000-000000000009';
  granola_id uuid := '30000000-0000-0000-0000-000000000006';
  lamp_id uuid := '30000000-0000-0000-0000-000000000010';
  v_order_id uuid; total_minor bigint; created jsonb;
  gh_opco constant uuid := '10000000-0000-0000-0000-000000000001';
  gh_market constant uuid := '20000000-0000-0000-0000-000000000001';
  address jsonb := '{"recipientName":"Tema Pilot Tester","addressLine":"12 Harbour Link Road","city":"Tema","countryCode":"GH"}'::jsonb;
begin
  select p.id into consumer_id from public.profiles p order by p.created_at limit 1;
  if consumer_id is null then raise exception 'A seeded profile is required'; end if;

  if (select checkout_enabled from public.market_configs where market_id=gh_market and operating_company_id=gh_opco) is not true then
    raise exception 'Ghana checkout is not enabled';
  end if;
  if exists (select 1 from public.market_configs mc join public.markets m on m.id=mc.market_id where m.code='NG' and mc.checkout_enabled) then
    raise exception 'Nigeria must remain catalogue-only';
  end if;
  if (select available_quantity from public.inventory_balances where batch_id='43000000-0000-0000-0000-000000000021') <> 31 then
    raise exception 'VCW-2409 does not advertise 31 Tema units';
  end if;
  if (select available_quantity from public.inventory_balances where batch_id='43000000-0000-0000-0000-000000000022') <> 26 then
    raise exception 'AF-CG-2406 does not advertise 26 Tema units';
  end if;

  -- Checkout rejects unavailable stock before an order/Paystack reference can exist.
  begin
    update public.inventory_balances set available_quantity=0 where batch_id='43000000-0000-0000-0000-000000000021';
    perform public.korama_create_order(consumer_id,'KOR-GH-OUT-OF-STOCK',gh_opco,gh_market,
      jsonb_build_array(jsonb_build_object('productId',cocoa_id,'quantity',1)),address,'simulated_drone');
    raise exception 'Out-of-stock order unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
  if exists(select 1 from public.orders where reference='KOR-GH-OUT-OF-STOCK') then
    raise exception 'Out-of-stock order persisted';
  end if;

  created := public.korama_create_order(consumer_id,'KOR-GH-DIRECT-IMPORT-FEE',gh_opco,gh_market,
    jsonb_build_array(jsonb_build_object('productId',lamp_id,'quantity',1)),address,'ground_courier');
  if (created->'order'->>'delivery_minor')::bigint <> 5500 then raise exception 'Direct-import delivery is not GHc55'; end if;

  created := public.korama_create_order(consumer_id,'KOR-GH-TEMA-E2E',gh_opco,gh_market,
    jsonb_build_array(jsonb_build_object('productId',cocoa_id,'quantity',1),jsonb_build_object('productId',granola_id,'quantity',1)),
    address,'simulated_drone');
  if created->'order'->>'currency' <> 'GHS' then raise exception 'Ghana order is not GHS'; end if;
  if (created->'order'->>'delivery_minor')::bigint <> 4500 then raise exception 'Ghana-origin delivery is not GHc45'; end if;
  select id,o.total_minor into v_order_id,total_minor from public.orders o where reference='KOR-GH-TEMA-E2E';
  perform public.korama_verify_payment(v_order_id,'PAYSTACK-GHS-TEMA-TEST',total_minor,'GHS','ghana-tema-payment-test');
  perform public.korama_allocate_order_fefo('KOR-GH-TEMA-E2E');
  if exists(select 1 from public.order_lines where order_id=v_order_id and allocated_quantity<>quantity) then raise exception 'FEFO did not allocate every line'; end if;
  if exists(select 1 from public.order_lines ol join public.inventory_batches b on b.id=ol.allocated_batch_id where ol.order_id=v_order_id and b.site_id<>'42000000-0000-0000-0000-000000000021') then
    raise exception 'FEFO escaped the configured Tema warehouse';
  end if;
  perform public.korama_advance_order('KOR-GH-TEMA-E2E','picked');
  perform public.korama_advance_order('KOR-GH-TEMA-E2E','packed');
  perform public.korama_advance_order('KOR-GH-TEMA-E2E','dispatched',850);
  if not exists(
    select 1 from public.delivery_legs dl join public.shipments s on s.id=dl.shipment_id
    where s.order_id=v_order_id and dl.origin_node_id='40000000-0000-0000-0000-000000000021'
      and dl.destination_node_id='40000000-0000-0000-0000-000000000022' and dl.mode='simulated_drone'
  ) then raise exception 'Dispatch did not use the configured Tema route'; end if;
  perform public.korama_command_sortie('KOR-GH-TEMA-E2E','preflight');
  perform public.korama_command_sortie('KOR-GH-TEMA-E2E','launch');
  perform public.korama_command_sortie('KOR-GH-TEMA-E2E','advance');
  perform public.korama_command_sortie('KOR-GH-TEMA-E2E','complete');
  if (select status from public.orders where id=v_order_id) <> 'delivered' then raise exception 'Tema sortie did not deliver the order'; end if;

  -- A second light order proves unsafe weather creates the courier fallback.
  created := public.korama_create_order(consumer_id,'KOR-GH-TEMA-WEATHER',gh_opco,gh_market,
    jsonb_build_array(jsonb_build_object('productId',cocoa_id,'quantity',1)),address,'simulated_drone');
  select id,o.total_minor into v_order_id,total_minor from public.orders o where reference='KOR-GH-TEMA-WEATHER';
  perform public.korama_verify_payment(v_order_id,'PAYSTACK-GHS-WEATHER-TEST',total_minor,'GHS','ghana-tema-weather-payment');
  perform public.korama_allocate_order_fefo('KOR-GH-TEMA-WEATHER');
  perform public.korama_advance_order('KOR-GH-TEMA-WEATHER','picked');
  perform public.korama_advance_order('KOR-GH-TEMA-WEATHER','packed');
  perform public.korama_advance_order('KOR-GH-TEMA-WEATHER','dispatched',500);
  perform public.korama_command_sortie('KOR-GH-TEMA-WEATHER','inject_weather');
  if not exists(select 1 from public.delivery_legs dl join public.shipments s on s.id=dl.shipment_id where s.order_id=v_order_id and dl.mode='ground_courier') then
    raise exception 'Unsafe weather did not create courier fallback';
  end if;
end $$;

rollback;
select 'ghana Tema end-to-end database contract pass' as result;
