"use server";

import { redirect } from "next/navigation";
import { db, mutate, uid } from "../db";
import { endOrganizerSession, startOrganizerSession, verifyPassword } from "../auth";
import { hashPassword } from "../seed";
import type { FormState } from "./site";

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db().users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) return { error: "Email or password is incorrect." };
  await startOrganizerSession(user.id);
  if (user.kind === "vendor") redirect("/vendor");
  const hasWedding = db().collaborators.some((c) => c.userId === user.id);
  redirect(hasWedding ? "/dashboard" : "/onboarding");
}

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Please choose a password with at least 8 characters." };
  if (db().users.some((u) => u.email === email)) return { error: "An account with this email already exists. Try signing in." };
  const id = uid("usr");
  mutate((d) => d.users.push({ id, email, name, passwordHash: hashPassword(password), createdAt: new Date().toISOString() }));
  await startOrganizerSession(id);
  redirect("/onboarding");
}

export async function logout() {
  await endOrganizerSession();
  redirect("/");
}
