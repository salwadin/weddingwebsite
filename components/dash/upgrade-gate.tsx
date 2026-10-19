import { Sparkles } from "lucide-react";
import { FEATURE_LABELS, PLANS, requiredPlan, type Feature } from "@/lib/plans";
import { ButtonLink } from "@/components/ui";

/** Shown in place of a feature the wedding's plan doesn't include. */
export function UpgradeGate({ feature, canManageBilling, children }: { feature: Feature; canManageBilling: boolean; children?: React.ReactNode }) {
  const plan = PLANS[requiredPlan(feature)];
  return (
    <div className="jali-bg rounded-3xl border border-line px-6 py-14 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft"><Sparkles className="h-5 w-5 text-[#7a5d2f]" /></span>
      <h2 className="mt-4 font-serif text-3xl">{FEATURE_LABELS[feature]} is part of {plan.name}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children ?? plan.tagline}</p>
      {canManageBilling
        ? <ButtonLink href="/dashboard/billing" className="mt-6">See plans</ButtonLink>
        : <p className="mt-6 text-sm text-muted">Ask a wedding administrator to upgrade.</p>}
    </div>
  );
}
