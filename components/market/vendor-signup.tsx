"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/site";
import { CATEGORIES } from "@/lib/marketplace";
import { Button, Field, Input, Select } from "@/components/ui";

export function VendorSignupForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok && state.message) return <p className="rounded-xl bg-cream px-3 py-3 text-sm">{state.message}</p>;
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Business name"><Input name="business" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category"><Select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="City"><Input name="city" required /></Field>
      </div>
      <Field label="Your name"><Input name="name" required autoComplete="name" /></Field>
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password"><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39]">{state.error}</p>}
      <Button className="w-full" size="lg" disabled={pending}>{pending ? "Creating…" : "Create free listing"}</Button>
    </form>
  );
}
