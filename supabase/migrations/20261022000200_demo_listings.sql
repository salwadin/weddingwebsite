-- Sample marketplace listings belong to the interactive demo only.
-- The public marketplace shows is_demo = false; demo visitors see both.
-- Set by the demo seed (lib/seed-load.ts). Vendors can't change it: their
-- update grant on listings names specific columns, and this isn't one of them.
alter table listings add column is_demo boolean not null default false;
create index on listings (is_demo) where published;

-- Listings seeded before this column existed: the sample vendors all use example.com addresses.
update listings set is_demo = true where email ~* '@([a-z0-9-]+\.)*example\.com$';
