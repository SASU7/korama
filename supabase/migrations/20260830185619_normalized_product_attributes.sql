-- Product detail fields are data, not UI-only fixture constants. Keep optional
-- attributes JSON extensible while the core catalogue columns remain typed.
alter table public.products
  add column if not exists attributes jsonb not null default '{}'::jsonb;

-- Reset only the demo operating company. This is deliberately a service-role
-- primitive so a customer cannot erase normalized commerce or inventory data.
create or replace function public.korama_reset_demo(p_operating_company_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_operating_company_id is null then
    raise exception 'Operating company is required' using errcode = '22023';
  end if;

  delete from public.inventory_movements
   where operating_company_id = p_operating_company_id and order_id is not null;
  delete from public.sorties where operating_company_id = p_operating_company_id;
  delete from public.shipments where operating_company_id = p_operating_company_id;
  delete from public.warehouse_tasks where operating_company_id = p_operating_company_id and order_id is not null;
  delete from public.orders where operating_company_id = p_operating_company_id;
  update public.inventory_batches set allocated = 0 where operating_company_id = p_operating_company_id;
  update public.inventory_balances
     set available_quantity = (select b.quantity from public.inventory_batches b where b.id = inventory_balances.batch_id),
         reserved_quantity = 0,
         updated_at = now()
   where operating_company_id = p_operating_company_id;
  delete from public.idempotency_keys where actor_id is null;

  insert into public.audit_events (actor_id, operating_company_id, action, entity_type, entity_id, payload)
  values (null, p_operating_company_id, 'demo_reset', 'demo_state', null, jsonb_build_object('source', 'korama-normalized'));
  return jsonb_build_object('reset', true, 'operating_company_id', p_operating_company_id);
end;
$$;

comment on function public.korama_reset_demo(uuid) is 'Server-only transactional normalized demo reset';
revoke execute on function public.korama_reset_demo(uuid) from public, anon, authenticated;
grant execute on function public.korama_reset_demo(uuid) to service_role;
