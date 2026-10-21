import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/auth";
import { anonClient } from "@/lib/supabase/server";

/**
 * Personalized invitation link: /i/<token>
 * Validates the (revocable) token, stores it in an httpOnly cookie, and redirects
 * to a clean URL so the token doesn't linger in the address bar or get re-shared.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: slug } = await anonClient().rpc("resolve_invitation", { p_token: token });
  if (!slug) return NextResponse.redirect(new URL("/invite-expired", req.url));
  const to = req.nextUrl.searchParams.get("to") === "rsvp" ? `/w/${slug}/rsvp` : `/w/${slug}`;
  const res = NextResponse.redirect(new URL(to, req.url));
  res.cookies.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180 });
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
