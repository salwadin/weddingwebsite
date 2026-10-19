import Link from "next/link";
import { can } from "@/lib/access";
import { allows, requireOrg } from "@/lib/dashboard";
import { cn, money, shortDate } from "@/lib/format";
import type { Outfit } from "@/lib/types";
import { ButtonLink, Card, CardHeader, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import { OutfitCard } from "@/components/dash/outfit-card";
import { UpgradeGate } from "@/components/dash/upgrade-gate";

const ROLES: { value: string; label: string }[] = [
  { value: "", label: "Everyone" }, { value: "bride", label: "Bride" }, { value: "groom", label: "Groom" },
  { value: "family", label: "Family" }, { value: "party", label: "Bridal party" },
];

export default async function OutfitsPage({ searchParams }: { searchParams: Promise<{ view?: string; role?: string }> }) {
  const sp = await searchParams;
  const o = await requireOrg("outfits");
  const canBill = can(o.scope, "billing");
  if (!allows(o, "outfits")) return <><PageHeader title="Outfits" /><UpgradeGate feature="outfits" canManageBilling={canBill}>Plan every look for every event: designers, fittings, pieces, deadlines and payments.</UpgradeGate></>;

  const { d, events, scope } = o;
  const editable = can(scope, "outfits", "edit");
  const view = sp.view === "person" ? "person" : "event";
  const all = d.outfits.filter((x) => x.weddingId === o.ctx.wedding.id
    && (!scope.side || x.side === scope.side || x.side === "both")
    && (!scope.eventIds || scope.eventIds.includes(x.eventId ?? "")));
  const outfits = all.filter((x) => !sp.role || x.role === sp.role);
  const evName = (id?: string) => events.find((e) => e.id === id)?.name;
  const ready = all.filter((x) => x.status === "ready" || x.status === "worn").length;
  const cost = all.reduce((n, x) => n + x.cost, 0), paid = all.reduce((n, x) => n + x.paid, 0);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = all.flatMap((x) => [
    ...x.fittings.filter((f) => !f.done).map((f) => ({ date: f.date, label: `Fitting · ${x.wearer}`, sub: f.note || x.title, id: x.id })),
    ...(x.dueDate && !["ready", "worn"].includes(x.status) ? [{ date: x.dueDate, label: `Due · ${x.wearer}`, sub: x.title, id: x.id }] : []),
  ]).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  const groups: { key: string; title: string; items: Outfit[] }[] = view === "event"
    ? [...events.map((e) => ({ key: e.id, title: e.name, items: outfits.filter((x) => x.eventId === e.id) })),
       { key: "none", title: "Not tied to an event", items: outfits.filter((x) => !x.eventId) }]
    : [...new Set(outfits.map((x) => x.wearer))].map((w) => ({ key: w, title: w, items: outfits.filter((x) => x.wearer === w) }));

  const q = (p: Record<string, string>) => `/dashboard/outfits?${new URLSearchParams({ view, role: sp.role ?? "", ...p })}`;

  return (
    <>
      <PageHeader title="Outfits" description="Every look for every event: who's wearing what, from whom, and what's left before the day."
        actions={editable && <ButtonLink href="/dashboard/outfits/new">Add a look</ButtonLink>} />

      <Card className="mb-5 grid grid-cols-2 gap-6 p-5 md:grid-cols-4">
        <Stat label="Looks" value={all.length} />
        <Stat label="Ready" value={`${ready}/${all.length}`} tone="sage" />
        <Stat label="Outfit spend" value={money(cost)} tone="gold" sub={`${money(paid)} paid`} />
        <div className="self-end"><Progress value={all.length ? (ready / all.length) * 100 : 0} tone="sage" /><p className="mt-1 text-xs text-muted">{all.length - ready} still in progress</p></div>
      </Card>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-cream p-1 text-sm">
          {(["event", "person"] as const).map((v) => <Link key={v} href={q({ view: v })} className={cn("rounded-full px-4 py-1.5", view === v ? "bg-white shadow-sm" : "text-muted")}>By {v}</Link>)}
        </div>
        <div className="flex flex-wrap gap-1.5 text-sm">
          {ROLES.map((r) => <Link key={r.value} href={q({ role: r.value })} className={cn("rounded-full border px-3 py-1", (sp.role ?? "") === r.value ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>{r.label}</Link>)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          {outfits.length === 0 && <Empty title="No looks yet">Add the first outfit for the couple, parents, or bridal party.</Empty>}
          {groups.filter((g) => g.items.length).map((g) => {
            const palette = view === "event" ? events.find((e) => e.id === g.key)?.palette : undefined;
            return (
              <section key={g.key}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-serif text-2xl">{g.title}</h2>
                  {palette && <span className="flex gap-1" title="Guest color palette">{palette.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />)}</span>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {g.items.map((x) => <OutfitCard key={x.id} o={x} eventName={view === "person" ? evName(x.eventId) : undefined} editable={editable} />)}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader title="Coming up" />
            <ul className="divide-y divide-line/70 text-sm">
              {upcoming.length === 0 && <li className="px-5 py-4 text-muted">Nothing scheduled.</li>}
              {upcoming.map((u, i) => (
                <li key={i} className="px-5 py-2.5">
                  <Link href={`/dashboard/outfits/${u.id}`} className="flex justify-between gap-2 hover:underline"><span className="font-medium">{u.label}</span><span className={cn("shrink-0 text-xs", u.date < today ? "text-[#9b4d47]" : "text-muted")}>{shortDate(u.date)}</span></Link>
                  <p className="truncate text-xs text-muted">{u.sub}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-serif text-xl">Guest palettes</h3>
            <p className="mt-1 text-xs text-muted">Shown to guests next to each event&apos;s dress code. Edit them on the event page.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <Link href={`/dashboard/events/${e.id}`} className="hover:underline">{e.name}</Link>
                  <span className="flex gap-1">{(e.palette ?? []).map((c) => <span key={c} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />)}{!e.palette?.length && <span className="text-xs text-muted">None</span>}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
