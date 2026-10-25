"use server";

import { redirect } from "next/navigation";
import { currentUser } from "../auth";
import { deleteAccount as deleteEverything } from "../account";
import { isDemoEmail } from "../demo";
import { adminClient, serverClient } from "../supabase/server";
import type { FormState } from "./site";

/** The word people type to confirm (components/delete-account.tsx asks for the same). */
const CONFIRM_WORD = "DELETE";

export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (isDemoEmail(user.email)) return { error: "The shared demo accounts can't be deleted. Create your own account to try this." };
  if (String(form.get("confirm") ?? "").trim() !== CONFIRM_WORD) return { error: `Please type ${CONFIRM_WORD} to confirm.` };
  try {
    await deleteEverything(adminClient(), user.id, user.email);
  } catch (e) {
    console.error("Account deletion failed", user.id, e);
    return { error: "We couldn't delete your account just now, and nothing has been removed from it. Please try again, or email us." };
  }
  // The auth user is gone; clear this browser's session cookies too.
  await (await serverClient()).auth.signOut().catch(() => null);
  redirect("/account-deleted");
}
