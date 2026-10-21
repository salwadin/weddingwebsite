-- =====================================================================
-- Qubool · core schema with Row Level Security
--
-- Mirrors lib/types.ts. Security model:
--   • Organizers authenticate with Supabase Auth. RLS limits every row to
--     weddings they collaborate on, further narrowed by role/side/event.
--   • Guests never authenticate and have NO direct table access (anon role
--     is revoked everywhere). They reach data only through SECURITY DEFINER
--     functions that take an invitation token and return exactly the events
--     that household may see. Tokens are stored as SHA-256 hashes.
--
-- Supabase installs extensions into the `extensions` schema, so every
-- SECURITY DEFINER function below pins `search_path = public, extensions`.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- Supabase's default privileges grant anon full access to every new table and
-- function in `public`. Guests must only ever reach data through the RPCs, so
-- turn that off before creating anything. (Functions are also executable by
-- PUBLIC by default; each function revokes that explicitly.)
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- ---------- enums ----------
create type side as enum ('bride', 'groom', 'both');
create type visibility as enum ('public', 'invite', 'private');
create type rsvp_mode as enum ('required', 'optional', 'none');
create type rsvp_status as enum ('pending', 'attending', 'declined');
create type collab_role as enum ('admin', 'bride_organizer', 'groom_organizer', 'event_organizer', 'guest_manager', 'budget_manager', 'viewer');
create type delivery_status as enum ('not_sent', 'sent', 'opened', 'bounced');

-- ---------- core ----------
create table weddings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  partner1 text not null, partner2 text not null,
  partner1_family text, partner2_family text,
  tagline text, hero_image text,
  story jsonb not null default '[]', gallery jsonb not null default '[]', faqs jsonb not null default '[]',
  travel jsonb not null default '{}', registry jsonb not null default '{}',
  theme jsonb not null default '{"id":"noor","heading":"cormorant","pattern":"arch"}',
  culture jsonb not null default '{}',
  password_protected boolean not null default false,
  site_password_hash text,
  published boolean not null default false,
  total_budget numeric(12,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- Mahr lives in its own table so it can carry an admin-only policy.
create table wedding_private (
  wedding_id uuid primary key references weddings on delete cascade,
  mahr_amount text, mahr_notes text
);

create table wedding_collaborators (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role collab_role not null,
  relationship text,
  event_ids uuid[],               -- event_organizer scope
  invited_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);
create index on wedding_collaborators (user_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  type text not null, name text not null,
  date date not null, start_time time, end_time time,
  venue_name text, address text, dress_code text, description text, public_message text,
  host_side side not null default 'both',
  visibility visibility not null default 'invite',
  rsvp_mode rsvp_mode not null default 'required',
  rsvp_deadline date,
  capacity int check (capacity is null or capacity > 0),
  waitlist boolean not null default false,
  meal_options text[] not null default '{}',
  timeline jsonb not null default '[]',
  gender_separated boolean not null default false, women_only boolean not null default false,
  no_photography boolean not null default false, prayer_space boolean not null default true, halal boolean not null default true,
  budget numeric(12,2) not null default 0,
  sort_order int not null default 0
);
create index on events (wedding_id);

create table households (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  name text not null, side side not null, relationship text, tags text[] not null default '{}',
  email text, phone text, notes text,
  delivery_status delivery_status not null default 'not_sent',
  created_at timestamptz not null default now()
);
create index on households (wedding_id, side);

create table guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  first_name text not null, last_name text not null default '',
  is_child boolean not null default false, is_primary boolean not null default false, is_plus_one boolean not null default false,
  email text, phone text, dietary text, seating_table text
);
create index on guests (household_id);

create table event_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  event_id uuid not null references events on delete cascade,
  guest_ids uuid[] not null,      -- exactly which members are invited
  created_at timestamptz not null default now(),
  unique (household_id, event_id)
);
create index on event_invitations (event_id);

create table rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  guest_id uuid not null references guests on delete cascade,
  household_id uuid not null references households on delete cascade,
  status rsvp_status not null,
  meal text,
  updated_at timestamptz not null default now(),
  updated_via text not null check (updated_via in ('guest_link', 'organizer')),
  unique (event_id, guest_id)
);
create index on rsvp_responses (household_id);

