"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { invitationSvg } from "@/lib/invitation-card";
import { cn } from "@/lib/format";
import { Badge, Checkbox, Logo } from "@/components/ui";

// The landing page's look at the real thing, side by side: a guest's personal invitation
// page (styled with the actual wedding-site theme and the actual invitation card) and the
// couple's Guest List (styled like the dashboard), wired together: check a box as the couple,
// and that household's invitation changes.

type EventId = "dinner" | "ceremony" | "reception" | "afterparty" | "brunch";
const EVENTS: { id: EventId; name: string; short: string; date: string; time: string; venue: string; address: string }[] = [
  { id: "dinner", name: "Welcome dinner", short: "Dinner", date: "Friday, June 11", time: "7:00 pm", venue: "Olive & Vine", address: "18 Market Street, Austin" },
  { id: "ceremony", name: "Ceremony", short: "Ceremony", date: "Saturday, June 12", time: "4:00 pm", venue: "The Garden Pavilion", address: "400 Laurel Lane, Austin" },
  { id: "reception", name: "Reception", short: "Reception", date: "Saturday, June 12", time: "7:00 pm", venue: "The Grand Hall", address: "75 Congress Avenue, Austin" },
  { id: "afterparty", name: "After-party", short: "After-party", date: "Saturday, June 12", time: "11:00 pm", venue: "The Rooftop", address: "75 Congress Avenue, Austin" },
  { id: "brunch", name: "Family brunch", short: "Brunch", date: "Sunday, June 13", time: "11:00 am", venue: "The Miller home", address: "Details on your invitation" },
];

type Status = "attending" | "pending" | "declined";
interface Household { name: string; dear: string; side: string; guests: string; invited: Partial<Record<EventId, Status>> }
const START: Household[] = [
  { name: "The Millers", dear: "Miller family", side: "Sara's", guests: "4", invited: { dinner: "attending", ceremony: "attending", reception: "attending", brunch: "pending" } },
  { name: "Grandma Rose", dear: "Grandma Rose", side: "Adam's", guests: "1", invited: { ceremony: "attending", reception: "pending", brunch: "pending" } },
  { name: "College friends", dear: "friends", side: "Shared", guests: "3", invited: { ceremony: "pending", reception: "pending", afterparty: "attending" } },
  { name: "The Parkers", dear: "Mr. and Mrs. Parker", side: "Adam's", guests: "2", invited: { ceremony: "declined", reception: "declined" } },
];
const TONE = { attending: "sage", declined: "rose", pending: "outline" } as const;
const SLUG = "sara-and-adam";

export function TwoViews() {
  const [households, setHouseholds] = useState(START);
  const [who, setWho] = useState(0);
  const [view, setView] = useState<"guest" | "couple">("guest");
  const h = households[who];

  const toggle = (row: number, e: EventId) => setHouseholds((all) => all.map((x, n) => {
    if (n !== row) return x;
    const invited = { ...x.invited };
    if (invited[e]) delete invited[e]; else invited[e] = "pending";
    return { ...x, invited };
  }));

  return (
    <div>
      {/* Who's looking: the couple, or one of the guests. Outside the window, so it isn't mistaken for the site. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs uppercase tracking-[0.3em] text-muted">See it as</span>
        <div role="tablist" aria-label="Choose who's looking" className="flex flex-wrap gap-1.5">
          <Pick on={view === "couple"} onClick={() => setView("couple")}>The couple</Pick>
          <span aria-hidden className="mx-1 self-center text-xs text-muted">or a guest:</span>
          {households.map((x, n) => (
            <Pick key={x.name} on={view === "guest" && n === who} onClick={() => { setWho(n); setView("guest"); }}>{x.name}</Pick>
          ))}
        </div>
      </div>

      {/* A browser window, so it reads as the real page */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-40px_rgba(59,43,32,0.45)]">
        <div className="flex items-center gap-3 border-b border-line bg-cream/50 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /></span>
          <span className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-muted">
            {view === "guest" ? `qubool.app/w/${SLUG}/invitation` : "qubool.app/dashboard/guests"}
          </span>
        </div>
        {view === "guest"
          ? <GuestPage h={h} />
          : <CoupleGuestList households={households} who={who} onPick={setWho} onToggle={toggle} onOpen={(n) => { setWho(n); setView("guest"); }} />}
      </div>
    </div>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={cn("rounded-full border px-4 py-1.5 text-sm transition", on ? "border-ink bg-ink text-ivory" : "border-line bg-white text-ink/75 hover:border-ink/40 hover:text-ink")}>{children}</button>
  );
}

