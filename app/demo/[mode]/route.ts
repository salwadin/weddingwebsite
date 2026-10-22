import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/auth";
import { DEMO_ADMIN_EMAIL, DEMO_HOUSEHOLDS, DEMO_PASSWORD, DEMO_VENDOR_EMAIL, DEMO_WEDDING_ID } from "@/lib/seed";
import { demoEnabled } from "@/lib/supabase/env";
import { adminClient, serverClient } from "@/lib/supabase/server";
import { deriveToken } from "@/lib/tokens";
import { DEMO_COOKIE, demoCookieOptions } from "@/lib/demo";

/** Every demo entry marks the visitor as exploring the demo (sample vendors become visible). */
const inDemo = (res: NextResponse) => { res.cookies.set(DEMO_COOKIE, "1", demoCookieOptions); return res; };

/** Demo-only test modes: switch identity in one click. Enabled only with QUBOOL_DEMO=on. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  if (!demoEnabled()) return new NextResponse("Not found", { status: 404 });
  const { mode } = await params;
  const admin = adminClient();
  const { data: w } = await admin.from("weddings").select("slug").eq("id", DEMO_WEDDING_ID).maybeSingle();
  if (!w) return NextResponse.redirect(new URL("/?demo=not-seeded", req.url));

  // Just browse the sample marketplace, without changing who you're signed in as.
  if (mode === "marketplace") return inDemo(NextResponse.redirect(new URL("/marketplace", req.url)));

  // Organizer and vendor modes sign in to a real seeded account through Supabase Auth.
  const sb = await serverClient();
  if (mode === "admin" || mode === "vendor") {
    const { error } = await sb.auth.signInWithPassword({ email: mode === "admin" ? DEMO_ADMIN_EMAIL : DEMO_VENDOR_EMAIL, password: DEMO_PASSWORD });
    if (error) return NextResponse.redirect(new URL("/login", req.url));
    const res = NextResponse.redirect(new URL(mode === "admin" ? "/dashboard" : "/vendor", req.url));
    res.cookies.delete(GUEST_COOKIE);
    return inDemo(res);
  }

  // Guest modes: sign out, then follow the household's real invitation link.
  await sb.auth.signOut();
  const hh = ({ nikkah: DEMO_HOUSEHOLDS.nikkahOnly, shaadi: DEMO_HOUSEHOLDS.nikkahShaadi, all: DEMO_HOUSEHOLDS.allEvents } as Record<string, string>)[mode];
  const site = new URL(`/w/${w.slug}`, req.url);
  if (!hh) { const res = NextResponse.redirect(site); res.cookies.delete(GUEST_COOKIE); return inDemo(res); } // public visitor
  const { data: t } = await admin.from("invitation_tokens").select("id").eq("household_id", hh).is("revoked_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!t) { const res = NextResponse.redirect(site); res.cookies.delete(GUEST_COOKIE); return inDemo(res); }
  // Go through the real invitation-link flow so the demo exercises the same code path guests use.
  return inDemo(NextResponse.redirect(new URL(`/i/${deriveToken(t.id)}`, req.url)));
}
