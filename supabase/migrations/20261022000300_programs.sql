-- =====================================================================
-- Founding Vendor program and the Qubool Beta.
--
-- Applications are written and read only by the server (service role):
-- anonymous visitors submit through server actions that validate and
-- rate-limit, and only Qubool staff (QUBOOL_STAFF_EMAILS) can review them
-- in /admin. No policies are granted to anon or authenticated on purpose.
-- =====================================================================

create table vendor_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 2 and 120),
  category text not null,
  city text not null,
  region text,
  contact_name text not null,
  email extensions.citext not null,
  phone text,
  instagram text,
  website text,
  portfolio_urls text[] not null default '{}',
  traditions text[] not null default '{}',
  about text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'waitlisted', 'declined')),
  founding_number int unique check (founding_number between 1 and 50),
  staff_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- One open application per email.
create unique index vendor_applications_one_per_email on vendor_applications (lower(email::text)) where status <> 'declined';
alter table vendor_applications enable row level security;

create table beta_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('couple', 'planner')),
  name text not null check (char_length(name) between 2 and 100),
  email extensions.citext not null,
  phone text,
  partner_name text,       -- couples
  company text,            -- planners
  city text,
  event_date date,
  guest_count int check (guest_count is null or guest_count between 1 and 100000),
  events text[] not null default '{}',
  traditions text[] not null default '{}',
  features text[] not null default '{}',
  weddings_per_year int,   -- planners
  heard_from text,
  notes text,
  status text not null default 'new' check (status in ('new', 'invited', 'joined', 'declined')),
  staff_notes text,
  reviewed_by text,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index beta_applications_one_per_email on beta_applications (lower(email::text)) where status <> 'declined';
alter table beta_applications enable row level security;

revoke all on vendor_applications, beta_applications from anon, authenticated;

-- Founding vendors: Featured free until founding_until, then Basic unless they subscribe.
alter table listings
  add column founding_number int,
  add column founding_until timestamptz;

-- Approve an application and give it the next free Founding 50 number (null once all 50 are taken).
-- The table lock makes two simultaneous approvals impossible to number the same.
create or replace function approve_vendor_application(p_id uuid, p_reviewer text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  lock table vendor_applications in share row exclusive mode;
  select founding_number into n from vendor_applications where id = p_id;
  if n is null then
    select min(s) into n from generate_series(1, 50) s
      where s not in (select founding_number from vendor_applications where founding_number is not null);
  end if;
  update vendor_applications
    set status = 'approved', founding_number = n, reviewed_by = p_reviewer, reviewed_at = now()
    where id = p_id;
  return n;
end $$;

-- Give an approved founding vendor's listing its free Featured year, once.
-- Safe to call repeatedly (on approval, and whenever the vendor opens their portal).
create or replace function apply_founding_perks(p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a vendor_applications; uid uuid; changed int;
begin
  select * into a from vendor_applications
    where lower(email::text) = lower(p_email) and status = 'approved' and founding_number is not null
    order by reviewed_at desc limit 1;
  if not found then return false; end if;
  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then return false; end if;
  update listings
    set founding_number = a.founding_number,
        founding_until = now() + interval '12 months',
        tier = case when tier = 'basic' then 'featured'::listing_tier else tier end
    where owner_user_id = uid and founding_until is null;
  get diagnostics changed = row_count;
  return changed > 0;
end $$;

-- Daily: founding years that have ended go back to Basic, unless the vendor now pays.
create or replace function expire_founding_listings() returns int
language plpgsql security definer set search_path = public as $$
declare changed int;
begin
  update listings l set tier = 'basic'
    where l.founding_until < now() and l.tier = 'featured'
      and not exists (select 1 from subscriptions s where s.listing_id = l.id and s.status in ('active', 'trialing', 'past_due'));
  get diagnostics changed = row_count;
  return changed;
end $$;

revoke execute on function approve_vendor_application(uuid, text), apply_founding_perks(text), expire_founding_listings() from public, anon, authenticated;
