"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/lib/actions/account";
import { Button, Field, Input } from "./ui";

const WORD = "DELETE"; // lib/actions/account.ts checks the same word

export function DeleteAccountForm({ disabled }: { disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(deleteAccount, null);
  const [typed, setTyped] = useState("");
  return (
    <form action={formAction} className="space-y-3">
      <Field label={`Type ${WORD} to confirm`}>
        <Input name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={disabled} />
      </Field>
      {state?.error && <p role="alert" className="rounded-xl bg-rose-soft px-3 py-2 text-sm text-[#8f3f39]">{state.error}</p>}
      <Button variant="outline" className="border-rose/50 text-[#9b4d47] hover:bg-rose-soft" disabled={disabled || pending || typed.trim() !== WORD}>
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
