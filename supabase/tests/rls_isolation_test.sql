begin;

select plan(37);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
  ('51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'consumer@example.test', '{}'::jsonb, '{}'::jsonb),
  ('51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ghana-operator@example.test', '{}'::jsonb, '{}'::jsonb),
  ('51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'nigeria-operator@example.test', '{}'::jsonb, '{}'::jsonb),
  ('51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'nigeria-admin@example.test', '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, operating_company_id, market_id) values
  ('51000000-0000-0000-0000-000000000001', 'Test consumer', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('51000000-0000-0000-0000-000000000002', 'Ghana operator', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000003', 'Nigeria operator', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('51000000-0000-0000-0000-000000000004', 'Nigeria administrator', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;
update public.profiles set tenant_id = '11000000-0000-0000-0000-000000000001' where id = '51000000-0000-0000-0000-000000000001';

insert into public.role_assignments (profile_id, role) values
  ('51000000-0000-0000-0000-000000000002', 'warehouse_operator'),
  ('51000000-0000-0000-0000-000000000003', 'warehouse_operator'),
  ('51000000-0000-0000-0000-000000000004', 'administrator')
on conflict (profile_id, role) do nothing;

insert into public.orders (id, reference, profile_id, operating_company_id, market_id, status, currency, subtotal_minor, tax_minor, delivery_minor, total_minor) values
  ('52000000-0000-0000-0000-000000000001', 'RLS-ORDER-001', '51000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'paid', 'NGN', 485000, 36375, 450000, 971375)
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
set role authenticated;
select is((select count(*)::int from public.orders where id = '52000000-0000-0000-0000-000000000001'), 1, 'consumer can read the consumer-owned order');

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.orders where id = '52000000-0000-0000-0000-000000000001'), 0, 'operator from another operating company cannot read the order');

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000003', true);
select is((select count(*)::int from public.orders where id = '52000000-0000-0000-0000-000000000001'), 1, 'operator in the assigned operating company can read the order');
select is((select count(*)::int from public.audit_events), 0, 'audit events remain server-only');
select is((select count(*)::int from public.payment_attempts), 0, 'payment attempts remain server-only');
select throws_ok($$insert into public.role_assignments (profile_id, role) values ('51000000-0000-0000-0000-000000000003', 'administrator')$$, '42501', null, 'authenticated users cannot self-assign roles');
select is((select count(*)::int from public.tenants), 0, 'authenticated users cannot read server-only tenant metadata');
select is((select count(*)::int from public.market_listings), 10, 'authenticated users can browse seeded listings');
select throws_ok($$select count(*)::int from public.demo_state_snapshots$$, '42501', null, 'authenticated users cannot read the server-only demo snapshot');
select throws_ok($$insert into public.demo_state_snapshots (id, payload) values ('korama-demo', '{}'::jsonb)$$, '42501', null, 'authenticated users cannot write the server-only demo snapshot');
select throws_ok($$select count(*)::int from public.pending_role_assignments$$, '42501', null, 'authenticated users cannot read the invitation roster');

-- Administrator is a superset role: private.has_role() answers true for every
-- role, so one assignment reaches the warehouse and safety surfaces both,
-- still scoped to its own operating company.
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000004', true);
select is((select count(*)::int from public.orders where id = '52000000-0000-0000-0000-000000000001'), 1, 'administrator reads warehouse-scoped rows without a warehouse_operator assignment');
select ok((select private.has_role('safety_officer')), 'administrator satisfies the safety_officer check');
select ok((select private.has_role('warehouse_operator')), 'administrator satisfies the warehouse_operator check');

reset role;
select is((select public from storage.buckets where id = 'rgd-certs'), false, 'certificate preview bucket remains private');
select is((select file_size_limit::bigint from storage.buckets where id = 'rgd-certs'), 10485760::bigint, 'certificate preview bucket keeps its size limit');
select is((select count(*)::int from public.variants), 10, 'every seeded product has a normalized variant');
select is((select count(*)::int from public.media), 10, 'every seeded product has normalized media metadata');
select is((select count(*)::int from public.market_prices), 10, 'normalized market prices cover every seeded product');
select is((select count(*)::int from public.suppliers), 2, 'normalized supplier fixtures are seeded');
select is((select count(*)::int from public.receipts), 3, 'normalized receipt fixtures are seeded');
select is((select count(*)::int from public.inventory_balances), 5, 'normalized inventory balances are seeded');
select is((select count(*)::int from public.inventory_movements), 7, 'normalized inventory movements are seeded');
select is((select count(*)::int from public.warehouse_tasks), 3, 'normalized warehouse tasks are seeded');
select is((select count(*)::int from public.transfers), 1, 'normalized Ghana-to-Nigeria transfer is seeded');
select is((select count(*)::int from public.drones), 1, 'normalized delivery asset is seeded');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'delivery_address_snapshot'), 1, 'normalized orders preserve an address snapshot');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'shipments' and column_name = 'status'), 1, 'normalized shipments preserve lifecycle status');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'order_lines' and column_name = 'compliance_snapshot'), 1, 'normalized order lines preserve compliance snapshots');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'shipments' and column_name = 'compliance_snapshot'), 1, 'normalized shipments preserve compliance snapshots');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'attributes'), 1, 'normalized products preserve detail attributes');
select is((select has_function_privilege('anon', 'public.korama_allocate_order_fefo(text)', 'execute')), false, 'anon cannot execute normalized mutations');
select is((select has_function_privilege('authenticated', 'public.korama_allocate_order_fefo(text)', 'execute')), false, 'authenticated cannot execute normalized mutations');
select is((select has_function_privilege('service_role', 'public.korama_allocate_order_fefo(text)', 'execute')), true, 'service role can execute normalized mutations');
select is((select has_function_privilege('anon', 'public.korama_reset_demo(uuid)', 'execute')), false, 'anon cannot execute normalized reset');
select is((select has_function_privilege('service_role', 'public.korama_reset_demo(uuid)', 'execute')), true, 'service role can execute normalized reset');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'korama_%'), 6, 'six normalized transactional functions are installed');

delete from public.orders where id = '52000000-0000-0000-0000-000000000001';
delete from public.role_assignments where profile_id in ('51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000004');
delete from public.profiles where id in ('51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000004');
delete from auth.users where id in ('51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000004');

select * from finish();
rollback;
