import { Fragment } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { can } from "@/lib/access";
import { discrepancies, eventStats, requireOrg } from "@/lib/dashboard";
import { PLANS, trialDaysLeft } from "@/lib/plans";
import { longDate, money, time12, VISIBILITY } from "@/lib/format";
import { Badge, ButtonLink, Card, CardHeader, PageHeader, Progress, Stat } from "@/components/ui";
import { inNativeApp } from "@/lib/native";
import { PushPrompt } from "@/components/push-prompt";

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string; welcome?: string }> }) {
  const { denied, welcome } = await searchParams;
  const o = await requireOrg("dashboard");
  const { d, ctx, scope, events, households } = o;
  const w = ctx.wedding;
  const stats = events.map((e) => eventStats(d, e, households));
  const issues = discrepancies(d, events, households);
  const tasks = d.tasks.filter((t) => t.weddingId === w.id && (!scope.eventIds || scope.eventIds.includes(t.eventId ?? "")) && (!scope.side || t.side === scope.side || t.side === "both"));
  const done = tasks.filter((t) => t.done).length;
  const expenses = d.expenses.filter((x) => x.weddingId === w.id && (!scope.side || x.responsibility === scope.side || x.responsibility === "both"));
  const committed = expenses.reduce((n, x) => n + (x.actual || x.estimated), 0);
  const paid = expenses.reduce((n, x) => n + x.paid, 0);
  const first = events[0];
  const days = first ? Math.ceil((new Date(`${first.date}T00:00:00`).getTime() - Date.now()) / 864e5) : null;
  const guestsTotal = d.guests.filter((g) => households.some((h) => h.id === g.householdId)).length;
  const activity = d.audit.filter((a) => a.weddingId === w.id).slice(0, 8);

  const app = await inNativeApp();
  return (
    <>
      {trialDaysLeft(w) > 0 && can(scope, "billing") && (
        <p className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gold-soft/50 px-4 py-2.5 text-sm">
          <span>You&apos;re trying every feature free for {trialDaysLeft(w)} more days. After that you&apos;ll be on {PLANS[w.plan].name}.</span>
          {!app && <Link href="/dashboard/billing" className="font-medium underline">Compare plans</Link>}
        </p>
      )}
      {app && can(scope, "rsvps") && scope.role !== "viewer" && (
        <PushPrompt title="Know the moment guests RSVP" text="Get a notification on this phone whenever a household answers its invitation." />
      )}
      {welcome && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Mubarak! Your wedding is set up. Next: add details to each event, then send personal invitation links from the Guest List.</p>}
      {denied && <p className="mb-4 rounded-xl bg-rose-soft px-4 py-2.5 text-sm text-[#8f3f39]">Your role doesn&apos;t include access to {denied}. Ask a wedding administrator if you need it.</p>}
      <PageHeader
        title={`Assalamu alaikum, ${ctx.user.name.split(" ")[0]}`}
        description={days !== null ? <>{days} days until the {first!.name} · {households.length} households · {guestsTotal} guests{scope.side ? ` on the ${scope.side}'s side` : ""}</> : "Let's start by adding your first event."}
        actions={<>
          <ButtonLink href={`/w/${w.slug}`} target="_blank" variant="outline">View website</ButtonLink>
          {can(scope, "guests", "edit") && <ButtonLink href="/dashboard/guests/new">Add guests</ButtonLink>}
        </>}
      />

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {stats.map((s) => {
          const e = s.event;
          const pct = s.invitedGuests ? Math.round(((s.attending + s.declined) / s.invitedGuests) * 100) : 0;
          return (
            <Card key={e.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-2xl leading-tight">{e.name}</h3>
                  <p className="text-xs text-muted">{longDate(e.date)} · {time12(e.startTime)}</p>
                </div>
                <Badge tone={e.visibility === "public" ? "sage" : e.visibility === "private" ? "rose" : "gold"}>{VISIBILITY[e.visibility].label.split(" · ")[0]}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Attending" value={s.attending} tone="sage" />
                <Stat label="Declined" value={s.declined} tone="rose" />
                <Stat label="Pending" value={s.pending} tone="gold" />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted"><span>{s.invitedGuests} invited · {s.invitedHouseholds} households</span><span>{pct}% replied</span></div>
                <Progress value={pct} tone="sage" />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted">Adults / children</dt><dd className="text-right">{s.adults} / {s.children}</dd>
                <dt className="text-muted">Households replied</dt><dd className="text-right">{s.householdsResponded}{s.householdsPartial ? ` (+${s.householdsPartial} partial)` : ""}</dd>
                {e.visibility === "public" && <>
                  <dt className="text-muted">Public registrations</dt><dd className="text-right">{s.publicConfirmed} people{s.publicWaitlist ? ` · ${s.publicWaitlist} waitlist` : ""}</dd>
                  <dt className="text-muted">Expected (est.)</dt><dd className="text-right font-medium">{s.expectedTotal}{e.capacity ? ` / ${e.capacity}` : ""}</dd>
                </>}
                {Object.entries(s.meals).map(([m, n]) => (<Fragment key={m}><dt className="truncate text-muted">{m}</dt><dd className="text-right">{n}</dd></Fragment>))}
              </dl>
              <Link href={`/dashboard/rsvps?event=${e.id}`} className="mt-auto flex items-center gap-1 pt-4 text-xs font-medium text-gold hover:underline">View responses <ArrowRight className="h-3 w-3" /></Link>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Needs attention" description="Guest list discrepancies we noticed." />
          <ul className="divide-y divide-line/70">
            {issues.length === 0 && <li className="px-5 py-6 text-sm text-muted">Everything looks tidy. MashaAllah!</li>}
            {issues.map((i) => (
              <li key={i.text} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                {i.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />}
                <span className="flex-1">{i.text}</span>
                {i.href && <Link href={i.href} className="shrink-0 text-xs text-gold hover:underline">Review</Link>}
              </li>
            ))}
          </ul>
        </Card>
        <div className="grid gap-5">
          {can(scope, "checklist") && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between"><h3 className="font-serif text-xl">Planning checklist</h3><Link href="/dashboard/checklist" className="text-xs text-gold hover:underline">Open</Link></div>
              <p className="mt-1 text-sm text-muted">{done} of {tasks.length} tasks complete</p>
              <Progress className="mt-3" value={tasks.length ? (done / tasks.length) * 100 : 0} />
              <ul className="mt-4 space-y-1.5 text-sm">
                {tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9")).slice(0, 4).map((t) => (
                  <li key={t.id} className="flex justify-between gap-3"><span className="truncate">{t.title}</span><span className="shrink-0 text-xs text-muted">{t.dueDate ?? ""}</span></li>
                ))}
              </ul>
            </Card>
          )}
          {can(scope, "budget") && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between"><h3 className="font-serif text-xl">Budget</h3><Link href="/dashboard/budget" className="text-xs text-gold hover:underline">Open</Link></div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label={scope.side ? "Your side" : "Committed"} value={money(committed)} />
                <Stat label="Paid" value={money(paid)} tone="sage" />
                <Stat label="Balance" value={money(committed - paid)} tone="gold" />
              </div>
              {!scope.side && <Progress className="mt-4" value={(committed / w.totalBudget) * 100} tone={committed > w.totalBudget ? "rose" : "gold"} />}
              {!scope.side && <p className="mt-1 text-xs text-muted">{money(committed)} of {money(w.totalBudget)} total budget</p>}
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent activity" description="RSVPs, invitation changes, and access changes are all logged." />
        <ul className="divide-y divide-line/70 text-sm">
          {activity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 px-5 py-2.5">
              <span className="w-36 shrink-0 text-xs text-muted">{new Date(a.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <span className="font-medium">{a.actor}</span>
              <span className="text-muted">{a.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
