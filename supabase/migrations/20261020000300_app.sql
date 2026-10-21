-- =====================================================================
-- App integration: Supabase Auth profiles, collaborator invitations,
-- column-level write limits, and the RPCs the Next.js app calls.
-- =====================================================================

-- Never throws: returns null for anything that isn't a uuid.
create or replace function _uuid(t text) returns uuid
language plpgsql immutable set search_path = public, extensions as $$
begin return t::uuid; exception when others then return null; end $$;
revoke execute on function _uuid(text) from public, anon, authenticated;

-- ---------- profiles (one per auth user) ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text not null,
  kind text not null default 'couple' check (kind in ('couple', 'vendor')),
  created_at timestamptz not null default now()
);
create index on profiles (lower(email));
alter table profiles enable row level security;
revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;
grant update (name) on profiles to authenticated;
-- You can see yourself and the people you plan a wedding with.
create policy profiles_read on profiles for select using (
  id = auth.uid() or exists (
    select 1 from wedding_collaborators a join wedding_collaborators b on a.wedding_id = b.wedding_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- collaborator invitations for people without an account yet ----------
create table collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  email extensions.citext not null,
  name text,
  role collab_role not null,
  relationship text,
  event_ids uuid[],
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  unique (wedding_id, email)
);
alter table collaborator_invites enable row level security;
revoke all on collaborator_invites from anon, authenticated;
grant select, delete on collaborator_invites to authenticated;
create policy invites_admin on collaborator_invites for all using (has_role(wedding_id, '{admin}'));

-- A verified email turns pending invitations into collaborator rows.
create or replace function _claim_invites(p_user uuid, p_email text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into wedding_collaborators (wedding_id, user_id, role, relationship, event_ids)
    select wedding_id, p_user, role, relationship, event_ids from collaborator_invites where email = p_email::citext
    on conflict (wedding_id, user_id) do nothing;
  delete from collaborator_invites where email = p_email::citext;
end $$;
revoke execute on function _claim_invites(uuid, text) from public, anon, authenticated;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  insert into profiles (id, email, name, kind) values (
    new.id, new.email,
    left(coalesce(nullif(trim(meta->>'name'), ''), split_part(new.email, '@', 1)), 80),
    case when meta->>'kind' = 'vendor' then 'vendor' else 'couple' end)
  on conflict (id) do nothing;
  -- Vendor sign-up: start an unpublished basic listing they can fill in after verifying.
  if meta->>'kind' = 'vendor' and nullif(trim(meta->>'business'), '') is not null then
    insert into listings (owner_user_id, name, category, city, email)
    values (new.id, left(trim(meta->>'business'), 100), left(coalesce(nullif(meta->>'category', ''), 'Other'), 40), left(coalesce(meta->>'city', ''), 60), new.email);
  end if;
  if new.email_confirmed_at is not null then perform _claim_invites(new.id, new.email); end if;
  return new;
end $$;

create or replace function handle_user_updated() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.email is distinct from old.email then update profiles set email = new.email where id = new.id; end if;
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then perform _claim_invites(new.id, new.email); end if;
  return new;
end $$;
revoke execute on function handle_new_user(), handle_user_updated() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users for each row execute function handle_user_updated();

-- ---------- table changes the app needs ----------
-- Tokens get a stable id. The server derives the raw token from it with a secret
-- (HMAC), so organizers can re-share a link, while the database only holds sha256(token).
alter table invitation_tokens add column id uuid not null unique default gen_random_uuid();
-- Saved-from-marketplace link on the couple's vendor tracker.
alter table vendors add column listing_id uuid references listings on delete set null;
-- Vendor notifications aren't tied to a wedding.
alter table outbox alter column wedding_id drop not null;

-- ---------- column-level write limits for signed-in users ----------
-- Plan, trial, and the site password hash change only through the server
-- (billing / set_site_password), never through a direct update.
revoke select, insert, update, delete on weddings from authenticated;
grant select (id, slug, partner1, partner2, partner1_family, partner2_family, tagline, hero_image, story, gallery, faqs,
  travel, registry, theme, culture, password_protected, published, total_budget, currency, created_at,
  plan, trial_ends_at, tradition, custom_domain) on weddings to authenticated;   -- not site_password_hash
grant update (slug, partner1, partner2, partner1_family, partner2_family, tagline, hero_image, story, gallery, faqs,
  travel, registry, theme, culture, password_protected, published, total_budget, currency, tradition, custom_domain)
  on weddings to authenticated;
-- Vendors edit their profile; tier, rating, and views are not theirs to set.
revoke insert, update, delete on listings from authenticated;
grant update (name, category, city, serves, tagline, description, images, price_range, tags, traditions, phone, website, published)
  on listings to authenticated;
revoke insert, update, delete on inquiries from authenticated;
grant update (status) on inquiries to authenticated;
-- Logs are append-only.
revoke update, delete on audit_log, outbox from authenticated;
create policy audit_w on audit_log for insert with check (is_collab(wedding_id));
create policy outbox_w on outbox for insert with check (
  wedding_id is not null and has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer,guest_manager}'));

-- Make sure nothing created above is reachable by anon.
revoke all on all tables in schema public from anon;
grant select on listings to anon;

-- =====================================================================
-- Organizer RPCs
-- =====================================================================

-- Onboarding: create a wedding and make the caller its administrator.
-- Plan and trial are set here, never taken from the client.
create or replace function create_wedding(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); s text; wid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from wedding_collaborators where user_id = uid) then raise exception 'already planning a wedding'; end if;
  s := coalesce(p->>'slug', '');
  if s !~ '^[a-z0-9-]{3,54}$' then s := 'wedding-' || substr(md5(random()::text), 1, 6); end if;
  while exists (select 1 from weddings where slug = s) loop s := s || '-' || (floor(random() * 90 + 10))::int; end loop;
  insert into weddings (slug, partner1, partner2, partner1_family, partner2_family, tagline, hero_image, story, gallery, faqs,
    travel, registry, theme, culture, published, total_budget, currency, tradition, plan, trial_ends_at)
  values (s, left(p->>'partner1', 60), left(p->>'partner2', 60), left(p->>'partner1Family', 60), left(p->>'partner2Family', 60),
    left(p->>'tagline', 200), left(p->>'heroImage', 500), coalesce(p->'story', '[]'), coalesce(p->'gallery', '[]'), coalesce(p->'faqs', '[]'),
    coalesce(p->'travel', '{}'), coalesce(p->'registry', '{}'), coalesce(p->'theme', '{"id":"noor","heading":"cormorant","pattern":"arch"}'),
    coalesce(p->'culture', '{}'), coalesce((p->>'published')::boolean, false), coalesce((p->>'totalBudget')::numeric, 0),
    coalesce(p->>'currency', 'USD'), left(p->>'tradition', 30), 'free', now() + interval '14 days')
  returning id into wid;
  insert into wedding_private (wedding_id) values (wid);
  insert into wedding_collaborators (wedding_id, user_id, role, relationship) values (wid, uid, 'admin', left(p->>'relationship', 80));
  return jsonb_build_object('id', wid, 'slug', s);
end $$;

create or replace function set_site_password(p_wedding uuid, p_password text) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not has_role(p_wedding, '{admin}') then raise exception 'not permitted'; end if;
  update weddings set site_password_hash = case when coalesce(p_password, '') = '' then null else crypt(p_password, gen_salt('bf')) end
  where id = p_wedding;
end $$;

-- Add an existing account as a collaborator, or hold an invitation for their email.
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
    case when result = 'added' then 'Sign in to Qubool to start planning.' else 'Create a Qubool account with this email to accept.' end, 'invitation');
  insert into audit_log (wedding_id, actor, action, detail) values (p_wedding, coalesce(me, 'Organizer'), 'collaborator_invite', p_email || ' as ' || p_role);
  return result;
