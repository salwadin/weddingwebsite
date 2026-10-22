"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { FormState } from "@/lib/actions/site";
import { CATEGORIES, TRADITION_LABELS } from "@/lib/marketplace";
import { BETA_EVENTS, BETA_FEATURES } from "@/lib/programs-shared";
import { cn } from "@/lib/format";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

type Action = (s: FormState, f: FormData) => Promise<FormState>;

function Done({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-sage-soft/60 px-6 py-10 text-center">
      <CheckCircle2 className="h-8 w-8 text-sage" />
      <p className="mt-3 font-serif text-2xl">Application received</p>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
    </div>
  );
}

/** Hidden field that only bots fill in. */
const Honeypot = () => (
  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>Leave this field empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label>
  </div>
);

function Chips({ name, options, labels }: { name: string; options: string[]; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-cream">
          <input type="checkbox" name={name} value={o} className="sr-only" />{labels?.[o] ?? o}
        </label>
      ))}
    </div>
  );
}

export function VendorApplicationForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok) return <Done message={state.message} />;
  return (
    <form action={formAction} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <Field label="Business name" className="sm:col-span-2"><Input name="business" required autoComplete="organization" /></Field>
      <Field label="Category"><Select name="category" required defaultValue=""><option value="" disabled>Choose…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="City"><Input name="city" required placeholder="Houston" /></Field>
      <Field label="State / region" hint="Optional" className="sm:col-span-2"><Input name="region" placeholder="Texas" /></Field>
      <Field label="Your name"><Input name="contact" required autoComplete="name" /></Field>
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Phone" hint="Optional"><Input name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Instagram" hint="Optional"><Input name="instagram" placeholder="@yourbusiness" /></Field>
      <Field label="Website" hint="Optional" className="sm:col-span-2"><Input name="website" placeholder="yourbusiness.com" /></Field>
      <Field label="Portfolio links" hint="Up to 8 links to galleries, past weddings or menus, separated by spaces or new lines." className="sm:col-span-2">
        <Textarea name="portfolio" rows={3} placeholder="https://…" />
      </Field>
      <Field group label="Traditions you know well" className="sm:col-span-2"><Chips name="traditions" options={Object.keys(TRADITION_LABELS)} labels={TRADITION_LABELS} /></Field>
      <Field label="About your business" hint="Optional: what makes your work special, team size, languages…" className="sm:col-span-2"><Textarea name="about" rows={4} /></Field>
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39] sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2"><Button size="lg" className="w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : "Apply to be a Founding Vendor"}</Button></div>
    </form>
  );
}

export function BetaApplicationForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [kind, setKind] = useState<"couple" | "planner">("couple");
  if (state?.ok) return <Done message={state.message} />;
  return (
    <form action={formAction} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <input type="hidden" name="kind" value={kind} />
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted">I&apos;m applying as</p>
        <div className="grid grid-cols-2 gap-2">
          {([["couple", "A couple", "Planning our own wedding"], ["planner", "A planner", "Wedding or event professional"]] as const).map(([v, t, sub]) => (
            <button key={v} type="button" onClick={() => setKind(v)} aria-pressed={kind === v}
              className={cn("rounded-2xl border p-4 text-left transition", kind === v ? "border-ink bg-cream/60" : "border-line bg-white hover:border-gold")}>
              <span className="block font-serif text-xl">{t}</span><span className="text-xs text-muted">{sub}</span>
            </button>
          ))}
        </div>
      </div>
      <Field label="Your name"><Input name="name" required autoComplete="name" /></Field>
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      {kind === "couple"
        ? <Field label="Partner's name" hint="Optional"><Input name="partner_name" /></Field>
        : <Field label="Company" hint="Optional"><Input name="company" autoComplete="organization" /></Field>}
      <Field label="City" hint="Optional"><Input name="city" /></Field>
      <Field label={kind === "couple" ? "Wedding date" : "Next event date"} hint="Approximate is fine"><Input name="event_date" type="date" /></Field>
      <Field label="Expected guests" hint="Largest event"><Input name="guest_count" type="number" min={1} inputMode="numeric" /></Field>
      {kind === "planner" && <Field label="Weddings per year" hint="Optional"><Input name="weddings_per_year" type="number" min={1} inputMode="numeric" /></Field>}
      <Field label="Phone" hint="Optional"><Input name="phone" type="tel" autoComplete="tel" /></Field>
      <Field group label="Events you're planning" className="sm:col-span-2"><Chips name="events" options={BETA_EVENTS} /></Field>
      <Field group label="Traditions" hint="Choose any that apply" className="sm:col-span-2"><Chips name="traditions" options={Object.keys(TRADITION_LABELS)} labels={TRADITION_LABELS} /></Field>
      <Field group label="What would help you most?" className="sm:col-span-2"><Chips name="features" options={BETA_FEATURES} /></Field>
      <Field label="How did you hear about Qubool?" hint="Optional" className="sm:col-span-2"><Input name="heard_from" /></Field>
      <Field label="Anything else we should know?" hint="Optional" className="sm:col-span-2"><Textarea name="notes" rows={3} /></Field>
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39] sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2"><Button size="lg" className="w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : "Request early access"}</Button></div>
    </form>
  );
}

