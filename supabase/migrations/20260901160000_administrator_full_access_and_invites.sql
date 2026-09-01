-- Administrator becomes a superset role, and role administration moves out of
-- psql and into the product.
--
-- Two things were true before this migration and are no longer:
--   * `administrator` only unlocked the catalogue. Opening Operations,
--     Compliance or Delivery needed a *separate* warehouse_operator or
--     safety_officer assignment.
--   * The only way to grant any internal role was a hand-written insert or
--     `pnpm admin:grant`, and the target had to have signed in already.

-- ---------------------------------------------------------------------------
-- 1. Administrator satisfies every role check
--
-- private.has_role backs every staff RLS policy (26 call sites across the
-- foundation and phase-2 migrations), so widening it here is what makes
-- "administrators see everything" true at the database layer too — including
-- Realtime, which evaluates the same policies. The application-side guards in
-- lib/auth.ts mirror this; neither is sufficient on its own.
--
-- `create or replace` keeps the existing ACL: revoked from public, executable
-- by authenticated. Do not drop and recreate it.
-- ---------------------------------------------------------------------------
create or replace function private.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.role_assignments ra
    where ra.profile_id = auth.uid()
      and ra.role in (required_role, 'administrator')
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Invitations for accounts that do not exist yet
--
-- role_assignments.profile_id references profiles(id) references auth.users,
-- so a role cannot be granted before the person's first Google sign-in. This
-- table holds the intent by email until then; ensureConsumerProfile drains it
-- in the OAuth callback and deletes the rows it applied.
--
-- Email is stored lower-cased (enforced, not merely by convention) so the
-- unique constraint and the callback lookup agree on identity.
-- ---------------------------------------------------------------------------
create table public.pending_role_assignments (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email like '_%@_%._%'),
  role public.user_role not null,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (email, role)
);

alter table public.pending_role_assignments enable row level security;

-- Server-only, like payment_attempts and audit_events: an invitation list is a
-- roster of who is about to get privileged access, and no browser session has
-- a reason to read it. Writes happen through the service-role client behind
-- requireAdministrator().
create policy pending_role_assignments_server_only
  on public.pending_role_assignments for select using (false);

grant all on public.pending_role_assignments to service_role;

-- ---------------------------------------------------------------------------
-- 3. The default administrator
--
-- Both halves are needed: the invitation covers the case where this account
-- has never signed in, the direct grant covers the case where it already has.
-- Whichever applies, the other is a no-op.
-- ---------------------------------------------------------------------------
insert into public.pending_role_assignments (email, role)
values ('nanasasu7@gmail.com', 'administrator')
on conflict (email, role) do nothing;

insert into public.role_assignments (profile_id, role)
select p.id, 'administrator'::public.user_role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'nanasasu7@gmail.com'
on conflict (profile_id, role) do nothing;