end $$;

revoke execute on function create_wedding(jsonb), set_site_password(uuid, text),
  invite_collaborator(uuid, text, text, collab_role, text, uuid[]) from public, anon;
grant execute on function create_wedding(jsonb), set_site_password(uuid, text),
  invite_collaborator(uuid, text, text, collab_role, text, uuid[]) to authenticated;

-- =====================================================================
-- Guest-facing RPCs (SECURITY DEFINER; the only path for anonymous visitors)
-- =====================================================================

-- Proof that a visitor typed the site password: derived from the stored hash,
-- so it can't be forged without the database and stops working when the password changes.
create or replace function _site_key(w weddings) returns text
language sql stable set search_path = public, extensions as $$
  select encode(hmac(w.id::text, coalesce(w.site_password_hash, ''), 'sha256'), 'hex')
$$;
revoke execute on function _site_key(weddings) from public, anon, authenticated;

create or replace function site_unlock(p_slug text, p_password text) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare w weddings;
begin
  select * into w from weddings where slug = p_slug and published;
  if not found or w.site_password_hash is null or crypt(coalesce(p_password, ''), w.site_password_hash) <> w.site_password_hash then
    return null;
  end if;
  return _site_key(w);
end $$;

-- Everything the wedding website may render for this visitor. Uninvited
-- events are filtered here, in the database, never in the browser.
create or replace function guest_site(p_slug text, p_token text default null, p_site_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare w weddings; hh uuid; org boolean; locked boolean;
begin
  select * into w from weddings where slug = p_slug;
  if not found then return null; end if;
  org := is_collab(w.id);                       -- organizers may preview an unpublished site
  if not w.published and not org then return null; end if;
  hh := _household_for_token(p_token);
  if hh is not null and not exists (select 1 from households where id = hh and wedding_id = w.id) then hh := null; end if;
  locked := w.password_protected and hh is null and not org
    and (p_site_key is null or w.site_password_hash is null or p_site_key <> _site_key(w));
  return jsonb_build_object(
    'wedding', jsonb_build_object('id', w.id, 'slug', w.slug, 'partner1', w.partner1, 'partner2', w.partner2,
       'partner1_family', w.partner1_family, 'partner2_family', w.partner2_family, 'tagline', w.tagline,
       'hero_image', w.hero_image, 'story', w.story, 'gallery', w.gallery, 'faqs', w.faqs, 'travel', w.travel,
       'registry', w.registry, 'theme', w.theme, 'culture', w.culture),
    'locked', locked,
    'is_organizer', org,
    'show_branding', wedding_plan(w.id) <> 'signature',
    'events', case when locked then '[]'::jsonb else coalesce((
      select jsonb_agg((to_jsonb(e) - 'budget' - 'wedding_id' - 'capacity' - 'sort_order') || jsonb_build_object('spots_left',
          case when e.visibility = 'public' and e.capacity is not null then greatest(0, e.capacity - coalesce((
            select sum(r.adults + r.children) from public_registrations r where r.event_id = e.id and r.status = 'confirmed'), 0)) end)
        order by e.date, e.sort_order)
      from events e
      where e.wedding_id = w.id and (e.visibility = 'public'
        or (hh is not null and exists (select 1 from event_invitations i where i.event_id = e.id and i.household_id = hh)))
    ), '[]') end,
    'household', case when hh is null or locked then null else (
      select jsonb_build_object('id', h.id, 'name', h.name,
        'members', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'first_name', g.first_name, 'last_name', g.last_name,
            'is_child', g.is_child, 'is_plus_one', g.is_plus_one, 'dietary', g.dietary)
            order by g.is_primary desc, g.is_plus_one, g.is_child, g.first_name, g.id)
          from guests g where g.household_id = h.id), '[]'),
        'invitations', coalesce((select jsonb_agg(jsonb_build_object('event_id', i.event_id, 'guest_ids', i.guest_ids))
          from event_invitations i where i.household_id = h.id), '[]'),
        'rsvps', coalesce((select jsonb_agg(jsonb_build_object('event_id', r.event_id, 'guest_id', r.guest_id, 'status', r.status,
            'meal', r.meal, 'updated_at', r.updated_at))
          from rsvp_responses r where r.household_id = h.id), '[]'))
      from households h where h.id = hh) end
  );
