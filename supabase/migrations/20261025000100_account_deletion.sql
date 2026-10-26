-- Self-serve account deletion (lib/account.ts).
--
-- Deleting an account deletes the weddings it alone administers and its vendor
-- listing. Payment records must outlive both (tax and accounting rules, see the
-- privacy policy), so they now keep their row with the link cleared instead of
-- cascading away. Nobody can read an unlinked row except the service role.

alter table payments alter column wedding_id drop not null;
alter table payments drop constraint payments_wedding_id_fkey;
alter table payments add constraint payments_wedding_id_fkey
  foreign key (wedding_id) references weddings on delete set null;

alter table subscriptions alter column listing_id drop not null;
alter table subscriptions drop constraint subscriptions_listing_id_fkey;
alter table subscriptions add constraint subscriptions_listing_id_fkey
  foreign key (listing_id) references listings on delete set null;
