import { verifyWebhook } from "@/lib/email/resend";
import { adminClient } from "@/lib/supabase/server";

type ResendEvent = { type: string; data?: { email_id?: string; bounce?: { type?: string; subType?: string; message?: string } } };

// Resend event → outbox status. Later states only move forward (a late
// "delivered" never clears a bounce).
const STATUS: Record<string, { status: string; from: string[] }> = {
  "email.delivered": { status: "delivered", from: ["sending", "sent"] },
  "email.bounced": { status: "bounced", from: ["sending", "sent", "delivered"] },
  "email.complained": { status: "complained", from: ["sending", "sent", "delivered"] },
  "email.failed": { status: "failed", from: ["sending", "sent"] },
};

/**
 * Resend webhook (Resend → Webhooks → add endpoint `/api/resend/webhook`, events
 * email.delivered, email.bounced, email.complained, email.failed). Verifies the
 * Svix signature, updates the outbox row, and marks a bounced household as
 * `bounced` so the guest list shows the address needs fixing. Idempotent:
 * redeliveries set the same values again.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "RESEND_WEBHOOK_SECRET is not set" }, { status: 503 });
  const body = await req.text();
  if (!verifyWebhook(body, req.headers, secret)) return Response.json({ error: "Invalid signature" }, { status: 400 });

  let event: ResendEvent;
  try { event = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const change = STATUS[event.type];
  const emailId = event.data?.email_id;
  if (!change || !emailId) return Response.json({ received: true, ignored: true });

  const admin = adminClient();
  const bounce = event.data?.bounce;
  const patch: Record<string, unknown> = { status: change.status };
  if (bounce) patch.error = [bounce.type, bounce.subType, bounce.message].filter(Boolean).join(" · ").slice(0, 500);
  const { error } = await admin.from("outbox").update(patch).eq("provider_id", emailId).in("status", change.from);
  if (error) return Response.json({ error: "Database unavailable" }, { status: 500 });

  if (change.status === "bounced") {
    // Looked up separately from the update above, so a retry after a failure here still applies it.
    const { data: row } = await admin.from("outbox").select("household_id").eq("provider_id", emailId).maybeSingle();
    if (row?.household_id) {
      const { error: he } = await admin.from("households").update({ delivery_status: "bounced" }).eq("id", row.household_id);
      if (he) return Response.json({ error: "Database unavailable" }, { status: 500 });
    }
  }
  return Response.json({ received: true });
}
