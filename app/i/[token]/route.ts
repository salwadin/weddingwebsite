import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { GUEST_COOKIE, lookupToken, recordTokenUse } from "@/lib/auth";

/**
 * Personalized invitation link: /i/<token>
 * Validates the (revocable) token, stores it in an httpOnly cookie, and redirects
 * to a clean URL so the token doesn't linger in the address bar or get re-shared.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = lookupToken(token);
  const w = t && db().weddings.find((x) => x.id === t.weddingId);
  if (!t || !w) return NextResponse.redirect(new URL("/invite-expired", req.url));
  recordTokenUse(t.token);
  const to = req.nextUrl.searchParams.get("to") === "rsvp" ? `/w/${w.slug}/rsvp` : `/w/${w.slug}`;
  const res = NextResponse.redirect(new URL(to, req.url));
  res.cookies.set(GUEST_COOKIE, t.token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180 });
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
