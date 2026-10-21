import { createHash, timingSafeEqual } from "node:crypto";
import { deliverPending, failStuck } from "@/lib/email/deliver";
import { emailEnabled } from "@/lib/email/resend";
import { adminClient } from "@/lib/supabase/server";

/**
 * Sends pending outbox email that the app didn't send right away: rows that a
 * Resend outage or rate limit put back, and any queued while the server was
 * busy. Call it on a schedule with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends exactly that header; see README → Email).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const given = req.headers.get("authorization") ?? "";
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailEnabled()) return Response.json({ enabled: false, sent: 0 });

  const admin = adminClient();
  const stuck = await failStuck(admin);
  const result = await deliverPending(admin, { origin: new URL(req.url).origin });
  return Response.json({ enabled: true, ...result, stuck });
}

export const GET = handle;
export const POST = handle;
