import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/auth";
import { DEMO_COOKIE, isDemoEmail } from "@/lib/demo";
import { serverClient } from "@/lib/supabase/server";

/** Leave the demo: forget the demo marker and guest link, and sign out of a demo account. */
export async function GET(req: NextRequest) {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (isDemoEmail(user?.email)) await sb.auth.signOut();
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete(DEMO_COOKIE);
  res.cookies.delete(GUEST_COOKIE);
  return res;
}
