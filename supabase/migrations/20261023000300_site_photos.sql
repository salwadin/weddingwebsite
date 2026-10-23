-- Couples upload their own website photos (cover and gallery).
--
-- These appear on the couple's website for every visitor, so the bucket is
-- public-read under unguessable paths (<wedding id>/<random>.<ext>). Nobody
-- writes to it directly: the server checks the organizer may edit the website
-- and hands the browser a one-time signed upload URL (lib/uploads.ts), so files
-- go straight to Storage instead of through the app server's request size limit.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- New weddings no longer get a stock cover photo: drop the one every wedding used to start with.
update weddings set hero_image = ''
where hero_image = 'https://images.unsplash.com/photo-1791810182741-0647d2338534?w=2000&q=80';
