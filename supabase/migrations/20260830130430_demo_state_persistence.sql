-- Server-only aggregate snapshot for the private investor demo adapter. The
-- normalized domain tables remain the source-of-truth contract for production
-- modules; this snapshot lets the currently implemented journey survive a
-- server restart before those modules are wired to their repository methods.
create table public.demo_state_snapshots (
  id text primary key check (id = 'korama-demo'),
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.demo_state_snapshots enable row level security;
create policy demo_state_server_only on public.demo_state_snapshots for all using (false) with check (false);
revoke all on public.demo_state_snapshots from anon, authenticated;
