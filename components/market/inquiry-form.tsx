"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/site";
import { Button, Field, Input, Textarea } from "@/components/ui";

export function InquiryForm({ action, defaults }: { action: (s: FormState, f: FormData) => Promise<FormState>; defaults?: { name?: string; email?: string; date?: string } }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok) return <p className="rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">{state.message}</p>;
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Your name"><Input name="name" required defaultValue={defaults?.name} /></Field>
      <Field label="Email"><Input name="email" type="email" required defaultValue={defaults?.email} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wedding date"><Input name="eventDate" type="date" defaultValue={defaults?.date} /></Field>
        <Field label="Guests"><Input name="guests" type="number" min={1} /></Field>
      </div>
      <Field label="Message"><Textarea name="message" rows={4} required placeholder="Which events do you need covered? Anything special, like a female team or separate sections?" /></Field>
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39]">{state.error}</p>}
      <Button className="w-full" disabled={pending}>{pending ? "Sending…" : "Send inquiry"}</Button>
      <p className="text-center text-[11px] text-muted">Free for couples. Your email is shared only with this vendor.</p>
    </form>
  );
}
