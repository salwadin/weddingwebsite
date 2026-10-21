"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "./ui";
import type { FormState } from "@/lib/actions/site";

type Mode = "login" | "signup" | "forgot" | "reset";
const SUBMIT: Record<Mode, string> = { login: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Save new password" };

export function AuthForm({ action, mode }: { action: (s: FormState, f: FormData) => Promise<FormState>; mode: Mode }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok && state.message) return <p className="rounded-xl bg-cream px-3 py-3 text-sm">{state.message}</p>;
  const newPassword = mode === "signup" || mode === "reset";
  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && <Field label="Your name"><Input name="name" required autoComplete="name" /></Field>}
      {mode !== "reset" && <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>}
      {mode !== "forgot" && <Field label={mode === "reset" ? "New password" : "Password"}><Input name="password" type="password" required minLength={newPassword ? 8 : undefined} autoComplete={newPassword ? "new-password" : "current-password"} /></Field>}
      {mode === "login" && <p className="-mt-2 text-right text-xs"><Link href="/forgot-password" className="text-muted underline hover:text-ink">Forgot your password?</Link></p>}
      {state?.error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39]">{state.error}</p>}
      <Button className="w-full" size="lg" disabled={pending}>{pending ? "One moment…" : SUBMIT[mode]}</Button>
    </form>
  );
}
