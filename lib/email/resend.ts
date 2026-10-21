import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A small Resend client over fetch: batch sends and webhook verification.
// Email goes out only when RESEND_API_KEY is set. Without it (local dev, most
// tests) outbox rows stay `pending` and nothing leaves the machine.

export const emailEnabled = () => !!process.env.RESEND_API_KEY;

/** The From header: an address on a domain verified in Resend. (resend.dev only delivers to your own Resend account address.) */
export const emailFrom = () => process.env.EMAIL_FROM || "Qubool <onboarding@resend.dev>";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export type BatchResult = { ok: true; ids: string[] } | { ok: false; error: string; retry: boolean };

/**
 * Sends up to 100 emails in one request (POST /emails/batch). The idempotency
 * key makes a retried request return the original result instead of sending twice.
 */
export async function sendBatch(emails: OutgoingEmail[], idempotencyKey: string): Promise<BatchResult> {
  const base = process.env.RESEND_API_URL || "https://api.resend.com";
  const body = emails.map((e) => ({
    from: emailFrom(), to: [e.to], subject: e.subject, html: e.html, text: e.text,
    ...(e.replyTo ? { reply_to: e.replyTo } : {}),
    ...(e.tags ? { tags: Object.entries(e.tags).map(([name, value]) => ({ name, value })) } : {}),
  }));
  let res: Response;
  try {
    res = await fetch(`${base}/emails/batch`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `Resend unreachable: ${(e as Error).message}`, retry: true };
  }
  const json = (await res.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string; name?: string };
  if (!res.ok) {
    // Rate limits and outages are worth retrying; validation errors aren't.
    return { ok: false, error: `Resend ${res.status}: ${json.message ?? json.name ?? res.statusText}`, retry: res.status === 429 || res.status >= 500 };
  }
  const ids = (json.data ?? []).map((d) => d.id);
  if (ids.length !== emails.length) return { ok: false, error: "Resend returned an unexpected response", retry: false };
  return { ok: true, ids };
}

/**
 * Verifies a Resend webhook (Svix scheme): HMAC-SHA256 over `${id}.${timestamp}.${body}`
 * with the base64 secret after `whsec_`, compared against each `v1,<sig>` in svix-signature.
 * Rejects timestamps more than five minutes off, so captured requests can't be replayed.
 */
export function verifyWebhook(body: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("svix-id"), ts = headers.get("svix-timestamp"), sig = headers.get("svix-signature");
  if (!id || !ts || !sig || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sig.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
