import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { setOutfitStatus, togglePiece } from "@/lib/actions/outfits";
import { cn, money, shortDate } from "@/lib/format";
import type { Outfit, OutfitStatus } from "@/lib/types";
import { Badge } from "@/components/ui";

export const OUTFIT_STATUSES: { value: OutfitStatus; label: string }[] = [
  { value: "idea", label: "Idea" }, { value: "sourcing", label: "Sourcing" }, { value: "ordered", label: "Ordered" },
  { value: "alterations", label: "Alterations" }, { value: "ready", label: "Ready" }, { value: "worn", label: "Worn" },
];

export function OutfitCard({ o, eventName, editable }: { o: Outfit; eventName?: string; editable: boolean }) {
  const step = OUTFIT_STATUSES.findIndex((s) => s.value === o.status);
  const next = o.fittings.find((f) => !f.done);
  const today = new Date().toISOString().slice(0, 10);
  const late = o.dueDate && o.dueDate < today && step < 4;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative h-36">
        {o.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={o.image} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full">{(o.colors.length ? o.colors : ["#E9DFCF"]).map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>}
        {o.image && o.colors.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">{o.colors.map((c) => <span key={c} className="h-5 w-5 rounded-full border-2 border-white shadow" style={{ background: c }} />)}</div>
        )}
        {eventName && <Badge tone="ink" className="absolute right-2 top-2">{eventName}</Badge>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-[0.1em] text-muted">{o.wearer}</p>
        <Link href={`/dashboard/outfits/${o.id}`} className="mt-0.5 font-serif text-xl leading-tight hover:underline">{o.title}</Link>
        {o.designer && <p className="text-xs text-muted">{o.designer}</p>}

        <div className="mt-3 flex gap-1" aria-label={`Status: ${o.status}`}>
          {OUTFIT_STATUSES.slice(0, 5).map((s, i) => (
            <span key={s.value} title={s.label} className={cn("h-1.5 flex-1 rounded-full", i <= step ? (step >= 4 ? "bg-sage" : "bg-gold") : "bg-cream")} />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">{OUTFIT_STATUSES[step]?.label}</span>
          {o.dueDate && <span className={cn(late ? "text-[#9b4d47]" : "text-muted")}>{late ? "Overdue · " : "Due "}{shortDate(o.dueDate)}</span>}
        </div>

        {o.pieces.length > 0 && (
          <ul className="mt-3 space-y-1">
            {o.pieces.map((p) => (
              <li key={p.id}>
                <form action={togglePiece} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name="id" value={o.id} /><input type="hidden" name="pieceId" value={p.id} />
                  <button disabled={!editable} aria-label={p.done ? `Mark ${p.name} not done` : `Mark ${p.name} done`} className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]", p.done ? "border-sage bg-sage text-white" : "border-line")}>{p.done ? "✓" : ""}</button>
                  <span className={cn(p.done && "text-muted line-through")}>{p.name}</span>
                </form>
              </li>
            ))}
          </ul>
        )}

        {next && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-cream/60 px-2.5 py-1.5 text-xs"><CalendarClock className="h-3.5 w-3.5 text-gold" /> Fitting {shortDate(next.date)}{next.note && ` · ${next.note}`}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
          <span className="text-muted">{o.cost ? `${money(o.paid)} of ${money(o.cost)} paid` : "No cost yet"}</span>
          {editable && step < 5 && (
            <form action={setOutfitStatus}>
              <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={OUTFIT_STATUSES[step + 1].value} />
              <button className="rounded-full border border-line px-2.5 py-1 hover:bg-cream">Mark {OUTFIT_STATUSES[step + 1].label.toLowerCase()} →</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
