import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { GUEST_COOKIE, ORG_COOKIE, startOrganizerSession } from "@/lib/auth";
import { DEMO_HOUSEHOLDS, DEMO_VENDOR_USER, DEMO_WEDDING_ID } from "@/lib/seed";

/** Demo-only test modes: switch identity in one click. Disable in production by unsetting QUBOOL_DEMO. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  if (process.env.QUBOOL_DEMO === "off") return new NextResponse("Not found", { status: 404 });
  const { mode } = await params;
  const d = db();
  const w = d.weddings.find((x) => x.id === DEMO_WEDDING_ID);
  if (!w) return NextResponse.redirect(new URL("/", req.url));
  const site = new URL(`/w/${w.slug}`, req.url);

  if (mode === "vendor") {
    await startOrganizerSession(DEMO_VENDOR_USER);
    const res = NextResponse.redirect(new URL("/vendor", req.url));
    res.cookies.delete(GUEST_COOKIE);
    return res;
  }
  if (mode === "admin") {
    await startOrganizerSession("usr_ayesha");
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.delete(GUEST_COOKIE);
    return res;
  }
  const hh = ({ nikkah: DEMO_HOUSEHOLDS.nikkahOnly, shaadi: DEMO_HOUSEHOLDS.nikkahShaadi, all: DEMO_HOUSEHOLDS.allEvents } as Record<string, string>)[mode];
  const res = NextResponse.redirect(site);
  res.cookies.delete(ORG_COOKIE);
  if (!hh) { res.cookies.delete(GUEST_COOKIE); return res; } // public visitor
  const t = d.tokens.find((x) => x.householdId === hh && !x.revokedAt);
  if (!t) return res;
  // Go through the real invitation-link flow so the demo exercises the same code path guests use.
  return NextResponse.redirect(new URL(`/i/${t.token}`, req.url), { headers: { "Set-Cookie": `${ORG_COOKIE}=; Path=/; Max-Age=0` } });
}
