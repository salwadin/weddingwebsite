import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { can, canEditEvent } from "@/lib/access";
import { eventStats, requireOrg } from "@/lib/dashboard";
import { PLANS } from "@/lib/plans";
import { longDate, RSVP_MODES, SIDES, time12, VISIBILITY } from "@/lib/format";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { inNativeApp } from "@/lib/native";

export default async function EventsPage() {
  const o = await requireOrg("events");
  const canCreate = can(o.scope, "events", "edit") && !o.scope.eventIds;
  const max = PLANS[o.plan].maxEvents;
  const app = await inNativeApp();
  const atLimit = o.d.events.filter((e) => e.weddingId === o.ctx.wedding.id).length >= max;
  return (
    <>
      <PageHeader title="Events" description="Each event has its own guest list, visibility, and RSVP rules. Invitation-only and private events are completely hidden from anyone who isn't invited."
        actions={canCreate && (atLimit
          ? !app && <ButtonLink href="/dashboard/billing" variant="outline">Upgrade to add more events</ButtonLink>
          : <ButtonLink href="/dashboard/events/new">Add event</ButtonLink>)} />
      {canCreate && atLimit && <p className="mb-4 rounded-xl bg-gold-soft/50 px-4 py-2.5 text-sm">Your {PLANS[o.plan].name} plan includes {max} events. Your existing events stay live{app ? "." : "; upgrading lets you add more."}</p>}
      <div className="grid gap-4">
        {o.events.map((e) => {
          const s = eventStats(o.d, e, o.households);
          const Icon = e.visibility === "public" ? Eye : e.visibility === "private" ? EyeOff : Lock;
          return (
            <Card key={e.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-cream">
                  <span className="text-[10px] uppercase tracking-wider text-muted">{new Date(e.date + "T12:00").toLocaleDateString("en-US", { month: "short" })}</span>
                  <span className="font-serif text-2xl leading-none">{new Date(e.date + "T12:00").getDate()}</span>
                </div>
                <div>
                  <h3 className="font-serif text-2xl leading-tight">{e.name}</h3>
                  <p className="text-sm text-muted">{longDate(e.date)} · {time12(e.startTime)} · {e.venueName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={e.visibility === "public" ? "sage" : e.visibility === "private" ? "rose" : "gold"}><Icon className="h-3 w-3" />{VISIBILITY[e.visibility].label}</Badge>
                    <Badge tone="outline">{RSVP_MODES[e.rsvpMode]}</Badge>
                    <Badge tone="outline">Hosted by {SIDES[e.hostSide].toLowerCase()}</Badge>
                    {e.sidePrivate && e.hostSide !== "both" && <Badge tone="rose">Private to {SIDES[e.hostSide].toLowerCase()}</Badge>}
                    {e.capacity && <Badge tone="outline">Cap {e.capacity}{e.waitlist ? " + waitlist" : ""}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 md:justify-end">
                <div className="text-right text-sm"><div className="font-serif text-2xl">{s.invitedGuests}</div><div className="text-xs text-muted">invited</div></div>
                <div className="text-right text-sm"><div className="font-serif text-2xl">{s.expectedTotal}</div><div className="text-xs text-muted">attending</div></div>
                <Link href={`/dashboard/events/${e.id}`} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-cream">{canEditEvent(o.scope, e) ? "Edit" : "View"}</Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
