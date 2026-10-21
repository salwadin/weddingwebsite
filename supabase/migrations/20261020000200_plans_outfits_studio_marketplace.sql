-- =====================================================================
-- v2: plans, outfits, design studio, vendor marketplace
-- =====================================================================
create type plan as enum ('free', 'plus', 'signature');
create type listing_tier as enum ('basic', 'featured', 'spotlight');

alter table weddings
  add column plan plan not null default 'free',
  add column trial_ends_at timestamptz,
  add column tradition text,
  add column custom_domain text unique;
alter table events add column palette text[] not null default '{}';

-- Effective plan: an active trial unlocks Signature.
create or replace function wedding_plan(w uuid) returns plan
language sql stable security definer set search_path = public, extensions as $$
  select case when trial_ends_at > now() then 'signature'::plan else plan end from weddings where id = w
$$;
revoke execute on function wedding_plan(uuid) from public, anon;
grant execute on function wedding_plan(uuid) to authenticated;

create table outfits (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  event_id uuid references events on delete set null,
  vendor_id uuid references vendors on delete set null,
  wearer text not null, role text not null, side side not null default 'both',
  title text not null, designer text,
  status text not null default 'idea' check (status in ('idea','sourcing','ordered','alterations','ready','worn')),
  colors text[] not null default '{}', image text,
  cost numeric(12,2) not null default 0, paid numeric(12,2) not null default 0, due_date date,
  pieces jsonb not null default '[]', fittings jsonb not null default '[]', notes text
);
create index on outfits (wedding_id);
alter table outfits enable row level security;
create policy outfits_read on outfits for select using (
  is_collab(wedding_id) and wedding_plan(wedding_id) <> 'free'
  and ((collab(wedding_id)).role not in ('bride_organizer','groom_organizer')
       or side = 'both' or side::text = replace((collab(wedding_id)).role::text, '_organizer', '')));
create policy outfits_write on outfits for all using (
  has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer}') and wedding_plan(wedding_id) <> 'free'
  and ((collab(wedding_id)).role not in ('bride_organizer','groom_organizer')
       or side = 'both' or side::text = replace((collab(wedding_id)).role::text, '_organizer', ''))
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids)));

create table boards (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  event_id uuid references events on delete set null,
  name text not null, kind text not null check (kind in ('moodboard','floorplan')),
  items jsonb not null default '[]', updated_at timestamptz not null default now()
);
create index on boards (wedding_id);
alter table boards enable row level security;
create policy boards_read on boards for select using (is_collab(wedding_id) and wedding_plan(wedding_id) = 'signature');
create policy boards_write on boards for all using (
  has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer}') and wedding_plan(wedding_id) = 'signature'
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids)));

create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users on delete set null,
  name text not null, category text not null, city text, serves text[] not null default '{}',
  tagline text, description text, images text[] not null default '{}',
  price_range int not null default 2 check (price_range between 1 and 4),
  tags text[] not null default '{}', traditions text[] not null default '{}',
  email text not null, phone text, website text,
  tier listing_tier not null default 'basic',
  rating numeric(2,1) not null default 0, review_count int not null default 0,
  published boolean not null default false, views int not null default 0,
  created_at timestamptz not null default now()
);
create index on listings (owner_user_id);
alter table listings enable row level security;
-- The marketplace is public; owners manage their own listing. Tier changes go through the billing webhook (service role).
create policy listings_public on listings for select using (published or owner_user_id = auth.uid());
create policy listings_owner on listings for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
grant select on listings to anon;

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  wedding_id uuid references weddings on delete set null,
  from_name text not null, from_email text not null, event_date date, guests int,
  message text not null,
  status text not null default 'new' check (status in ('new','replied','booked','closed')),
  created_at timestamptz not null default now()
);
create index on inquiries (listing_id, created_at desc);
alter table inquiries enable row level security;
create policy inquiries_vendor on inquiries for select using (exists (select 1 from listings l where l.id = listing_id and l.owner_user_id = auth.uid()));
create policy inquiries_vendor_update on inquiries for update using (exists (select 1 from listings l where l.id = listing_id and l.owner_user_id = auth.uid()));
create policy inquiries_couple on inquiries for select using (wedding_id is not null and is_collab(wedding_id));
-- Inquiries are sent through the send_inquiry() RPC (20261020000300_app.sql),
-- which rate-limits per sender, rather than by direct insert.
