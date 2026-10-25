"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/format";

// The landing page's showcase of Qubool's core idea: one wedding website, and every
// household's own invitation showing only the events they're invited to.

const EVENTS = [
  { id: "dinner", name: "Welcome dinner", when: "Fri, June 11 · 7 pm" },
  { id: "ceremony", name: "Ceremony", when: "Sat, June 12 · 4 pm" },
  { id: "reception", name: "Reception", when: "Sat, June 12 · 7 pm" },
  { id: "afterparty", name: "After-party", when: "Sat, June 12 · 11 pm" },
  { id: "brunch", name: "Family brunch", when: "Sun, June 13 · 11 am" },
] as const;

const GUESTS = [
  { name: "The Chens", dear: "Chen family", events: ["dinner", "ceremony", "reception", "brunch"] },
  { name: "Aunt Maria", dear: "Aunt Maria", events: ["ceremony", "reception", "brunch"] },
  { name: "Sam & friends", dear: "Sam and friends", events: ["ceremony", "reception", "afterparty"] },
  { name: "The Okafors", dear: "Mr. and Mrs. Okafor", events: ["ceremony", "reception"] },
] as const;

export function GuestInvitations() {
  const [i, setI] = useState(0);
  const g = GUESTS[i];
  const invited = EVENTS.filter((e) => (g.events as readonly string[]).includes(e.id));
  const hidden = EVENTS.filter((e) => !(g.events as readonly string[]).includes(e.id));

  return (
    <div>
      <div role="tablist" aria-label="Choose a guest" className="flex flex-wrap gap-2">
        {GUESTS.map((x, n) => (
          <button key={x.name} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)}
            className={cn("rounded-full border px-4 py-2 text-[15px] transition", n === i ? "border-ink bg-ink text-ivory" : "border-line bg-white text-ink/80 hover:border-ink/40")}>
            {x.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-live="polite" className="mt-5 rounded-2xl border border-line bg-white p-6 shadow-[0_24px_60px_-34px_rgba(43,38,32,0.35)] sm:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Their invitation</p>
          <p className="text-xs text-muted">qubool.app/i/••••••</p>
        </div>
        <p className="mt-3 text-[15px] text-ink/70">Dear {g.dear},</p>
        <p className="mt-1 font-serif text-3xl tracking-tight">Jordan &amp; Priya invite you to</p>
        <ul className="mt-5">
          {invited.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 border-t border-line/70 py-3 text-[15px]">
              <span className="font-medium">{e.name}</span><span className="text-sm text-ink/60">{e.when}</span>
            </li>
          ))}
        </ul>
        <span className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-ivory">
          RSVP for {invited.length === 1 ? "this event" : `all ${invited.length} events`}
        </span>
        {hidden.length > 0 && (
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream/70 px-3.5 py-2.5 text-sm text-ink/70">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Not on their invitation, and never shown to them: {hidden.map((e) => e.name).join(", ")}.</span>
          </p>
        )}
      </div>
    </div>
  );
}
