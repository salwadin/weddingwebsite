import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { bulkInvite } from "@/lib/actions/dashboard";
import { ButtonLink, PageHeader } from "@/components/ui";
import { GuestTable, type GuestRow } from "@/components/dash/guest-table";

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ filter?: string; done?: string }> }) {
  const { filter, done } = await searchParams;
  const o = await requireOrg("guests");
  const { d, events, households } = o;
  const byHousehold = new Map<string, typeof d.guests>();
  for (const g of d.guests) (byHousehold.get(g.householdId) ?? byHousehold.set(g.householdId, []).get(g.householdId)!).push(g);
  const rsvp = new Map(d.rsvps.map((r) => [`${r.eventId}:${r.guestId}`, r.status]));
  const evIds = new Set(events.map((e) => e.id));

  const rows: GuestRow[] = households.map((h) => {
    const members = byHousehold.get(h.id) ?? [];
    const invs = d.invitations.filter((i) => i.householdId === h.id && evIds.has(i.eventId));
    const status: GuestRow["status"] = {};
    for (const inv of invs) {
      const st = inv.guestIds.map((g) => rsvp.get(`${inv.eventId}:${g}`));
      status[inv.eventId] = st.every((s) => s === "attending") ? "attending" : st.every((s) => s === "declined") ? "declined"
        : st.every((s) => !s) ? "pending" : st.some((s) => !s) ? "partial" : st.some((s) => s === "attending") ? "attending" : "declined";
    }
    return {
      id: h.id, name: h.name, side: h.side, relationship: h.relationship, tags: h.tags, email: h.email, phone: h.phone,
      adults: members.filter((m) => !m.isChild).length, children: members.filter((m) => m.isChild).length,
      members: members.map((m) => `${m.firstName} ${m.lastName}`).join(", "),
      events: invs.map((i) => i.eventId), status, delivery: h.deliveryStatus,
      tables: [...new Set(members.map((m) => m.table).filter(Boolean))].join(", "),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const canEdit = can(o.scope, "guests", "edit");
  return (
    <>
      <PageHeader title="Guest List"
        description={o.scope.side ? `Showing the ${o.scope.side}'s side and shared guests, which is what your role can manage.` : o.scope.eventIds ? "Showing households invited to the events you organize." : "Households, not just names. Invite whole families and choose exactly who is invited to each event."}
        actions={canEdit && <><ButtonLink href="/dashboard/guests/import" variant="outline">Import CSV</ButtonLink><ButtonLink href="/dashboard/guests/new">Add household</ButtonLink></>} />
      {done && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">{done}.</p>}
      <GuestTable rows={rows} events={events.map((e) => ({ id: e.id, name: e.name, type: e.type }))} initialFilter={filter} canEdit={can(o.scope, "invitations", "edit")} bulkAction={bulkInvite} />
    </>
  );
}
