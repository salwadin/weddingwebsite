import Link from "next/link";
import { LayoutGrid, Image as ImageIcon } from "lucide-react";
import { can } from "@/lib/access";
import { allows, requireOrg } from "@/lib/dashboard";
import { createBoard } from "@/lib/actions/studio";
import { TEMPLATES } from "@/lib/studio-templates";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { UpgradeGate } from "@/components/dash/upgrade-gate";

export default async function StudioPage() {
  const o = await requireOrg("studio");
  if (!allows(o, "studio")) return <><PageHeader title="Design Studio" /><UpgradeGate feature="studio" canManageBilling={can(o.scope, "billing")}>Moodboards for every event, and drag-and-drop floor plans with stages, prayer rooms, separate sections and seat counts.</UpgradeGate></>;
  const editable = can(o.scope, "studio", "edit");
  const boards = o.d.boards.filter((b) => b.weddingId === o.ctx.wedding.id && (!o.scope.eventIds || o.scope.eventIds.includes(b.eventId ?? "")))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ev = (id?: string) => o.events.find((e) => e.id === id)?.name;

  return (
    <>
      <PageHeader title="Design Studio" description="A shared workspace for the look and layout of each event: moodboards for colors and decor, and floor plans for the room." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {boards.length === 0 && <p className="text-sm text-muted">No boards yet. Start one from a template.</p>}
          {boards.map((b) => {
            const cover = b.items.find((i) => i.type === "image")?.src;
            const swatches = b.items.filter((i) => i.type === "swatch").slice(0, 5);
            const seats = b.items.reduce((n, i) => n + (i.type.startsWith("table") ? i.seats ?? 0 : 0), 0);
            return (
              <Link key={b.id} href={`/dashboard/studio/${b.id}`} className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative h-40 bg-cream">
                  {b.kind === "moodboard" && cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={cover} alt="" className="h-full w-full object-cover" />
                    : <MiniPlan items={b.items} />}
                  {swatches.length > 0 && <div className="absolute bottom-2 left-2 flex gap-1">{swatches.map((s) => <span key={s.id} className="h-5 w-5 rounded-full border-2 border-white" style={{ background: s.color }} />)}</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    {b.kind === "moodboard" ? <ImageIcon className="h-4 w-4 text-gold" /> : <LayoutGrid className="h-4 w-4 text-gold" />}
                    <p className="font-serif text-xl leading-tight group-hover:underline">{b.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <Badge tone="outline">{b.kind === "moodboard" ? "Moodboard" : "Floor plan"}</Badge>
                    {ev(b.eventId) && <Badge>{ev(b.eventId)}</Badge>}
                    {b.kind === "floorplan" && <Badge tone="sage">{seats} seats</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted">Edited {new Date(b.updatedAt).toLocaleDateString()}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {editable && (
          <Card className="self-start">
            <CardHeader title="New board" />
            <form action={createBoard} className="space-y-4 p-5">
              <Field label="Name"><Input name="name" placeholder="Walima tablescape" /></Field>
              <Field label="Event">
                <Select name="eventId">{!o.scope.eventIds && <option value="">Whole wedding</option>}{o.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
              </Field>
              <fieldset className="space-y-2">
                <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted">Start from</legend>
                {TEMPLATES.map((t, i) => (
                  <label key={t.value} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink has-[:checked]:bg-cream/50">
                    <input type="radio" name="template" value={t.value} defaultChecked={i === 0} className="mt-1 accent-[#3b2b20]" />
                    <span><span className="block text-sm font-medium">{t.label}</span><span className="text-xs text-muted">{t.description}</span></span>
                  </label>
                ))}
              </fieldset>
              <Button className="w-full">Create board</Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}

/** Tiny static preview of a floor plan. */
function MiniPlan({ items }: { items: { id: string; type: string; x: number; y: number; w: number; h: number; color?: string }[] }) {
  return (
    <svg viewBox="0 0 1400 900" className="h-full w-full bg-[#fbfaf7]" aria-hidden>
      {items.map((i) => i.type === "table_round"
        ? <circle key={i.id} cx={i.x + i.w / 2} cy={i.y + i.h / 2} r={i.w / 2} fill="#fff" stroke="#cdbb98" strokeWidth="4" />
        : <rect key={i.id} x={i.x} y={i.y} width={i.w} height={i.h} rx="14" fill={i.type === "image" ? "#e9dfcf" : i.color ?? "#fff"} stroke="#cdbb98" strokeWidth="3" opacity={i.type === "zone" ? 0.7 : 1} />)}
    </svg>
  );
}
