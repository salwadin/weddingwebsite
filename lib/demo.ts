import "server-only";
import { cookies } from "next/headers";
import { currentUser } from "./auth";
import { DEMO_WEDDING_ID, SEED_USERS } from "./seed";

// The interactive demo (Ayesha & Omar, the sample vendors, the demo vendor portal)
// lives inside the real site but is sealed off from it:
//  - real visitors never see sample listings; demo visitors see them alongside real ones
//  - the demo wedding and demo vendor change plans/tiers instantly, without Stripe
//  - nothing from the demo is ever emailed (lib/email/deliver.ts skips it)
// QUBOOL_DEMO=on makes the demo available at all; it no longer affects real payments.

/** Set by every /demo/* entry point; cleared by /demo/exit. */
export const DEMO_COOKIE = "q_demo";

const DEMO_EMAILS = new Set(SEED_USERS.map((u) => u.email));

export const isDemoEmail = (email: string | null | undefined) => !!email && DEMO_EMAILS.has(email.toLowerCase());
export const isDemoWedding = (weddingId: string | null | undefined) => weddingId === DEMO_WEDDING_ID;

/** Is this visitor exploring the demo (entered through a demo button, or signed in as a demo account)? */
export async function inDemo() {
  if ((await cookies()).get(DEMO_COOKIE)?.value === "1") return true;
  return isDemoEmail((await currentUser())?.email);
}

export const demoCookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 };