create table invitation_tokens (
  token_hash bytea primary key,   -- sha256(token); the raw token is only ever in the guest's link
  household_id uuid not null references households on delete cascade,
  wedding_id uuid not null references weddings on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count int not null default 0
);
create index on invitation_tokens (household_id);

create table public_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  name text not null, email extensions.citext, phone text,
  adults int not null default 1 check (adults between 1 and 10),
  children int not null default 0 check (children between 0 and 10),
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  duplicate_of uuid references public_registrations on delete set null,
  created_at timestamptz not null default now()
);
create unique index public_reg_email_once on public_registrations (event_id, lower(email::text)) where status <> 'cancelled';

-- ---------- planning ----------
create table vendors (
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  category text not null, name text not null, contact text, phone text, email text,
  event_ids uuid[] not null default '{}', status text not null default 'researching', notes text
);
create index on vendors (wedding_id);
create table budgets ( -- optional per-category allocations
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  event_id uuid references events on delete cascade, category text not null, amount numeric(12,2) not null
);
create table expenses (
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  event_id uuid references events on delete set null, vendor_id uuid references vendors on delete set null,
  category text not null, description text not null,
  estimated numeric(12,2) not null default 0, actual numeric(12,2) not null default 0, paid numeric(12,2) not null default 0,
  responsibility side not null default 'both', due_date date
);
create index on expenses (wedding_id);
create table tasks (
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  event_id uuid references events on delete cascade, title text not null, assignee text, due_date date,
  done boolean not null default false, side side not null default 'both'
);
create index on tasks (wedding_id);
create table website_themes (
  id text primary key, name text not null, tokens jsonb not null
);
create table invitation_designs (
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  event_id uuid not null references events on delete cascade unique,
  template text not null default 'arch', english_text text, urdu_text text, arabic_text text, show_qr boolean not null default true
);
create table outbox (
  id uuid primary key default gen_random_uuid(), wedding_id uuid not null references weddings on delete cascade,
  channel text not null, recipient text not null, household_id uuid references households on delete set null,
  subject text, body text, kind text not null, created_at timestamptz not null default now()
);
create index on outbox (wedding_id, created_at desc);
create table audit_log (
  id bigint generated always as identity primary key, wedding_id uuid not null references weddings on delete cascade,
  at timestamptz not null default now(), actor text not null, action text not null, detail text
);
create index on audit_log (wedding_id, at desc);

-- =====================================================================
-- Organizer authorization helpers
-- =====================================================================
create or replace function collab(w uuid) returns wedding_collaborators
language sql stable security definer set search_path = public, extensions as $$
  select * from wedding_collaborators where wedding_id = w and user_id = auth.uid() limit 1
$$;

-- `collab(w) is not null` is only true when *every* column of the row is non-null
-- (SQL row semantics), which fails for most collaborators. Use this instead.
create or replace function is_collab(w uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from wedding_collaborators where wedding_id = w and user_id = auth.uid())
$$;

create or replace function has_role(w uuid, roles collab_role[]) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from wedding_collaborators where wedding_id = w and user_id = auth.uid() and role = any(roles))
$$;

-- Household visible to the current organizer (side + event scoping).
create or replace function can_see_household(h households) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select case (collab(h.wedding_id)).role
    when 'admin' then true when 'guest_manager' then true when 'viewer' then true
    when 'bride_organizer' then h.side in ('bride', 'both')
    when 'groom_organizer' then h.side in ('groom', 'both')
    when 'event_organizer' then exists (
      select 1 from event_invitations i where i.household_id = h.id and i.event_id = any((collab(h.wedding_id)).event_ids))
    else false end
$$;

revoke execute on function collab(uuid), is_collab(uuid), has_role(uuid, collab_role[]), can_see_household(households) from public, anon;
grant execute on function collab(uuid), is_collab(uuid), has_role(uuid, collab_role[]), can_see_household(households) to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table weddings enable row level security;
alter table wedding_private enable row level security;
alter table wedding_collaborators enable row level security;
alter table events enable row level security;
alter table households enable row level security;
alter table guests enable row level security;
alter table event_invitations enable row level security;
alter table rsvp_responses enable row level security;
alter table invitation_tokens enable row level security;
alter table public_registrations enable row level security;
alter table vendors enable row level security;
alter table budgets enable row level security;
alter table expenses enable row level security;
alter table tasks enable row level security;
alter table website_themes enable row level security;
alter table invitation_designs enable row level security;
alter table outbox enable row level security;
alter table audit_log enable row level security;

