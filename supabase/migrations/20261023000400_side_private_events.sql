-- Events private to one family's side (a Mehndi, a girls-only night, the groom's
-- family dinner). When side_private is on and the event is hosted by one side, the
-- other side's organizers can't see the event at all: not its details, invitations,
-- RSVPs, design, tasks, outfits, boards, messages, or any of its costs (even shared
-- ones). Administrators (the couple) and the other roles are unaffected.
-- Budgets otherwise keep their existing rule: each side sees its own + shared costs.

alter table events add column side_private boolean not null default false;

-- Family-only events hosted by one side start out private to that side.
update events set side_private = true where visibility = 'private' and host_side <> 'both';

-- May the current organizer see this event? The single rule every event-linked policy uses.
create or replace function can_see_event(p_event uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from events e
    where e.id = p_event and is_collab(e.wedding_id)
      and ((collab(e.wedding_id)).event_ids is null or e.id = any((collab(e.wedding_id)).event_ids))
      and not (e.side_private and (
        (e.host_side = 'bride' and (collab(e.wedding_id)).role = 'groom_organizer')
        or (e.host_side = 'groom' and (collab(e.wedding_id)).role = 'bride_organizer'))))
$$;
revoke execute on function can_see_event(uuid) from public, anon;
grant execute on function can_see_event(uuid) to authenticated;

drop policy ev_read on events;
create policy ev_read on events for select using (can_see_event(id));

drop policy inv_read on event_invitations;
drop policy inv_write on event_invitations;
create policy inv_read on event_invitations for select using (can_see_event(event_id)
  and exists (select 1 from households h where h.id = household_id and can_see_household(h)));
create policy inv_write on event_invitations for all using (can_see_event(event_id)
  and exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and (has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')
       or (has_role(h.wedding_id, '{event_organizer}') and event_id = any((collab(h.wedding_id)).event_ids)))));

drop policy rsvp_read on rsvp_responses;
drop policy rsvp_write on rsvp_responses;
create policy rsvp_read on rsvp_responses for select using (can_see_event(event_id)
  and exists (select 1 from households h where h.id = household_id and can_see_household(h)));
create policy rsvp_write on rsvp_responses for all using (can_see_event(event_id)
  and exists (select 1 from households h where h.id = household_id and can_see_household(h)
  and has_role(h.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')));

drop policy reg_read on public_registrations;
drop policy reg_write on public_registrations;
create policy reg_read on public_registrations for select using (can_see_event(event_id));
create policy reg_write on public_registrations for update using (can_see_event(event_id) and exists (select 1 from events e where e.id = event_id
  and has_role(e.wedding_id, '{admin,bride_organizer,groom_organizer,guest_manager}')));

drop policy exp_r on expenses;
drop policy exp_w on expenses;
create policy exp_r on expenses for select using ((event_id is null or can_see_event(event_id)) and (
  has_role(wedding_id, '{admin,budget_manager,viewer}')
  or (has_role(wedding_id, '{bride_organizer}') and responsibility in ('bride', 'both'))
  or (has_role(wedding_id, '{groom_organizer}') and responsibility in ('groom', 'both'))));
create policy exp_w on expenses for all using ((event_id is null or can_see_event(event_id)) and (
  has_role(wedding_id, '{admin,budget_manager}')
  or (has_role(wedding_id, '{bride_organizer}') and responsibility = 'bride')
  or (has_role(wedding_id, '{groom_organizer}') and responsibility = 'groom')));

drop policy tasks_rw on tasks;
create policy tasks_rw on tasks for all using (is_collab(wedding_id)
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids))
  and (event_id is null or can_see_event(event_id)));

drop policy des on invitation_designs;
create policy des on invitation_designs for all using (is_collab(wedding_id) and can_see_event(event_id));

drop policy outbox_r on outbox;
create policy outbox_r on outbox for select using (is_collab(wedding_id) and (event_id is null or can_see_event(event_id)));

drop policy outfits_read on outfits;
drop policy outfits_write on outfits;
create policy outfits_read on outfits for select using (
  is_collab(wedding_id) and wedding_plan(wedding_id) <> 'free'
  and ((collab(wedding_id)).role not in ('bride_organizer','groom_organizer')
       or side = 'both' or side::text = replace((collab(wedding_id)).role::text, '_organizer', ''))
  and (event_id is null or can_see_event(event_id)));
create policy outfits_write on outfits for all using (
  has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer}') and wedding_plan(wedding_id) <> 'free'
  and ((collab(wedding_id)).role not in ('bride_organizer','groom_organizer')
       or side = 'both' or side::text = replace((collab(wedding_id)).role::text, '_organizer', ''))
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids))
  and (event_id is null or can_see_event(event_id)));

drop policy boards_read on boards;
drop policy boards_write on boards;
create policy boards_read on boards for select using (is_collab(wedding_id) and wedding_plan(wedding_id) = 'signature'
  and (event_id is null or can_see_event(event_id)));
create policy boards_write on boards for all using (
  has_role(wedding_id, '{admin,bride_organizer,groom_organizer,event_organizer}') and wedding_plan(wedding_id) = 'signature'
  and ((collab(wedding_id)).event_ids is null or event_id = any((collab(wedding_id)).event_ids))
  and (event_id is null or can_see_event(event_id)));
