-- Couples can upload their own invitation artwork per event, and guests see each
-- invitation (designed or uploaded) on their personal invitation page.
--
-- Artwork lives in a private bucket. The server uploads it after checking the
-- organizer may edit invitations, and hands guests short-lived signed URLs only
-- for events they may see, so a private event's invitation never leaks.

alter table invitation_designs add column image_path text
  check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(png|jpg|webp)$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-art', 'invitation-art', false, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

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
    -- Each visible event's invitation design (an uploaded image is signed per request by the server).
    'designs', case when locked then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('event_id', d.event_id, 'template', d.template, 'english_text', d.english_text,
          'urdu_text', d.urdu_text, 'arabic_text', d.arabic_text, 'image_path', d.image_path))
      from invitation_designs d join events e on e.id = d.event_id
      where d.wedding_id = w.id and (e.visibility = 'public'
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
