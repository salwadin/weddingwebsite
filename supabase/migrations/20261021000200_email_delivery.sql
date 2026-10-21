-- Email delivery through Resend (lib/email/deliver.ts).
--
-- Outbox rows are still written the same way (dashboard, link re-sends, the
-- RPCs below). The server then sends `pending` email rows and records what
-- happened. WhatsApp rows stay `pending`: they're shared by hand from the
-- dashboard, nothing sends them.

create type outbox_status as enum ('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained', 'skipped');

alter table outbox
  add column status outbox_status not null default 'pending',
  add column sent_at timestamptz,
  add column provider_id text unique,  -- Resend's email id, matched by the webhook
  add column error text,
  add column event_id uuid references events on delete set null;  -- reminders: which event they're about

-- Rows written before delivery existed were never meant to go out.
update outbox set status = 'skipped';

create index outbox_pending on outbox (created_at) where status = 'pending' and channel = 'email';

-- Organizers may queue messages, but never mark them sent or fake a provider id.
revoke insert on outbox from authenticated;
grant insert (id, wedding_id, channel, recipient, household_id, subject, body, kind, created_at, event_id) on outbox to authenticated;

-- Distinct kinds for the RPC-written messages, so each gets its own email template.
-- (Both used to be written as 'invitation'.)
update outbox set kind = 'collaborator_invite' where kind = 'invitation' and household_id is null and wedding_id is not null;
update outbox set kind = 'inquiry' where kind = 'invitation' and wedding_id is null;

create or replace function invite_collaborator(p_wedding uuid, p_email text, p_name text, p_role collab_role,
  p_relationship text, p_event_ids uuid[]) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare target uuid; me text; w weddings; result text;
begin
  if not has_role(p_wedding, '{admin}') then raise exception 'not permitted'; end if;
  if wedding_plan(p_wedding) = 'free' then raise exception 'collaborators are part of Plus'; end if;
  p_email := lower(trim(p_email));
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  select * into w from weddings where id = p_wedding;
  select name into me from profiles where id = auth.uid();
  select id into target from profiles where lower(email) = p_email;
  if target is not null then
    if exists (select 1 from wedding_collaborators where wedding_id = p_wedding and user_id = target) then return 'exists'; end if;
    insert into wedding_collaborators (wedding_id, user_id, role, relationship, event_ids)
    values (p_wedding, target, p_role, left(p_relationship, 80), case when p_role = 'event_organizer' then p_event_ids end);
    result := 'added';
  else
    insert into collaborator_invites (wedding_id, email, name, role, relationship, event_ids, invited_by)
    values (p_wedding, p_email, left(p_name, 80), p_role, left(p_relationship, 80), case when p_role = 'event_organizer' then p_event_ids end, auth.uid())
    on conflict (wedding_id, email) do update set role = excluded.role, relationship = excluded.relationship, event_ids = excluded.event_ids, name = excluded.name;
    result := 'invited';
  end if;
  insert into outbox (wedding_id, channel, recipient, subject, body, kind)
  values (p_wedding, 'email', p_email, coalesce(me, 'Someone') || ' invited you to help plan ' || w.partner1 || ' & ' || w.partner2 || '''s wedding',
    case when result = 'added' then 'Sign in to Qubool to start planning.' else 'Create a Qubool account with this email to accept.' end,
    'collaborator_invite');
  insert into audit_log (wedding_id, actor, action, detail) values (p_wedding, coalesce(me, 'Organizer'), 'collaborator_invite', p_email || ' as ' || p_role);
  return result;
end $$;

create or replace function send_inquiry(p_listing text, p_name text, p_email text, p_event_date text, p_guests int,
  p_message text, p_wedding uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare l listings;
begin
  select * into l from listings where id = _uuid(p_listing) and published;
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  p_email := left(lower(trim(coalesce(p_email, ''))), 200);
  if length(trim(coalesce(p_name, ''))) < 2 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(trim(coalesce(p_message, ''))) < 10 then
    return jsonb_build_object('error', 'invalid');
  end if;
  if (select count(*) from inquiries where listing_id = l.id and from_email = p_email and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('error', 'limit');
  end if;
  insert into inquiries (listing_id, wedding_id, from_name, from_email, event_date, guests, message)
  values (l.id, case when p_wedding is not null and is_collab(p_wedding) then p_wedding end, left(trim(p_name), 100), p_email,
    case when p_event_date ~ '^\d{4}-\d{2}-\d{2}$' then p_event_date::date end, nullif(p_guests, 0), left(trim(p_message), 2000));
  insert into outbox (wedding_id, channel, recipient, subject, body, kind)
  values (null, 'email', l.email, 'New inquiry from ' || left(trim(p_name), 100), left(trim(p_message), 300), 'inquiry');
  return jsonb_build_object('ok', true);
end $$;
