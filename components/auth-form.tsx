"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "./ui";
import type { FormState } from "@/lib/actions/site";

export function AuthForm({ action, mode }: { action: (s: FormState, f: FormData) => Promise<FormState>; mode: "login" | "signup" }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && <Field label="Your name"><Input name="name" required autoComplete="name" /></Field>}
      <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Password"><Input name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></Field>
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39]">{state.error}</p>}
      <Button className="w-full" size="lg" disabled={pending}>{pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}</Button>
    </form>
  );
}
