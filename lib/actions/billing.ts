"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, mutate } from "../db";
import { requireOrg } from "../dashboard";
import { PLANS } from "../plans";
import { demoEnabled } from "../supabase/env";
import { adminClient } from "../supabase/server";
import type { Plan } from "../types";

/**
 * Demo only (QUBOOL_DEMO=on): changes the wedding's plan immediately, without taking payment.
 * Organizers can't write `plan` themselves (column grant), so this uses the service role
 * after the billing permission check. In production a Stripe Checkout session and its
 * webhook will do this instead.
 */
export async function changePlan(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const plan = String(form.get("plan")) as Plan;
  if (!(plan in PLANS)) return;
  if (!demoEnabled()) throw new Error("Online payments aren't available yet.");
  const { error } = await adminClient().from("weddings").update({ plan, trial_ends_at: null }).eq("id", o.ctx.wedding.id);
  if (error) throw new Error(error.message);
  await mutate(o, (d) => audit(d, o.ctx.wedding.id, o.ctx.user.name, "plan_change", `Plan → ${PLANS[plan].name}`));
  revalidatePath("/", "layout");
  redirect(`/dashboard/billing?changed=${plan}`);
}

export async function saveCustomDomain(form: FormData) {
  const o = await requireOrg("billing", "edit");
  const domain = String(form.get("domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return;
  await mutate(o, (d) => { d.weddings.find((x) => x.id === o.ctx.wedding.id)!.customDomain = domain || undefined; });
  revalidatePath("/dashboard/billing");
}
