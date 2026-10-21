import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";

/**
 * Landing page for links in Supabase Auth emails (sign-up confirmation, password reset).
 * Our email templates (supabase/templates) link here with ?token_hash=…&type=…, which
 * works even when the link is opened on a different device; the default ?code=… (PKCE)
 * form is accepted too.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const sb = await serverClient();

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const { data, error } = tokenHash && type
    ? await sb.auth.verifyOtp({ token_hash: tokenHash, type })
    : code ? await sb.auth.exchangeCodeForSession(code) : { data: { user: null }, error: new Error("missing token") };

  if (error || !data.user) return NextResponse.redirect(new URL("/login?link=expired", req.url));
  const to = type === "recovery" ? "/reset-password" : safeNext ?? await homeFor(data.user.id);
  return NextResponse.redirect(new URL(to, req.url));
}
