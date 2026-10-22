import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loadDemoSeed } from "@/lib/seed-load";
import { demoEnabled } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/server";

/**
 * Restores the public demo (Ayesha & Omar, the sample vendors, the demo accounts'
 * passwords) to its original state. Visitors edit the demo freely; this runs
 * nightly from Vercel Cron (vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
 * Touches only demo rows: the demo wedding (cascade) and the sample listings.
 */
async function handle(req: Request) {
  if (!demoEnabled()) return Response.json({ enabled: false });
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const given = req.headers.get("authorization") ?? "";
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await loadDemoSeed(adminClient());
  revalidatePath("/", "layout");
  return Response.json({ reset: true, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
