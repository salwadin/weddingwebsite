import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loadDemoSeed } from "@/lib/seed-load";
import { demoEnabled } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/server";

/**
 * Daily housekeeping, run by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`:
 *  - Founding Vendors whose free Featured year has ended go back to Basic (unless they subscribe).
 *  - The public demo is restored to its original state (when QUBOOL_DEMO=on).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(digest(req.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: expired, error } = await admin.rpc("expire_founding_listings");
  if (error) console.error("expire_founding_listings:", error.message);
  let demoReset = false;
  if (demoEnabled()) { await loadDemoSeed(admin); demoReset = true; }
  revalidatePath("/", "layout");
  return Response.json({ foundingExpired: expired ?? 0, demoReset, at: new Date().toISOString() });
}
