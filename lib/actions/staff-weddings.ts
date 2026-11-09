"use server";

import { revalidatePath } from "next/cache";
import { ROLE_LABELS } from "../access";
import { deliverNow } from "../email/deliver";
import { requireStaff } from "../staff";
import { adminClient } from "../supabase/server";
import type { Role } from "../types";

// Staff managing the people on any wedding (/admin?tab=weddings): the same changes a
// couple's administrator makes in Settings, done with the service role. Every change is
// written to the wedding's audit log as "Qubool support".

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const ROLES = Object.keys(ROLE_LABELS) as Role[];
const ACTOR = "Qubool support";

async function audit(weddingId: string, action: string, detail: string) {
  await adminClient().from("audit_log").insert({ wedding_id: weddingId, actor: ACTOR, action, detail });
}

/** Queue the "you've been invited to help plan" email; its text is rebuilt from the invite at delivery. */
async function sendInviteEmail(weddingId: string, email: string) {
  const admin = adminClient();
  const { data: w } = await admin.from("weddings").select("partner1,partner2").eq("id", weddingId).single();
  await admin.from("outbox").insert({
    wedding_id: weddingId, channel: "email", recipient: email, kind: "collaborator_invite", body: "",
    subject: `You're invited to help plan ${w?.partner1} & ${w?.partner2}'s wedding`,
  });
  await deliverNow({ weddingId, kind: "collaborator_invite" });
}

/** Add someone to a wedding: an existing account joins right away, anyone else gets a held invitation. */
export async function staffAddPerson(form: FormData) {
  await requireStaff();
  const weddingId = str(form, "weddingId", 40), email = str(form, "email", 200).toLowerCase();
  const role = str(form, "role") as Role, relationship = str(form, "relationship", 80) || null;
  if (!weddingId || !isEmail(email) || !ROLES.includes(role)) return;
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email.replace(/[\\%_]/g, (m) => `\\${m}`)).maybeSingle();
  if (profile) {
    const { error } = await admin.from("wedding_collaborators")
      .upsert({ wedding_id: weddingId, user_id: profile.id, role, relationship }, { onConflict: "wedding_id,user_id" });
    if (error) throw new Error(error.message);
  } else {
    // The email names the wedding's first administrator as the inviter.
    const { data: owner } = await admin.from("wedding_collaborators").select("user_id").eq("wedding_id", weddingId).eq("role", "admin")
      .order("invited_at").limit(1).maybeSingle();
    const { error } = await admin.from("collaborator_invites").upsert(
      { wedding_id: weddingId, email, name: str(form, "name", 80) || null, role, relationship, invited_by: owner?.user_id ?? null },
      { onConflict: "wedding_id,email" });
    if (error) throw new Error(error.message);
  }
  await audit(weddingId, "collaborator_invite", `${email} as ${role}`);
  await sendInviteEmail(weddingId, email);
  revalidatePath("/admin");
}

/** Change a collaborator's role, or remove them. A wedding always keeps at least one full administrator. */
export async function staffUpdatePerson(op: "role" | "remove", form: FormData) {
  await requireStaff();
  const id = str(form, "id", 40), role = str(form, "role") as Role;
  const admin = adminClient();
  const { data: c } = await admin.from("wedding_collaborators").select("wedding_id,role,user_id").eq("id", id).maybeSingle();
  if (!c) return;
  if (c.role === "admin" && (op === "remove" || role !== "admin")) {
    const { count } = await admin.from("wedding_collaborators").select("id", { count: "exact", head: true }).eq("wedding_id", c.wedding_id).eq("role", "admin");
    if ((count ?? 0) <= 1) return; // the last administrator stays
  }
  const { data: p } = await admin.from("profiles").select("email").eq("id", c.user_id).maybeSingle();
  if (op === "remove") {
    await admin.from("wedding_collaborators").delete().eq("id", id);
    await audit(c.wedding_id, "collaborator_remove", p?.email ?? "");
  } else if (ROLES.includes(role)) {
    await admin.from("wedding_collaborators").update({ role }).eq("id", id);
    await audit(c.wedding_id, "collaborator_role", `${p?.email ?? ""} → ${role}`);
  }
  revalidatePath("/admin");
}

/** A held invitation: send the email again, or cancel it. */
export async function staffInvite(op: "resend" | "cancel", form: FormData) {
  await requireStaff();
  const admin = adminClient();
  const { data: inv } = await admin.from("collaborator_invites").select("id,wedding_id,email").eq("id", str(form, "id", 40)).maybeSingle();
  if (!inv) return;
  if (op === "cancel") {
    await admin.from("collaborator_invites").delete().eq("id", inv.id);
    await audit(inv.wedding_id, "collaborator_invite_cancel", inv.email);
  } else {
    await sendInviteEmail(inv.wedding_id, inv.email);
  }
  revalidatePath("/admin");
}
