import "server-only";
import { notFound } from "next/navigation";
import { currentUser } from "./auth";

// Qubool staff: the people who review Founding Vendor and Beta applications at /admin.
// Set QUBOOL_STAFF_EMAILS to a comma-separated list of account emails (in Vercel).
// Staff must sign in with a verified account using one of those emails.

export const isStaffEmail = (email: string | null | undefined) => !!email && staffEmails().has(email.toLowerCase());

const staffEmails = () => new Set((process.env.QUBOOL_STAFF_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));

export async function staffUser() {
  const user = await currentUser();
  return user && staffEmails().has(user.email.toLowerCase()) ? user : null;
}

/** For /admin pages and actions. Anyone else gets a 404, so the page's existence isn't revealed. */
export async function requireStaff() {
  const user = await staffUser();
  if (!user) notFound();
  return user;
}
