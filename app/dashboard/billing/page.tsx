import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/dashboard";
import { changePlan, saveCustomDomain } from "@/lib/actions/billing";
import { confirmCheckout } from "@/lib/payments";
import { hasFeature, PLAN_ORDER, PLANS, trialDaysLeft } from "@/lib/plans";
import { paymentsEnabled, upgradePrice } from "@/lib/stripe";
import { demoEnabled } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";

const money = (cents: number, currency = "usd") => (cents / 100).toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 });

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ changed?: string; checkout?: string; session_id?: string }> }) {
  const { changed, checkout, session_id } = await searchParams;
  const o = await requireOrg("billing");
  const w = o.ctx.wedding;
  const demo = demoEnabled(), live = !demo && paymentsEnabled();
  // Back from Stripe Checkout: apply the payment now rather than waiting for the webhook.
  if (session_id && live) {
    const plan = await confirmCheckout(adminClient(), session_id, { wedding_id: w.id });
    if (plan) redirect(`/dashboard/billing?changed=${plan}`);
  }
  const { data: payments } = await o.sb.from("payments").select("plan,amount,currency,status,created_at,paid_at")
    .eq("wedding_id", w.id).order("created_at", { ascending: false }).limit(20);
  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const pending = (payments ?? []).find((p) => p.status === "pending" && Date.now() - new Date(p.created_at).getTime() < 60 * 60 * 1000);
  const trial = trialDaysLeft(w);
  const limits = PLANS[o.plan];
  const events = o.d.events.filter((e) => e.weddingId === w.id).length;
  const hh = new Set(o.d.households.filter((h) => h.weddingId === w.id).map((h) => h.id));
  const guests = o.d.guests.filter((g) => hh.has(g.householdId)).length;
  const meter = (used: number, max: number) => (max === Infinity ? 5 : (used / max) * 100);

  return (
    <>
      <PageHeader title="Plan & Billing" description="One payment covers the whole wedding: every event, every guest, every collaborator." />
      {changed && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">You&apos;re now on {PLANS[changed as keyof typeof PLANS]?.name}.</p>}
      {checkout === "success" && !changed && (
        <p className="mb-4 rounded-xl bg-gold-soft/40 px-4 py-2.5 text-sm">
          <meta httpEquiv="refresh" content="5" />
          Thank you! We&apos;re confirming your payment with Stripe. This page refreshes in a few seconds.
        </p>
      )}
      {checkout === "cancelled" && <p className="mb-4 rounded-xl bg-cream px-4 py-2.5 text-sm">Checkout cancelled. You haven&apos;t been charged.</p>}
      {pending && checkout !== "success" && (
        <p className="mb-4 rounded-xl bg-cream px-4 py-2.5 text-sm">A payment for {PLANS[pending.plan as Plan].name} was started but hasn&apos;t completed yet. If you closed the checkout page, you can start again below.</p>
      )}

      <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.1em] text-muted">Current plan</p>
          <p className="mt-1 font-serif text-4xl">{PLANS[w.plan].name}</p>
          {trial > 0 && <Badge tone="gold" className="mt-2">Free trial: all Signature features for {trial} more {trial === 1 ? "day" : "days"}</Badge>}
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <div className="mb-1 flex justify-between"><span>Events</span><span className="text-muted">{events} of {limits.maxEvents === Infinity ? "unlimited" : limits.maxEvents}</span></div>
              <Progress value={meter(events, limits.maxEvents)} tone={events > limits.maxEvents ? "rose" : "gold"} />
            </div>
            <div>
              <div className="mb-1 flex justify-between"><span>Guests</span><span className="text-muted">{guests} of {limits.maxGuests === Infinity ? "unlimited" : limits.maxGuests.toLocaleString()}</span></div>
              <Progress value={meter(guests, limits.maxGuests)} tone={guests > limits.maxGuests ? "rose" : "gold"} />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Custom domain" description="Use your own address, like ayeshaandomar.com, for your wedding website." />
          <div className="p-5">
            {hasFeature(o.plan, "custom_domain") ? (
              <form action={saveCustomDomain} className="space-y-3">
                <Input name="domain" defaultValue={w.customDomain ?? ""} placeholder="ayeshaandomar.com" aria-label="Custom domain" />
                <Button size="sm" variant="outline">Save domain</Button>
                {w.customDomain && (
                  <p className="text-xs text-muted">Point <code className="rounded bg-cream px-1">{w.customDomain}</code> to your host with a CNAME record. On Vercel, also add it under Project → Settings → Domains.</p>
                )}
              </form>
            ) : <p className="text-sm text-muted">Available on Signature.</p>}
          </div>
        </Card>
      </div>

      <PlanCards current={w.plan} action={(p) => {
        const up = PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(w.plan);
        if (w.plan === p) return <Button className="w-full" variant="secondary" disabled>Current plan</Button>;
        if (!demo && !up) return <Button className="w-full" variant="secondary" disabled>Included in {PLANS[w.plan].name}</Button>;
        return (
          <form action={changePlan}><input type="hidden" name="plan" value={p} />
            <Button className="w-full" variant={up ? "primary" : "outline"} disabled={!demo && !live}>
              {!up ? `Switch to ${PLANS[p].name}` : demo || w.plan === "free" ? `Upgrade to ${PLANS[p].name}` : `Upgrade to ${PLANS[p].name} for $${upgradePrice(p, w.plan)}`}
            </Button>
          </form>
        );
      }} />
      {demo && <p className="mt-4 text-center text-xs text-muted">Demo: plan changes apply instantly and nothing is charged.</p>}
      {live && <p className="mt-4 text-center text-xs text-muted">One-time payment, securely processed by Stripe. Upgrading from Plus to Signature costs the difference.</p>}
      {!demo && !live && <p className="mt-4 text-center text-xs text-muted">Online payments aren&apos;t available yet. Please check back soon.</p>}

      {paid.length > 0 && (
        <Card className="mt-8">
          <CardHeader title="Payments" description="Stripe emails a receipt for each payment." />
          <ul className="divide-y divide-line/70 text-sm">
            {paid.map((p) => (
              <li key={p.paid_at} className="flex justify-between px-5 py-3">
                <span>{PLANS[p.plan as Plan].name}</span>
                <span className="text-muted">{new Date(p.paid_at!).toLocaleDateString()} · {money(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
