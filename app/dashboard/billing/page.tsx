import { requireOrg } from "@/lib/dashboard";
import { changePlan, saveCustomDomain } from "@/lib/actions/billing";
import { hasFeature, PLAN_ORDER, PLANS, trialDaysLeft } from "@/lib/plans";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  const o = await requireOrg("billing");
  const w = o.ctx.wedding;
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

      <PlanCards current={w.plan} action={(p) => w.plan === p
        ? <Button className="w-full" variant="secondary" disabled>Current plan</Button>
        : (
          <form action={changePlan}><input type="hidden" name="plan" value={p} />
            <Button className="w-full" variant={PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(w.plan) ? "primary" : "outline"}>
              {PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(w.plan) ? `Upgrade to ${PLANS[p].name}` : `Switch to ${PLANS[p].name}`}
            </Button>
          </form>
        )} />
      <p className="mt-4 text-center text-xs text-muted">Demo: plan changes apply instantly and nothing is charged. A live version would use a payment provider such as Stripe Checkout.</p>
    </>
  );
}
