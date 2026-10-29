"use client";

import { useState } from "react";
import { cn } from "@/lib/format";

// A small, working picture of the Checklist: each task belongs to one side or is shared,
// and each side's family sees its own tasks plus the shared ones.

type Side = "sara" | "adam" | "both";
const TASKS: { title: string; due: string; side: Side; done: boolean }[] = [
  { title: "Book the venue", due: "Jan 10", side: "both", done: true },
  { title: "Order the cake", due: "Mar 2", side: "sara", done: false },
  { title: "Hotel block for guests", due: "Feb 14", side: "adam", done: true },
  { title: "Send save-the-dates", due: "Feb 1", side: "both", done: false },
  { title: "Rehearsal dinner menu", due: "Apr 20", side: "adam", done: false },
];
const LABEL: Record<Side, string> = { sara: "Sara's side", adam: "Adam's side", both: "Shared" };
const FILTERS: { v: Side | "all"; label: string }[] = [{ v: "all", label: "All" }, { v: "sara", label: "Sara's side" }, { v: "adam", label: "Adam's side" }];

export function ChecklistMock() {
  const [f, setF] = useState<Side | "all">("all");
  const shown = TASKS.filter((t) => f === "all" || t.side === f || t.side === "both");
  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-3">
      <div className="flex gap-1" role="tablist" aria-label="Show tasks for">
        {FILTERS.map((x) => (
          <button key={x.v} type="button" role="tab" aria-selected={f === x.v} onClick={() => setF(x.v)}
            className={cn("rounded-full px-2.5 py-0.5 text-[11px] transition", f === x.v ? "bg-ink text-ivory" : "bg-cream text-ink/70 hover:text-ink")}>{x.label}</button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-line/70 text-xs">
        {shown.map((t) => (
          <li key={t.title} className="flex items-center gap-2 py-1.5">
            <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px]", t.done ? "border-olive bg-olive text-ivory" : "border-taupe")} aria-hidden>{t.done && "✓"}</span>
            <span className={cn("min-w-0 flex-1 truncate", t.done && "text-muted line-through")}>{t.title}</span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px]", t.side === "both" ? "bg-cream text-ink/70" : t.side === "sara" ? "bg-blush/50 text-brown" : "bg-sage-soft text-sage")}>{LABEL[t.side]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
