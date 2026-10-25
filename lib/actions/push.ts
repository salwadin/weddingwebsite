"use server";

import { cookies } from "next/headers";
import { inNativeApp } from "../native";
import { DEVICE_COOKIE } from "../push/device";
import { serverClient } from "../supabase/server";

/** Saves this phone's push token, as reported by the app (components/push-prompt.tsx), for the signed-in person. */
export async function registerDevice(token: string, platform: string) {
  if (!(await inNativeApp())) return { error: "Only the Qubool apps receive notifications." };
  if (platform !== "ios" && platform !== "android") return { error: "Unknown platform." };
  const sb = await serverClient();
  const { error } = await sb.rpc("register_device", { p_token: String(token).slice(0, 4096), p_platform: platform });
  if (error) return { error: "Couldn't turn on notifications." };
  (await cookies()).set(DEVICE_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400 });
  return { ok: true };
}