/** A miniature of /w/<slug>/invitation, in the real site theme ("Ivory & gold"). */
function GuestPage({ h }: { h: Household }) {
  const mine = EVENTS.filter((e) => h.invited[e.id]);
  const card = mine[0];
  const svg = useMemo(() => card ? invitationSvg({
    template: "arch", englishText: "Together with their families, Sara & Adam invite you to celebrate with them",
    urduText: "", arabicText: "", eventName: card.name, names: "Sara & Adam", dateLine: card.date, islamicLine: "",
    timeLine: `${card.time} onwards`, venue: card.venue, address: card.address,
  }, { dear: h.dear }) : "", [card, h.dear]);

  return (
    <div className="site" data-theme="noor" style={{ "--site-heading": "var(--font-classic)" } as CSSProperties}>
      <div className="flex items-center justify-between border-b border-[var(--site-line)] px-5 py-3">
        <span className="heading text-xl">S<span className="mx-0.5 text-[var(--site-accent)]">&amp;</span>A</span>
        <span className="hidden gap-4 text-[11px] uppercase tracking-[0.18em] text-[var(--site-muted)] sm:flex"><span>Home</span><span className="text-[var(--site-ink)]">Your invitation</span><span>Events</span><span>RSVP</span></span>
      </div>
      <div className="border-b border-[var(--site-line)] bg-[var(--site-soft)] px-4 py-2 text-center text-xs">
        Welcome, <b className="font-semibold">{h.dear}</b>. This page has been personalized for your invitation.
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-7 pt-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--site-muted)]">Your invitation</p>
        <p className="heading mt-2 text-3xl">Dear {h.dear}</p>
        <p className="mt-1 text-sm text-[var(--site-muted)]">
          {mine.length ? `Sara & Adam would be honored by your presence${mine.length > 1 ? ` at ${mine.length} celebrations` : ""}.` : "No events yet. The couple hasn't invited this household to anything."}
        </p>

        {card && (
          <div className="mt-5 grid items-start gap-5 text-left sm:grid-cols-[minmax(0,240px)_1fr]">
            <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-lg shadow-[0_18px_40px_-24px_rgba(59,43,32,0.55)] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <ul className="space-y-2">
              {mine.map((e) => (
                <li key={e.id} className="rounded-xl border border-[var(--site-line)] bg-white px-3.5 py-2.5">
                  <p className="heading text-lg leading-tight">{e.name}</p>
                  <p className="text-xs text-[var(--site-muted)]">{e.date} · {e.time} · {e.venue}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--site-muted)]">{h.invited[e.id] === "pending" ? "Awaiting your reply" : h.invited[e.id] === "attending" ? "You're coming" : "You can't make it"}</span>
                    <span className="rounded-full bg-[var(--site-accent)] px-3 py-1 text-[11px] font-medium text-[var(--site-accent-ink)]">{h.invited[e.id] === "pending" ? "RSVP" : "Change RSVP"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** A miniature of /dashboard/guests: households, and one column per event. */
function CoupleGuestList({ households, who, onPick, onToggle, onOpen }: {
  households: Household[]; who: number; onPick: (n: number) => void; onToggle: (row: number, e: EventId) => void; onOpen: (n: number) => void;
}) {
  const people = households.reduce((n, x) => n + Number(x.guests), 0);
  return (
    <div className="flex bg-ivory">
      <aside className="hidden w-44 shrink-0 border-r border-line px-3 py-4 md:block">
        <Logo className="text-lg" />
        <div className="mt-3 rounded-xl border border-line bg-white p-2.5">
          <p className="font-serif text-base leading-tight">Sara &amp; Adam</p>
          <Badge tone="gold" className="mt-1 py-0 text-[10px]">Full administrator</Badge>
        </div>
        <ul className="mt-3 space-y-0.5 text-xs text-ink/70">
          {["Dashboard", "Our Wedding Website", "Events", "Guest List", "Invitations", "RSVPs", "Budget"].map((x) => (
            <li key={x} className={cn("rounded-lg px-2 py-1.5", x === "Guest List" && "bg-white font-medium text-ink shadow-sm")}>{x}</li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 p-4">
        <p className="font-serif text-2xl">Guest List</p>
        <p className="mt-0.5 text-xs text-muted"><b className="text-ink">{households.length}</b> households · <b className="text-ink">{people}</b> people · check a box to invite a household to that event</p>
        <p className="mt-2 text-[11px] text-muted md:hidden">Swipe the table to see every event.</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-white md:mt-3">
          <table className="w-full min-w-[620px] text-xs">
            <thead className="border-b border-line bg-cream/40 text-left text-[10px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Household</th>
                <th className="px-2 py-2.5 font-medium">Side</th>
                {EVENTS.map((e) => <th key={e.id} className="px-1.5 py-2.5 text-center font-medium">{e.short}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {households.map((x, n) => (
                <tr key={x.name} className={cn(n === who && "bg-gold-soft/20")}>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => onPick(n)} className="text-left font-medium hover:underline">{x.name}</button>
                    <button type="button" onClick={() => onOpen(n)} className="block text-[10px] text-muted underline-offset-2 hover:text-ink hover:underline">See their invitation →</button>
                  </td>
                  <td className="px-2 py-2.5 text-muted">{x.side}</td>
                  {EVENTS.map((e) => {
                    const s = x.invited[e.id];
                    return (
                      <td key={e.id} className="px-1.5 py-2.5 text-center">
                        <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                          <Checkbox checked={!!s} onChange={() => onToggle(n, e.id)} aria-label={`Invite ${x.name} to the ${e.name}`} />
                          {s ? <Badge tone={TONE[s]} className="py-0 text-[10px]">{s}</Badge> : <span className="text-[10px] text-line">—</span>}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
