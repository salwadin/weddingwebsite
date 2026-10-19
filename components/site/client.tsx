"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { cn } from "@/lib/format";
import type { FormState } from "@/lib/actions/site";

export function SiteNav({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === base ? path === base : path.startsWith(href));
  return (
    <>
      <nav className="hidden items-center gap-7 md:flex">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={cn("text-[13px] uppercase tracking-[0.14em] transition hover:text-[var(--site-accent)]", isActive(i.href) ? "text-[var(--site-accent)]" : "text-[var(--site-muted)]")}>
            {i.label}
          </Link>
        ))}
      </nav>
      <button className="md:hidden text-sm uppercase tracking-[0.14em] text-[var(--site-muted)]" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-[var(--site-line)] bg-[var(--site-bg)] px-6 py-4 md:hidden">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="block py-2.5 text-sm uppercase tracking-[0.14em]">
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(t);
  }, []);
  const target = new Date(to).getTime();
  const diff = now === null ? null : Math.max(0, target - now);
  const days = diff === null ? "—" : Math.floor(diff / 864e5);
  const hours = diff === null ? "—" : Math.floor((diff % 864e5) / 36e5);
  const mins = diff === null ? "—" : Math.floor((diff % 36e5) / 6e4);
  return (
    <div className="flex justify-center gap-8 sm:gap-12">
      {[[days, "days"], [hours, "hours"], [mins, "minutes"]].map(([v, l]) => (
        <div key={l as string} className="text-center">
          <div className="heading text-4xl sm:text-5xl tabular-nums">{v}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--site-muted)]">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-xl bg-[#f6e3e0] px-4 py-3 text-sm text-[#8f3f39]">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-xl bg-[#e6ece1] px-4 py-3 text-sm text-[#3f5238]">{state.message}</p>;
  return null;
}

export const siteInput = "w-full h-11 rounded-xl border border-[var(--site-line)] bg-[var(--site-surface)] px-3.5 text-sm text-[var(--site-ink)] placeholder:text-[var(--site-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/30";
export const siteButton = "inline-flex h-11 items-center justify-center rounded-full bg-[var(--site-accent)] px-7 text-sm font-medium text-[var(--site-accent-ink)] transition hover:opacity-90 disabled:opacity-50";

export function PasswordGate({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
      <input name="password" type="password" required placeholder="Website password" className={siteInput} autoFocus />
      <button className={siteButton} disabled={pending}>{pending ? "Checking…" : "Enter"}</button>
      <FormMessage state={state} />
    </form>
  );
}

export function FindInvitationForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="contact" required placeholder="Email or phone your invitation was sent to" className={siteInput} />
        <button className={cn(siteButton, "shrink-0")} disabled={pending}>{pending ? "Sending…" : "Send my link"}</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function PublicRsvpForm({ action, eventName, full }: { action: (s: FormState, f: FormData) => Promise<FormState>; eventName: string; full: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required placeholder="Full name" className={siteInput} autoComplete="name" />
      <input name="email" type="email" required placeholder="Email" className={siteInput} autoComplete="email" />
      <input name="phone" placeholder="Phone (optional)" className={siteInput} autoComplete="tel" />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-[var(--site-muted)]">Adults
          <select name="adults" defaultValue="1" className={cn(siteInput, "mt-1")}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label className="text-xs text-[var(--site-muted)]">Children
          <select name="children" defaultValue="0" className={cn(siteInput, "mt-1")}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button className={siteButton} disabled={pending}>{pending ? "Saving…" : full ? `Join the ${eventName} waitlist` : `Let us know you're coming`}</button>
        <span className="text-xs text-[var(--site-muted)]">Optional. It just helps us plan seating and refreshments.</span>
      </div>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
    </form>
  );
}
