import { Check } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/format";

/** Plan comparison cards. `action` renders the button for each plan. */
export function PlanCards({ current, action }: { current?: Plan; action: (p: Plan) => React.ReactNode }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((p) => (
        <div key={p} className={cn("flex flex-col rounded-3xl border bg-white p-6", p === "plus" ? "border-ink shadow-lg" : "border-line", current === p && "ring-2 ring-gold-soft")}>
          <div className="flex items-baseline justify-between"><p className="font-serif text-3xl">{PLANS[p].name}</p>{p === "plus" && <span className="text-[11px] uppercase tracking-wider text-gold">Most popular</span>}</div>
          <p className="mt-1 text-sm text-muted">{PLANS[p].tagline}</p>
          <p className="mt-5 font-serif text-5xl">{PLANS[p].price ? `$${PLANS[p].price}` : "Free"}</p>
          <p className="text-xs text-muted">{PLANS[p].billing}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">{PLANS[p].highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{h}</li>)}</ul>
          <div className="mt-6">{action(p)}</div>
        </div>
      ))}
    </div>
  );
}
