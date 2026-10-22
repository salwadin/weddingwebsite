"use server";

import { isDemoEmail } from "../demo";
import { isStaffEmail } from "../staff";
import { redirect } from "next/navigation";
import { homeFor, siteUrl } from "../auth";
import { serverClient } from "../supabase/server";
import type { FormState } from "./site";

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const sb = await serverClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Please confirm your email first. We sent you a link when you signed up." };
    return { error: "Email or password is incorrect." };
  }
  if (isStaffEmail(data.user.email)) redirect("/admin");
  redirect(await homeFor(data.user.id));
}

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (!isEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  const sb = await serverClient();
  const { data, error } = await sb.auth.signUp({
    email, password, options: { data: { name, kind: "couple" }, emailRedirectTo: await siteUrl("/auth/confirm?next=/onboarding") },
  });
  if (error) return { error: error.code === "weak_password" ? "Please choose a stronger password." : "We couldn't create that account. Please try again." };
  if (data.session) redirect("/onboarding"); // only when email confirmation is turned off
  // Same answer whether or not the email already had an account (no enumeration).
  return { ok: true, message: `We've sent a confirmation link to ${email}. Open it to finish creating your account.` };
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Please enter a valid email." };
  if (isDemoEmail(email)) return { error: "Demo accounts can't be reset. Use the demo buttons on the home page instead." };
  const sb = await serverClient();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: await siteUrl("/auth/confirm?next=/reset-password") });
  return { ok: true, message: "If there's an account for that email, we've sent a link to reset your password." };
}

/** Second half of a reset: the email link signed the user in (via /auth/confirm); now set the new password. */
export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "This reset link has expired. Please request a new one." };
  if (isDemoEmail(user.email)) return { error: "The shared demo accounts' passwords can't be changed." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Please choose a password you haven't used here before." : "We couldn't update your password. Please try again." };
  redirect(await homeFor(user.id));
}

export async function logout() {
  const sb = await serverClient();
  await sb.auth.signOut();
  redirect("/");
}