end $$;

-- Following an invitation link: validates the token, records the visit, returns the wedding's slug.
create or replace function resolve_invitation(p_token text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare t invitation_tokens; s text;
begin
  if p_token is null or length(p_token) not between 20 and 64 then return null; end if;
  select * into t from invitation_tokens where token_hash = digest(p_token, 'sha256') and revoked_at is null;
  if not found then return null; end if;
  update invitation_tokens set last_used_at = now(), use_count = use_count + 1 where token_hash = t.token_hash;
  update households set delivery_status = 'opened' where id = t.household_id and delivery_status <> 'bounced';
  select slug into s from weddings where id = t.wedding_id;
  return s;
end $$;

-- Household RSVP.
--   p_responses: [{ "eventId": uuid, "guestId": uuid, "status": "attending"|"declined", "meal": text }]
--   p_plus_ones: { "<guestId>": "First Last" } names for the household's plus-ones
--   p_dietary:   free-text note appended to the household's notes
-- Returns { "saved": n } or { "error": "invalid" | "empty" | "deadline", "event": name }.
create or replace function guest_submit_rsvp(p_token text, p_responses jsonb, p_plus_ones jsonb default '{}', p_dietary text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare h households; r jsonb; e events; gid uuid; changes jsonb := '[]'; n int := 0; k text; v text; summary text;
begin
  select * into h from households where id = _household_for_token(p_token);
  if not found then return jsonb_build_object('error', 'invalid'); end if;

  for r in select * from jsonb_array_elements(coalesce(p_responses, '[]')) loop
    if coalesce(r->>'status', '') not in ('attending', 'declined') then continue; end if;
    gid := _uuid(r->>'guestId');
    select ev.* into e from events ev join event_invitations i on i.event_id = ev.id
      where ev.id = _uuid(r->>'eventId') and i.household_id = h.id and gid = any(i.guest_ids);
    if not found or e.rsvp_mode = 'none' then continue; end if;          -- not invited: silently ignored
    if e.rsvp_deadline is not null and (now() at time zone 'utc')::date > e.rsvp_deadline then
      return jsonb_build_object('error', 'deadline', 'event', e.name);
    end if;
    changes := changes || jsonb_build_object('event', e.id, 'guest', gid, 'status', r->>'status',
      'meal', case when r->>'status' = 'attending' and (r->>'meal') = any(e.meal_options) then r->>'meal' end);
  end loop;
  if jsonb_array_length(changes) = 0 then return jsonb_build_object('error', 'empty'); end if;

  for r in select * from jsonb_array_elements(changes) loop
    insert into rsvp_responses (event_id, guest_id, household_id, status, meal, updated_via)
    values ((r->>'event')::uuid, (r->>'guest')::uuid, h.id, (r->>'status')::rsvp_status, r->>'meal', 'guest_link')
    on conflict (event_id, guest_id) do update set status = excluded.status, meal = excluded.meal, updated_at = now(), updated_via = 'guest_link';
    n := n + 1;
  end loop;

  for k, v in select * from jsonb_each_text(coalesce(p_plus_ones, '{}')) loop
    v := left(trim(v), 80);
    if v = '' then continue; end if;
    update guests set first_name = split_part(v, ' ', 1), last_name = trim(substr(v, length(split_part(v, ' ', 1)) + 1))
    where id = _uuid(k) and household_id = h.id and is_plus_one;
  end loop;

  if nullif(trim(coalesce(p_dietary, '')), '') is not null then
    update households set notes = concat_ws(E'\n', nullif(notes, ''), 'Dietary (from RSVP): ' || left(trim(p_dietary), 300)) where id = h.id;
  end if;

  select string_agg(format('%s: %s/%s attending', ev.name, c.yes, c.total), ', ' order by ev.date, ev.sort_order) into summary
  from (select (x->>'event')::uuid as event_id, count(*) filter (where x->>'status' = 'attending') as yes, count(*) as total
        from jsonb_array_elements(changes) x group by 1) c join events ev on ev.id = c.event_id;
  insert into audit_log (wedding_id, actor, action, detail) values (h.wedding_id, h.name, 'rsvp', summary);
  update invitation_tokens set last_used_at = now(), use_count = use_count + 1 where token_hash = digest(p_token, 'sha256');
  return jsonb_build_object('saved', n);
end $$;

-- Optional head-count for open-invitation events, with cap + waitlist + duplicate detection.
-- Returns { "status": "confirmed" | "waitlist" | "updated" } or { "error": "unavailable" | "closed" | "full" | "invalid" }.
create or replace function public_register(p_event text, p_name text, p_email text, p_phone text, p_adults int, p_children int) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare e events; used int; dup public_registrations; name_dup uuid; full_ boolean;
  norm_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  select ev.* into e from events ev join weddings w on w.id = ev.wedding_id
    where ev.id = _uuid(p_event) and ev.visibility = 'public' and ev.rsvp_mode <> 'none' and w.published
    for update of ev;                                                     -- serializes the capacity check
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  if e.rsvp_deadline is not null and (now() at time zone 'utc')::date > e.rsvp_deadline then return jsonb_build_object('error', 'closed'); end if;
  p_name := left(trim(coalesce(p_name, '')), 100);
  p_email := left(lower(trim(coalesce(p_email, ''))), 200);
  p_phone := nullif(left(trim(coalesce(p_phone, '')), 30), '');
  p_adults := greatest(1, least(10, coalesce(p_adults, 1)));
  p_children := greatest(0, least(10, coalesce(p_children, 0)));
  if length(p_name) < 2 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('error', 'invalid'); end if;

  -- Same email or phone updates the existing registration instead of double-counting.
  select * into dup from public_registrations
    where event_id = e.id and status <> 'cancelled'
      and (lower(email::text) = p_email or (p_phone is not null and phone is not null
           and right(regexp_replace(phone, '\D', '', 'g'), 10) = norm_phone))
    order by created_at limit 1;
  if found then
    update public_registrations set name = p_name, adults = p_adults, children = p_children, phone = coalesce(p_phone, phone) where id = dup.id;
    insert into audit_log (wedding_id, actor, action, detail)
    values (e.wedding_id, p_name, 'public_rsvp_update', format('%s: updated existing registration (%s adults, %s children)', e.name, p_adults, p_children));
    return jsonb_build_object('status', 'updated');
  end if;

  select id into name_dup from public_registrations
    where event_id = e.id and status <> 'cancelled' and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(regexp_replace(p_name, '\s+', ' ', 'g'))
    order by created_at limit 1;
  select coalesce(sum(adults + children), 0) into used from public_registrations where event_id = e.id and status = 'confirmed';
  full_ := e.capacity is not null and used + p_adults + p_children > e.capacity;
  if full_ and not e.waitlist then return jsonb_build_object('error', 'full'); end if;
  insert into public_registrations (event_id, name, email, phone, adults, children, status, duplicate_of)
  values (e.id, p_name, p_email, p_phone, p_adults, p_children, case when full_ then 'waitlist' else 'confirmed' end, name_dup);
  insert into audit_log (wedding_id, actor, action, detail)
  values (e.wedding_id, p_name, 'public_rsvp', format('%s: %s adults, %s children%s', e.name, p_adults, p_children, case when full_ then ' (waitlist)' else '' end));
  return jsonb_build_object('status', case when full_ then 'waitlist' else 'confirmed' end);
end $$;

-- =====================================================================
-- Marketplace RPCs
-- =====================================================================

-- Anyone may contact a published vendor; at most 3 inquiries per sender per vendor per day.
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
  values (null, 'email', l.email, 'New inquiry from ' || left(trim(p_name), 100), left(trim(p_message), 300), 'invitation');
  return jsonb_build_object('ok', true);
end $$;

create or replace function record_listing_view(p_listing text) returns void
language sql volatile security definer set search_path = public, extensions as $$
  update listings set views = views + 1 where id = _uuid(p_listing) and published
$$;

revoke execute on function site_unlock(text, text), guest_site(text, text, text), resolve_invitation(text),
  guest_submit_rsvp(text, jsonb, jsonb, text), public_register(text, text, text, text, int, int),
  send_inquiry(text, text, text, text, int, text, uuid), record_listing_view(text) from public;
grant execute on function site_unlock(text, text), guest_site(text, text, text), resolve_invitation(text),
  guest_submit_rsvp(text, jsonb, jsonb, text), public_register(text, text, text, text, int, int),
  send_inquiry(text, text, text, text, int, text, uuid), record_listing_view(text) to anon, authenticated;