-- Anonymous visitors get nothing directly. Guest access is via the RPCs below.
revoke all on all tables in schema public from anon;

create policy w_read on weddings for select using (is_collab(id));
create policy w_write on weddings for update using (has_role(id, '{admin}'));
create policy mahr_admin on wedding_private for all using (has_role(wedding_id, '{admin}'));
create policy collab_read on wedding_collaborators for select using (is_collab(wedding_id));
create policy collab_admin on wedding_collaborators for all using (has_role(wedding_id, '{admin}'));

create policy ev_read on events for select using (
  is_collab(wedding_id) and ((collab(wedding_id)).event_ids is null or id = any((collab(wedding_id)).event_ids)));
create policy ev_write on events for all using (
  has_role(wedding_id, '{admin}')
  or (has_role(wedding_id, '{bride_organizer}') and host_side in ('bride', 'both'))
  or (has_role(wedding_id, '{groom_organizer}') and host_side in ('groom', 'both'))
  or (has_role(wedding_id, '{event_organizer}') and id = any((collab(wedding_id)).event_ids)));

create policy hh_read on households for select using (can_see_household(households));
create policy hh_write on households for all using (
  can_see_household(households) and has_role(wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}'));

create policy g_read on guests for select using (exists (select 1 from households h where h.id = household_id and can_see_household(h)));
create policy g_write on guests for all using (exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')));

create policy inv_read on event_invitations for select using (exists (select 1 from households h where h.id = household_id and can_see_household(h)));
create policy inv_write on event_invitations for all using (exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and (has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')
       or (has_role(h.wedding_id, '{event_organizer}') and event_id = any((collab(h.wedding_id)).event_ids)))));

create policy rsvp_read on rsvp_responses for select using (exists (select 1 from households h where h.id = household_id and can_see_household(h)));
create policy rsvp_write on rsvp_responses for all using (exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')));

create policy tok_manage on invitation_tokens for all using (exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer,guest_manager}')));

create policy reg_read on public_registrations for select using (exists (select 1 from events e where e.id = event_id and is_collab(e.wedding_id)));
create policy reg_write on public_registrations for update using (exists (select 1 from events e where e.id = event_id
  and has_role(e.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')));

create policy ven on vendors for select using (has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer,budget_manager,viewer}'));
create policy ven_w on vendors for all using (has_role(wedding_id, '{admin,budget_manager}'));
create policy bud on budgets for all using (has_role(wedding_id, '{admin,budget_manager}'));
create policy exp_r on expenses for select using (
  has_role(wedding_id, '{admin,budget_manager,viewer}')
  or (has_role(wedding_id, '{bride_organizer}') and responsibility in ('bride', 'both'))
  or (has_role(wedding_id, '{groom_organizer}') and responsibility in ('groom', 'both')));
create policy exp_w on expenses for all using (
  has_role(wedding_id, '{admin,budget_manager}')
  or (has_role(wedding_id, '{bride_organizer}') and responsibility = 'bride')
  or (has_role(wedding_id, '{groom_organizer}') and responsibility = 'groom'));
create policy tasks_rw on tasks for all using (is_collab(wedding_id)
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids)));
create policy themes_read on website_themes for select to authenticated using (true);
create policy des on invitation_designs for all using (is_collab(wedding_id));
create policy outbox_r on outbox for select using (is_collab(wedding_id));
create policy audit_r on audit_log for select using (has_role(wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager,viewer}'));

-- =====================================================================
-- Guest-facing RPCs (SECURITY DEFINER; the only path for anonymous visitors)
-- These are the v1 versions; 20261020000300_app.sql replaces them with the
-- versions the app calls.
-- =====================================================================

-- Resolve a raw token to its household. Returns null for unknown or revoked tokens.
create or replace function _household_for_token(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select household_id from invitation_tokens
  where token_hash = digest(p_token, 'sha256') and revoked_at is null
$$;
revoke execute on function _household_for_token(text) from public, anon, authenticated;
