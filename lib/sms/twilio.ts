import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A small Twilio client over fetch: send one text, and verify status callbacks.
// Texts go out only when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are
// set. Without them (local dev, most tests) SMS outbox rows stay `pending`.

export const smsEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

export type SendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; retry: boolean; optedOut?: boolean };

/** Twilio error codes worth a plain-language explanation in the outbox. */
const ERRORS: Record<number, string> = {
  21610: "This guest replied STOP to Qubool texts, so they can't be texted.",
  21211: "Not a valid phone number.",
  21408: "Texts can only go to US and Canadian numbers.",
  21612: "Twilio can't reach this number.",
  21614: "This number can't receive texts (it may be a landline).",
};

/**
 * Sends one SMS (POST /Messages.json). `statusCallback` is where Twilio reports
 * delivery (app/api/twilio/status). TWILIO_FROM is the toll-free number in E.164,
 * or a Messaging Service SID (MG…).
 */
export async function sendSms(to: string, body: string, statusCallback: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!, from = process.env.TWILIO_FROM!;
  const base = process.env.TWILIO_API_URL || "https://api.twilio.com";
  const form = new URLSearchParams({ To: to, Body: body, StatusCallback: statusCallback });
  form.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  let res: Response;
  try {
    res = await fetch(`${base}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
  } catch (e) {
    return { ok: false, error: `Twilio unreachable: ${(e as Error).message}`, retry: true };
  }
  const json = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
  if (!res.ok || !json.sid) {
    const code = json.code ?? 0;
    return {
      ok: false, optedOut: code === 21610,
      error: ERRORS[code] ?? `Twilio ${res.status}${code ? ` (${code})` : ""}: ${json.message ?? res.statusText}`,
      // Rate limits and outages are worth retrying; a bad or opted-out number isn't.
      retry: res.status === 429 || res.status >= 500,
    };
  }
  return { ok: true, sid: json.sid };
}

/**
 * Verifies X-Twilio-Signature: base64 HMAC-SHA1, keyed with the auth token, over the
 * full callback URL followed by every POST parameter as name+value, sorted by name.
 */
export function verifyTwilioSignature(url: string, params: URLSearchParams, signature: string | null, token = process.env.TWILIO_AUTH_TOKEN) {
  if (!signature || !token) return false;
  const data = url + [...params.keys()].sort().map((k) => k + params.getAll(k).join("")).join("");
  const expected = createHmac("sha1", token).update(data).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
