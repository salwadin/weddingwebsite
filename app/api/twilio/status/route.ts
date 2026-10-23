import { verifyTwilioSignature } from "@/lib/sms/twilio";
import { adminClient } from "@/lib/supabase/server";

/**
 * Twilio's delivery reports for texts sent by lib/sms/deliver.ts (the StatusCallback
 * on each message). Signed with the auth token; anything unsigned is refused.
 * Twilio reports queued → sent → delivered, or undelivered / failed with an ErrorCode.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const signature = req.headers.get("x-twilio-signature");
  // Twilio signs the exact URL it was given: the site's public URL, which behind a proxy
  // may differ from the URL this request arrived at.
  const urls = [req.url, process.env.NEXT_PUBLIC_SITE_URL && new URL("/api/twilio/status", process.env.NEXT_PUBLIC_SITE_URL).toString()].filter(Boolean) as string[];
  if (!urls.some((u) => verifyTwilioSignature(u, params, signature))) return new Response("Invalid signature", { status: 403 });

  const sid = params.get("MessageSid"), status = params.get("MessageStatus"), code = params.get("ErrorCode");
  if (!sid || !status) return new Response("Missing MessageSid or MessageStatus", { status: 400 });

  const admin = adminClient();
  if (status === "delivered") {
    await admin.from("outbox").update({ status: "delivered", error: null }).eq("provider_id", sid).eq("channel", "sms");
  } else if (status === "undelivered" || status === "failed") {
    // A late failure never overwrites a confirmed delivery.
    await admin.from("outbox").update({ status: "failed", error: `The carrier couldn't deliver this text${code ? ` (error ${code})` : ""}.` })
      .eq("provider_id", sid).eq("channel", "sms").neq("status", "delivered");
  }
  return new Response(null, { status: 204 });
}
