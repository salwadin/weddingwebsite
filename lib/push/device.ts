import "server-only";
import { cookies } from "next/headers";
import type { Supabase } from "../supabase/server";

// The phone's push token is also kept in an httpOnly cookie (lib/actions/push.ts), so
// signing out can stop notifications to this phone.
export const DEVICE_COOKIE = "qb_device";

/** Call before signing out, with the still-signed-in client: RLS lets people delete only their own phones. */
export async function forgetDevice(sb: Supabase) {
  const store = await cookies();
  const token = store.get(DEVICE_COOKIE)?.value;
  if (!token) return;
  await sb.from("device_tokens").delete().eq("token", token);
  store.delete(DEVICE_COOKIE);
}
