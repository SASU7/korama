-- Private Realtime channel authorization for the sanitized order/sortie event stream.
-- Row-level policies on the published tables still enforce which records each
-- authenticated role can receive; this policy only permits known Korama users to
-- join the private channel.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists korama_authenticated_postgres_changes on realtime.messages';
    execute $policy$
      create policy korama_authenticated_postgres_changes
      on realtime.messages
      for select
      to authenticated
      using (
        realtime.topic() = 'korama-private-events'
        and extension = 'postgres_changes'
        and exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;
