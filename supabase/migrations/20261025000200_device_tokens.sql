-- =====================================================================
-- Push notifications: one row per phone that has the iOS or Android app
-- and allowed notifications (components/push-prompt.tsx). The server
-- sends through APNs / FCM with the service role (lib/push).
--
-- A token belongs to one phone, and a phone has one signed-in person at a
-- time, so the token is the key: signing in as someone else moves it.
-- That move goes through register_device(), because RLS (rightly) won't let
-- you update a row that is still someone else's.
-- =====================================================================

create table device_tokens (
  token text primary key check (length(token) between 16 and 4096),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index on device_tokens (user_id);

alter table device_tokens enable row level security;
revoke all on device_tokens from anon, authenticated;
grant select, delete on device_tokens to authenticated;
-- You can see and remove your own phones, nobody else's. Inserts go through register_device().
create policy device_tokens_own on device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function register_device(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_platform not in ('ios', 'android') or length(coalesce(p_token, '')) not between 16 and 4096 then
    raise exception 'invalid device';
  end if;
  insert into device_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;
revoke execute on function register_device(text, text) from public, anon;
grant execute on function register_device(text, text) to authenticated;
