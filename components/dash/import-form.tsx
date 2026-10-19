"use client";

import { useActionState } from "react";
import { Button, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/actions/site";

const SAMPLE = `household,side,relationship,email,phone,members,events,tags
"Mr. and Mrs. Javed Ahmed & Family",bride,Ayesha's khala,javed.ahmed@example.com,+1 214 555 0199,"Javed Ahmed; Farah Ahmed; Zayd Ahmed (child)","Nikkah; Shaadi",extended_family
"Ms. Hira Baig & Guest",groom,Omar's colleague,hira.baig@example.com,,"Hira Baig; Guest (plus one)","Nikkah; Walima",friends`;

export function ImportForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <Textarea name="csv" rows={12} defaultValue={SAMPLE} className="font-mono text-xs" />
      {state?.error && <p className="rounded-xl bg-rose-soft px-4 py-2.5 text-sm text-[#8f3f39]">{state.error}</p>}
      {state?.message && <p className="rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">{state.message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending}>{pending ? "Importing…" : "Import households"}</Button>
        <label className="cursor-pointer text-sm text-muted underline">
          or choose a .csv file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const ta = e.target.form?.elements.namedItem("csv") as HTMLTextAreaElement; ta.value = await f.text();
          }} />
        </label>
      </div>
    </form>
  );
}
