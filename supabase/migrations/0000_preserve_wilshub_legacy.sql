-- WILSHUB-Engine contained an earlier, empty five-table prototype whose public
-- object names conflict with Korama's normalized model. Preserve that schema
-- intact and remove its signup trigger before creating the Korama tables.
create schema if not exists wilshub_legacy;
revoke all on schema wilshub_legacy from public, anon, authenticated;

do $$
declare
  legacy_table text;
  legacy_type text;
  legacy_function text;
begin
  if exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
     where n.nspname = 'public'
       and t.typname = 'user_role'
       and e.enumlabel = 'customer'
  ) then
    execute 'drop trigger if exists on_auth_user_created on auth.users';

    foreach legacy_table in array array['cart_items', 'orders', 'products', 'profiles', 'vendors'] loop
      if to_regclass(format('public.%I', legacy_table)) is not null then
        if exists (
          select 1
            from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = legacy_table
        ) then
          execute format('alter publication supabase_realtime drop table public.%I', legacy_table);
        end if;
        execute format('alter table public.%I set schema wilshub_legacy', legacy_table);
      end if;
    end loop;

    foreach legacy_function in array array['handle_new_user', 'jwt_tenant_id', 'set_updated_at'] loop
      if to_regprocedure(format('public.%I()', legacy_function)) is not null then
        execute format('alter function public.%I() set schema wilshub_legacy', legacy_function);
      end if;
    end loop;

    foreach legacy_type in array array['logistics_type', 'user_role', 'warehouse_type'] loop
      if to_regtype(format('public.%I', legacy_type)) is not null then
        execute format('alter type public.%I set schema wilshub_legacy', legacy_type);
      end if;
    end loop;
  end if;
end;
$$;

comment on schema wilshub_legacy is
  'Read-only preservation of the empty WILSHUB prototype schema replaced by Korama.';
