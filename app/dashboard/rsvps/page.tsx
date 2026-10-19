import Link from "next/link";
import { can } from "@/lib/access";
import { eventStats, requireOrg } from "@/lib/dashboard";
import { setRegistrationStatus } from "@/lib/actions/dashboard";
import { cn } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Progress, Stat } from "@/components/ui";

export default async function RsvpsPage({ searchParams }: { searchParams: Promise<{ event?: string; show?: string }> }) {
  const sp = await searchParams;
  const o = await requireOrg("rsvps");
  const { d, events, households } = o;
  const e = events.find((x) => x.id === sp.event) ?? events[0];
  if (!e) return <PageHeader title="RSVPs" />;
  const s = eventStats(d, e, households);
  const show = sp.show ?? "all";
  const canEdit = can(o.scope, "rsvps", "edit");

  const rows = households.flatMap((h) => {
    const inv = d.invitations.find((i) => i.householdId === h.id && i.eventId === e.id);
    if (!inv) return [];
    const people = inv.guestIds.map((gid) => ({ g: d.guests.find((x) => x.id === gid)!, r: d.rsvps.find((x) => x.eventId === e.id && x.guestId === gid) })).filter((p) => p.g);
    const yes = people.filter((p) => p.r?.status === "attending").length;
    const no = people.filter((p) => p.r?.status === "declined").length;
    const status = yes + no === 0 ? "pending" : yes + no < people.length ? "partial" : yes ? "attending" : "declined";
    const last = people.map((p) => p.r?.updatedAt ?? "").sort().pop();
    return [{ h, people, yes, no, status, last }];
  }).filter((r) => show === "all" || r.status === show)
    .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));

  const regs = d.registrations.filter((r) => r.eventId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const log = d.audit.filter((a) => a.weddingId === o.ctx.wedding.id && /rsvp|registration/.test(a.action) && a.detail.includes(e.name)).slice(0, 12);

  return (
    <>
      <PageHeader title="RSVPs" description="Responses per event, updated live as families reply." />
      <div className="mb-5 flex flex-wrap gap-2">
        {events.map((x) => <Link key={x.id} href={`/dashboard/rsvps?event=${x.id}`} className={cn("rounded-full border px-4 py-1.5 text-sm", x.id === e.id ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>{x.name}</Link>)}
      </div>

      <Card className="grid gap-6 p-6 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Invited" value={s.invitedGuests} sub={`${s.invitedHouseholds} households`} />
        <Stat label="Attending" value={s.attending} tone="sage" sub={`${s.adults} adults · ${s.children} children`} />
        <Stat label="Declined" value={s.declined} tone="rose" />
        <Stat label="Pending" value={s.pending} tone="gold" sub={`${s.householdsPending} households`} />
        {e.visibility === "public" ? <Stat label="Public RSVPs" value={s.publicConfirmed} sub={`${s.publicRegistrations} registrations${s.publicWaitlist ? ` · ${s.publicWaitlist} waitlist` : ""}`} /> : <Stat label="Partial" value={s.householdsPartial} sub="households" />}
        <Stat label="Expected" value={s.expectedTotal} sub={e.capacity ? `of ${e.capacity} capacity` : undefined} />
        <div className="sm:col-span-3 lg:col-span-6"><Progress value={s.invitedGuests ? ((s.attending + s.declined) / s.invitedGuests) * 100 : 0} tone="sage" /></div>
      </Card>

      {Object.keys(s.meals).length > 0 && (
        <Card className="mt-5 p-5">
          <h3 className="font-serif text-xl">Meal counts</h3>
          <div className="mt-3 flex flex-wrap gap-6">
            {Object.entries(s.meals).map(([m, n]) => <Stat key={m} label={m} value={n} />)}
            {s.missingMeals > 0 && <Stat label="Not chosen" value={s.missingMeals} tone="rose" />}
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Household responses" action={
            <div className="flex gap-1 text-xs">
              {["all", "attending", "partial", "declined", "pending"].map((k) => <Link key={k} href={`/dashboard/rsvps?event=${e.id}&show=${k}`} className={cn("rounded-full px-2.5 py-1 capitalize", show === k ? "bg-ink text-ivory" : "hover:bg-cream")}>{k}</Link>)}
            </div>} />
          <ul className="max-h-[640px] divide-y divide-line/70 overflow-y-auto text-sm">
            {rows.length === 0 && <li className="px-5 py-6 text-muted">No households here.</li>}
            {rows.map(({ h, people, yes, status, last }) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/guests/${h.id}`} className="font-medium hover:underline">{h.name}</Link>
                  <p className="truncate text-xs text-muted">
                    {people.map((p) => `${p.g.firstName}${p.r?.status === "attending" ? " ✓" : p.r?.status === "declined" ? " ✗" : ""}${p.r?.meal ? ` (${p.r.meal.replace(/ menu$/i, "")})` : ""}`).join(" · ")}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted">{yes}/{people.length}</span>
                <Badge tone={status === "attending" ? "sage" : status === "declined" ? "rose" : status === "partial" ? "gold" : "outline"}>{status}</Badge>
                {last && <span className="hidden w-20 text-right text-[11px] text-muted sm:block">{new Date(last).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid content-start gap-5">
          {e.visibility === "public" && (
            <Card>
              <CardHeader title="Open-invitation registrations" description="Optional head-counts from the public website. Duplicates are flagged automatically." />
              <ul className="max-h-[420px] divide-y divide-line/70 overflow-y-auto text-sm">
                {regs.length === 0 && <li className="px-5 py-5 text-muted">No registrations yet.</li>}
                {regs.map((r) => (
                  <li key={r.id} className={cn("px-5 py-2.5", r.status === "cancelled" && "opacity-50")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted">{r.adults} adults{r.children ? `, ${r.children} children` : ""}</span>
                      {r.status !== "confirmed" && <Badge tone={r.status === "waitlist" ? "gold" : "outline"}>{r.status}</Badge>}
                      {r.duplicateOf && r.status !== "cancelled" && <Badge tone="rose">possible duplicate</Badge>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted">{r.email}</span>
                      {canEdit && (
                        <span className="flex gap-1">
                          {(["confirmed", "waitlist", "cancelled"] as const).filter((x) => x !== r.status).map((st) => (
                            <form key={st} action={setRegistrationStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={st} />
                              <button className="rounded-full px-2 py-0.5 text-[11px] text-muted hover:bg-cream hover:text-ink">{st === "confirmed" ? "confirm" : st === "cancelled" ? "remove" : "waitlist"}</button></form>
                          ))}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="RSVP audit trail" />
            <ul className="divide-y divide-line/70 text-xs">
              {log.length === 0 && <li className="px-5 py-4 text-muted">No changes yet.</li>}
              {log.map((a) => <li key={a.id} className="px-5 py-2.5"><span className="text-muted">{new Date(a.at).toLocaleString()} · {a.actor}</span><br />{a.detail}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
