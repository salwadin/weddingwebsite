"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, mutate } from "../db";
import { requireOrg } from "../dashboard";
import { PLANS } from "../plans";
import type { Plan } from "../types";

/**
 * Demo only: changes the wedding's plan immediately, without taking payment.
 * In production this would create a Stripe Checkout session and update the plan
 * from the payment webhook instead.
 */
export async function changePlan(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const plan = String(form.get("plan")) as Plan;
  if (!(plan in PLANS)) return;
  mutate((d) => {
    const w = d.weddings.find((x) => x.id === o.ctx.wedding.id)!;
    w.plan = plan;
    w.trialEndsAt = undefined;
    audit(d, w.id, o.ctx.user.name, "plan_change", `Plan → ${PLANS[plan].name}`);
  });
  revalidatePath("/", "layout");
  redirect(`/dashboard/billing?changed=${plan}`);
}

export async function saveCustomDomain(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const domain = String(form.get("domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return;
  mutate((d) => { d.weddings.find((x) => x.id === o.ctx.wedding.id)!.customDomain = domain || undefined; });
  revalidatePath("/dashboard/billing");
}
