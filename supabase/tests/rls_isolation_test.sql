begin;

select plan(9);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
  ('51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'consumer@example.test', '{}'::jsonb, '{}'::jsonb),
  ('51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ghana-operator@example.test', '{}'::jsonb, '{}'::jsonb),
  ('51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'nigeria-operator@example.test', '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, operating_company_id, market_id) values
  ('51000000-0000-0000-0000-000000000001', 'Test consumer', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('51000000-0000-0000-0000-000000000002', 'Ghana operator', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000003', 'Nigeria operator', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.role_assignments (profile_id, role) values
  ('51000000-0000-0000-0000-000000000002', 'warehouse_operator'),
  ('51000000-0000-0000-0000-000000000003', 'warehouse_operator')
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
select is((select count(*)::int from public.market_listings), 10, 'authenticated users can browse seeded listings');
select throws_ok($$select count(*)::int from public.demo_state_snapshots$$, '42501', null, 'authenticated users cannot read the server-only demo snapshot');
select throws_ok($$insert into public.demo_state_snapshots (id, payload) values ('korama-demo', '{}'::jsonb)$$, '42501', null, 'authenticated users cannot write the server-only demo snapshot');

reset role;
delete from public.orders where id = '52000000-0000-0000-0000-000000000001';
delete from public.role_assignments where profile_id in ('51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003');
delete from public.profiles where id in ('51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003');
delete from auth.users where id in ('51000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000003');

select * from finish();
rollback;
