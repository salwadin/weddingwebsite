-- =====================================================================
-- Stripe payments: one-time plan purchases for weddings, monthly promotion
-- subscriptions for vendor listings, and the webhook's processed-event log.
-- Only the server (service role) writes these: Checkout creates the pending
-- rows, the Stripe webhook (app/api/stripe/webhook) completes them and is the
-- only thing that changes weddings.plan and listings.tier outside demo mode.
-- =====================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings on delete cascade,
  plan plan not null,
  amount int not null,                       -- in the currency's smallest unit (cents)
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  stripe_checkout_session_id text unique not null,
  stripe_payment_intent_id text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on payments (wedding_id, created_at desc);
alter table payments enable row level security;
-- Billing is an administrator's business.
create policy payments_read on payments for select using (has_role(wedding_id, '{admin}'));

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  tier listing_tier not null,
  -- 'pending' while Checkout is open, 'expired' if it was abandoned, otherwise Stripe's subscription status.
  status text not null default 'pending',
  amount int,                                -- per month, in cents
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on subscriptions (listing_id, created_at desc);
alter table subscriptions enable row level security;
create policy subscriptions_read on subscriptions for select using (
  exists (select 1 from listings l where l.id = listing_id and l.owner_user_id = auth.uid()));

-- Every Stripe event the webhook has handled, so redeliveries are ignored.
create table stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table stripe_events enable row level security;

revoke all on payments, subscriptions, stripe_events from anon, authenticated;
grant select on payments, subscriptions to authenticated;
