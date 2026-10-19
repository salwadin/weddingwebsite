"use client";

import { useActionState, useState } from "react";
import { cn, longDate, time12 } from "@/lib/format";
import type { FormState } from "@/lib/actions/site";
import type { GuestView, PublicEvent } from "@/lib/site";
import { FormMessage, siteButton, siteInput } from "./client";

type Status = "attending" | "declined" | "";

export function HouseholdRsvp({ action, events, guest }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  events: PublicEvent[];
  guest: GuestView;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const initial: Record<string, Status> = {};
  for (const r of guest.rsvps) if (r.status !== "pending") initial[`${r.eventId}:${r.guestId}`] = r.status;
  const [status, setStatus] = useState(initial);
  const [meals, setMeals] = useState<Record<string, string>>(
    Object.fromEntries(guest.rsvps.filter((r) => r.meal).map((r) => [`${r.eventId}:${r.guestId}`, r.meal!])));
  const member = (id: string) => guest.members.find((m) => m.id === id)!;
  const rsvpEvents = events.filter((e) => e.rsvpMode !== "none" && guest.invitations.some((i) => i.eventId === e.id));
  const plusOnes = guest.members.filter((m) => m.isPlusOne);

  const setAll = (eventId: string, ids: string[], s: Status) =>
    setStatus((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [`${eventId}:${id}`, s])) }));

  if (!rsvpEvents.length) return null;

  return (
    <form action={formAction} className="space-y-6">
      {rsvpEvents.map((e) => {
        const inv = guest.invitations.find((i) => i.eventId === e.id)!;
        const pastDeadline = !!e.rsvpDeadline && new Date().toISOString().slice(0, 10) > e.rsvpDeadline;
        return (
          <fieldset key={e.id} disabled={pastDeadline} className="rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <legend className="heading text-3xl">{e.name}</legend>
              <button type="button" onClick={() => setAll(e.id, inv.guestIds, "attending")} className="text-xs uppercase tracking-[0.14em] text-[var(--site-accent)] hover:underline">
                Everyone is attending
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--site-muted)]">
              {longDate(e.date)} · {time12(e.startTime)} · {e.venueName}
              {e.rsvpDeadline && <> · Please reply by {longDate(e.rsvpDeadline)}</>}
            </p>
            {pastDeadline && <p className="mt-2 text-sm text-[#8f3f39]">The RSVP deadline has passed. Please contact the couple directly for changes.</p>}
            <ul className="mt-5 divide-y divide-[var(--site-line)]">
              {inv.guestIds.map((gid) => {
                const m = member(gid);
                const key = `${e.id}:${gid}`;
                const s = status[key] ?? "";
                return (
                  <li key={gid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{m.isPlusOne && (!m.firstName || m.firstName === "Guest") ? "Your guest" : `${m.firstName} ${m.lastName}`}</div>
                      <div className="text-xs text-[var(--site-muted)]">{m.isChild ? "Child" : m.isPlusOne ? "Plus-one" : "Adult"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["attending", "declined"] as const).map((opt) => (
                        <label key={opt} className={cn(
                          "cursor-pointer rounded-full border px-4 py-2 text-sm transition",
                          s === opt ? "border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-accent-ink)]" : "border-[var(--site-line)] hover:border-[var(--site-accent)]",
                        )}>
                          <input type="radio" className="sr-only" name={`status:${key}`} value={opt} checked={s === opt}
                            onChange={() => setStatus((p) => ({ ...p, [key]: opt }))} />
                          {opt === "attending" ? "Joyfully attending" : "Regretfully declining"}
                        </label>
                      ))}
                      {s === "attending" && e.mealOptions.length > 0 && (
                        <select name={`meal:${key}`} value={meals[key] ?? ""} onChange={(ev) => setMeals((p) => ({ ...p, [key]: ev.target.value }))} className={cn(siteInput, "h-10 w-auto")} aria-label="Meal preference">
                          <option value="">Meal preference</option>
                          {e.mealOptions.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}

      {plusOnes.length > 0 && (
        <div className="rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-5 sm:p-7">
          <h3 className="heading text-2xl">Your guest&apos;s name</h3>
          {plusOnes.map((p) => (
            <input key={p.id} name={`plusone:${p.id}`} defaultValue={p.firstName === "Guest" ? "" : `${p.firstName} ${p.lastName}`.trim()} placeholder="Full name of your guest" className={cn(siteInput, "mt-3")} />
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-5 sm:p-7">
        <h3 className="heading text-2xl">Dietary needs or notes</h3>
        <textarea name="dietary" rows={2} placeholder="Allergies, accessibility needs, or a note for the couple" className={cn(siteInput, "mt-3 h-auto py-3")} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <button className={cn(siteButton, "h-12 px-10 text-base")} disabled={pending}>{pending ? "Saving…" : "Send RSVP"}</button>
        <div className="w-full max-w-xl"><FormMessage state={state} /></div>
      </div>
    </form>
  );
}
