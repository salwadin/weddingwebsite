// Pure rules for texting guests. No server-only imports, so tests can check them directly.

/**
 * A US or Canadian mobile number in E.164 (+12145550123), or null. A toll-free
 * sender can only text North America, so anything else is refused up front.
 * Accepts the ways people type numbers: "(214) 555-0123", "214.555.0123", "+1 214 555 0123".
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const n = digits.startsWith("+") ? digits.slice(1) : digits.length === 10 ? `1${digits}` : digits;
  if (!/^\d+$/.test(n)) return null;
  // NANP: country code 1, area code and exchange can't start with 0 or 1.
  return /^1[2-9]\d{2}[2-9]\d{6}$/.test(n) ? `+${n}` : null;
}

/**
 * Numbers the demo must never text: anything in the 555 exchange, which every
 * sample guest and vendor uses (555 numbers aren't assigned to real phones).
 */
export const isDemoPhone = (e164: string) => /^\+1\d{3}555\d{4}$/.test(e164);

export type SmsKind = "invitation" | "save_the_date" | "reminder";
export const SMS_KINDS: SmsKind[] = ["invitation", "save_the_date", "reminder"];

/**
 * The text a guest receives, built from trusted data at send time. Every message names
 * the sender and says how to opt out, as carriers require for toll-free numbers.
 */
export function smsText(kind: SmsKind, o: { partner1: string; partner2: string; household: string; link: string; event?: string }) {
  const couple = `${o.partner1} & ${o.partner2}`;
  const body = kind === "reminder"
    ? `Kind reminder from ${couple}: please RSVP${o.event ? ` for the ${o.event}` : ""} here: ${o.link}`
    : kind === "save_the_date"
      ? `${o.household}, please save the date for the wedding of ${couple}! Details: ${o.link}`
      : `${o.household}, you're invited to the wedding of ${couple}! Your personal invitation: ${o.link}`;
  return `Qubool: ${body}\nReply STOP to opt out.`;
}
