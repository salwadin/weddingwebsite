import { ListChecks, LayoutGrid, Shirt } from "lucide-react";
import { ChecklistMock } from "./checklist-mock";

// The landing page's planning highlight: small, static pictures of the Design Studio
// (a moodboard and a floor plan), the Outfits planner and the Checklist, as they look in the dashboard.

const SWATCHES = ["#f7f3ec", "#dcc1b4", "#c8b6a7", "#454b38", "#604a38"];
const TABLES = [[18, 30], [42, 30], [66, 30], [18, 68], [42, 68], [66, 68]];
const LOOKS = [
  { who: "Sara", what: "Ceremony gown", note: "Final fitting, May 28", status: "Ready", done: true },
  { who: "Adam", what: "Reception suit", note: "Tailoring", status: "In progress", done: false },
  { who: "Bridal party", what: "Five dresses", note: "Ordered", status: "In progress", done: false },
];

const card = "flex flex-col overflow-hidden rounded-3xl border border-line bg-white";

export function PlanningHighlight() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Planning, <span className="italic text-brown">beautifully.</span></h2>
        <p className="text-lg text-ink/70">Every task, every look, every room.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={card}>
          <div className="grid h-56 grid-cols-[1.1fr_1fr] gap-3 bg-cream p-4" aria-hidden>
            {/* Moodboard */}
            <div className="grid grid-cols-2 grid-rows-[1fr_1fr_auto] gap-2 rounded-xl bg-white p-2">
              <div className="row-span-2 rounded-lg bg-[linear-gradient(160deg,#dcc1b4,#c8b6a7)]" />
              <div className="rounded-lg bg-[linear-gradient(160deg,#e9e3d6,#c8b6a7)]" />
              <div className="rounded-lg bg-[linear-gradient(160deg,#6b7258,#454b38)]" />
              <div className="col-span-2 flex gap-1">{SWATCHES.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />)}</div>
            </div>
            {/* Floor plan */}
            <div className="relative rounded-xl bg-white">
              <span className="absolute inset-x-[22%] top-[6%] rounded-sm bg-taupe/60 py-0.5 text-center text-[8px] uppercase tracking-[0.2em] text-ink/70">Stage</span>
              {TABLES.map(([x, y]) => (
                <span key={`${x}-${y}`} className="absolute h-[18%] w-[18%] -translate-x-1/2 rounded-full border border-brown/40 bg-blush/50" style={{ left: `${x + 8}%`, top: `${y}%` }} />
              ))}
            </div>
          </div>
          <div className="p-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold"><LayoutGrid className="h-4 w-4" />Design Studio</p>
            <h3 className="mt-2 font-serif text-2xl">Moodboards and floor plans</h3>
            <p className="mt-1 text-[15px] text-ink/70">Colors, decor and the room layout for each event, shared with your family and planner.</p>
          </div>
        </div>

        <div className={card}>
          <div className="h-56 bg-cream p-4" aria-hidden>
            <div className="h-full rounded-xl bg-white p-3">
              <div className="flex items-center justify-between text-[11px] text-muted"><span>Looks ready</span><span><b className="text-ink">6</b> of 9</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-cream"><div className="h-1.5 w-2/3 rounded-full bg-olive" /></div>
              <ul className="mt-3 divide-y divide-line/70 text-xs">
                {LOOKS.map((l) => (
                  <li key={l.who} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0"><b className="font-medium">{l.who}</b> · {l.what}<span className="block text-[10px] text-muted">{l.note}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${l.done ? "bg-sage-soft text-sage" : "bg-cream text-ink/70"}`}>{l.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold"><Shirt className="h-4 w-4" />Outfits</p>
            <h3 className="mt-2 font-serif text-2xl">Every look, every event</h3>
            <p className="mt-1 text-[15px] text-ink/70">Who&apos;s wearing what, fittings, deadlines and payments, in one list.</p>
          </div>
        </div>
        <div className={card}>
          <div className="h-56 bg-cream p-4"><ChecklistMock /></div>
          <div className="p-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold"><ListChecks className="h-4 w-4" />Checklist</p>
            <h3 className="mt-2 font-serif text-2xl">Tasks, split by side</h3>
            <p className="mt-1 text-[15px] text-ink/70">Give each family its own tasks, keep shared ones in common. Everyone sees what&apos;s theirs.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
