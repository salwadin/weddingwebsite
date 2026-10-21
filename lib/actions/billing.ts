"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, mutate } from "../db";
import { requireOrg } from "../dashboard";
import { siteUrl } from "../auth";
import { PLAN_ORDER, PLANS } from "../plans";
import { checkoutExpiry, paymentsEnabled, planLineItem, stripe, upgradePrice } from "../stripe";
import { demoEnabled } from "../supabase/env";
import { adminClient } from "../supabase/server";
import type { Plan } from "../types";

/**
 * Buy a plan. Outside demo mode this opens Stripe Checkout (a one-time payment
 * per wedding; upgrading from Plus costs the difference) and the webhook sets
 * the plan once it's paid. Organizers can't write `plan` themselves (column grant).
 *
 * Demo (QUBOOL_DEMO=on): changes the plan immediately with the service role,
 * after the billing permission check, without taking payment.
 */
export async function changePlan(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const w = o.ctx.wedding;
  const plan = String(form.get("plan")) as Plan;
  if (!(plan in PLANS)) return;
  if (demoEnabled()) {
    const { error } = await adminClient().from("weddings").update({ plan, trial_ends_at: null }).eq("id", w.id);
    if (error) throw new Error(error.message);
    await mutate(o, (d) => audit(d, w.id, o.ctx.user.name, "plan_change", `Plan → ${PLANS[plan].name}`));
    revalidatePath("/", "layout");
    redirect(`/dashboard/billing?changed=${plan}`);
  }
  if (!paymentsEnabled()) throw new Error("Online payments aren't available yet.");
  if (plan === "free" || PLAN_ORDER.indexOf(plan) <= PLAN_ORDER.indexOf(w.plan)) return; // plans are paid once; no downgrades

  const meta = { kind: "plan", wedding_id: w.id, plan, from_plan: w.plan, user_id: o.ctx.user.id, actor: o.ctx.user.name };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [planLineItem(plan, w.plan)],
    customer_email: o.ctx.user.email || undefined,
    client_reference_id: w.id,
    metadata: meta,
    payment_intent_data: { metadata: meta, description: `Qubool ${PLANS[plan].name}: ${w.partner1} & ${w.partner2}` },
    success_url: (await siteUrl("/dashboard/billing?checkout=success")) + "&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: await siteUrl("/dashboard/billing?checkout=cancelled"),
    expires_at: checkoutExpiry(),
  });
  const { error } = await adminClient().from("payments").insert({
    wedding_id: w.id, plan, amount: session.amount_total ?? upgradePrice(plan, w.plan) * 100, currency: session.currency ?? "usd",
    stripe_checkout_session_id: session.id, created_by: o.ctx.user.id,
  });
  if (error) throw new Error(error.message);
  redirect(session.url!);
}

export async function saveCustomDomain(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const domain = String(form.get("domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return;
  await mutate(o, (d) => { d.weddings.find((x) => x.id === o.ctx.wedding.id)!.customDomain = domain || undefined; });
  revalidatePath("/dashboard/billing");
}
