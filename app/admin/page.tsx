import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { reviewBetaApplication, reviewVendorApplication } from "@/lib/actions/programs";
import { cn, shortDate } from "@/lib/format";
import { TRADITION_LABELS } from "@/lib/marketplace";
import { FOUNDING_SPOTS } from "@/lib/programs";
import { requireStaff } from "@/lib/staff";
import { adminClient } from "@/lib/supabase/server";
import { Badge, Card, Logo, Stat, Textarea } from "@/components/ui";
import { PendingButton } from "@/components/pending-button";

export const metadata = { title: "Qubool admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = { tab?: string; status?: string };

const VENDOR_STATUS = ["pending", "approved", "waitlisted", "declined"] as const;
const BETA_STATUS = ["new", "invited", "joined", "declined"] as const;
const tone = (s: string) => (s === "approved" || s === "joined" ? "sage" : s === "invited" ? "gold" : s === "declined" ? "rose" : "outline") as "sage" | "gold" | "rose" | "outline";
const traditions = (t: string[]) => t.map((x) => TRADITION_LABELS[x] ?? x).join(", ");
const linkOf = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);

export default async function Admin({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const tab = sp.tab === "beta" ? "beta" : "vendors";
  const admin = adminClient();
  const [{ data: vendors }, { data: beta }] = await Promise.all([
    admin.from("vendor_applications").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("beta_applications").select("*").order("created_at", { ascending: false }).limit(2000),
  ]);
  const v = vendors ?? [], b = beta ?? [];
  const founding = v.filter((x) => x.founding_number).length;
  const status = sp.status ?? (tab === "vendors" ? "pending" : "new");
  const rows = (tab === "vendors" ? v : b).filter((x) => status === "all" || x.status === status);
  const counts = (list: { status: string }[], s: string) => list.filter((x) => x.status === s).length;
  const q = (p: SP) => `/admin?${new URLSearchParams({ tab, ...p } as Record<string, string>)}`;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3"><Link href="/"><Logo className="text-xl" /></Link><Badge tone="ink">Staff</Badge></div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden sm:inline">{staff.email}</span>
            <form action={logout}><button className="flex items-center gap-1 text-xs hover:text-ink"><LogOut className="h-3.5 w-3.5" />Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="font-serif text-4xl">Applications</h1>
        <Card className="mt-5 grid grid-cols-2 gap-6 p-5 md:grid-cols-4">
          <Stat label="Vendor applications" value={v.length} sub={`${counts(v, "pending")} waiting for review`} tone="gold" />
          <Stat label="Founding spots" value={`${founding}/${FOUNDING_SPOTS}`} sub={`${FOUNDING_SPOTS - founding} left`} tone="sage" />
          <Stat label="Beta applicants" value={b.length} sub={`${counts(b, "new")} new`} tone="gold" />
          <Stat label="Beta members" value={counts(b, "joined")} sub={`${counts(b, "invited")} invited, not joined yet`} tone="sage" />
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full bg-cream p-1 text-sm">
            {(["vendors", "beta"] as const).map((t) => (
              <Link key={t} href={`/admin?tab=${t}`} className={cn("rounded-full px-4 py-1.5", tab === t ? "bg-white shadow-sm" : "text-muted")}>{t === "vendors" ? "Founding vendors" : "Beta"}</Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 text-sm">
            {[...(tab === "vendors" ? VENDOR_STATUS : BETA_STATUS), "all"].map((s) => (
              <Link key={s} href={q({ status: s })} className={cn("rounded-full border px-3 py-1 capitalize", status === s ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>
                {s} {s !== "all" && <span className="opacity-60">{counts(tab === "vendors" ? v : b, s)}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {rows.length === 0 && <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">Nothing here.</p>}
          {tab === "vendors" && rows.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-2xl leading-tight">{a.business_name}</p>
                  <p className="text-sm text-muted">{a.category} · {a.city}{a.region ? `, ${a.region}` : ""} · applied {shortDate(String(a.created_at).slice(0, 10))}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.founding_number && <Badge tone="gold">Founding #{a.founding_number}</Badge>}
                  <Badge tone={tone(a.status)}>{a.status}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <p><span className="text-muted">Contact:</span> {a.contact_name} · <a className="underline" href={`mailto:${a.email}`}>{a.email}</a>{a.phone ? ` · ${a.phone}` : ""}</p>
                {a.instagram && <p><span className="text-muted">Instagram:</span> <a className="underline" href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer">@{a.instagram}</a></p>}
                {a.website && <p className="truncate"><span className="text-muted">Website:</span> <a className="underline" href={linkOf(a.website)} target="_blank" rel="noreferrer">{a.website}</a></p>}
                {a.traditions?.length > 0 && <p><span className="text-muted">Traditions:</span> {traditions(a.traditions)}</p>}
              </div>
              {a.portfolio_urls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {a.portfolio_urls.map((u: string, i: number) => <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 hover:bg-cream"><ExternalLink className="h-3 w-3" />Portfolio {i + 1}</a>)}
                </div>
              )}
              {a.about && <p className="mt-3 whitespace-pre-line rounded-xl bg-cream/50 p-3 text-sm">{a.about}</p>}
              <form action={reviewVendorApplication.bind(null, "notes")} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="id" value={a.id} />
                <Textarea name="staff_notes" rows={1} defaultValue={a.staff_notes ?? ""} placeholder="Private notes" aria-label="Private notes" />
                <div className="flex flex-wrap items-start gap-1.5">
                  {a.status !== "approved" && <PendingButton size="sm" formAction={reviewVendorApplication.bind(null, "approve")} pendingLabel="Approving…">{founding < FOUNDING_SPOTS ? "Approve · founding" : "Approve"}</PendingButton>}
                  {a.status === "pending" && <PendingButton size="sm" variant="outline" formAction={reviewVendorApplication.bind(null, "waitlist")} pendingLabel="Saving…">Waitlist</PendingButton>}
                  {a.status !== "declined" && a.status !== "approved" && <PendingButton size="sm" variant="danger" formAction={reviewVendorApplication.bind(null, "decline")} pendingLabel="Declining…">Decline</PendingButton>}
                  {(a.status === "declined" || a.status === "waitlisted") && <PendingButton size="sm" variant="ghost" formAction={reviewVendorApplication.bind(null, "reopen")} pendingLabel="Reopening…">Reopen</PendingButton>}
                  <PendingButton size="sm" variant="ghost" formAction={reviewVendorApplication.bind(null, "notes")} pendingLabel="Saving…">Save notes</PendingButton>
                </div>
              </form>
              {a.reviewed_by && <p className="mt-2 text-[11px] text-muted">Reviewed by {a.reviewed_by}{a.reviewed_at ? ` on ${shortDate(String(a.reviewed_at).slice(0, 10))}` : ""}</p>}
            </Card>
          ))}

          {tab === "beta" && rows.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-2xl leading-tight">{a.name}{a.partner_name ? ` & ${a.partner_name}` : ""}{a.company ? ` · ${a.company}` : ""}</p>
                  <p className="text-sm text-muted">
                    {a.kind === "planner" ? "Planner" : "Couple"}{a.city ? ` · ${a.city}` : ""}
                    {a.event_date ? ` · ${a.kind === "planner" ? "next event" : "wedding"} ${shortDate(a.event_date)}` : ""}
                    {a.guest_count ? ` · ${a.guest_count} guests` : ""}{a.weddings_per_year ? ` · ${a.weddings_per_year} weddings/yr` : ""}
                  </p>
                </div>
                <Badge tone={tone(a.status)}>{a.status}</Badge>
              </div>
              <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <p><a className="underline" href={`mailto:${a.email}`}>{a.email}</a>{a.phone ? ` · ${a.phone}` : ""}</p>
                {a.events?.length > 0 && <p><span className="text-muted">Events:</span> {a.events.join(", ")}</p>}
                {a.traditions?.length > 0 && <p><span className="text-muted">Traditions:</span> {traditions(a.traditions)}</p>}
                {a.heard_from && <p><span className="text-muted">Heard from:</span> {a.heard_from}</p>}
              </div>
              {a.features?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{a.features.map((f: string) => <Badge key={f}>{f}</Badge>)}</div>}
              {a.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-cream/50 p-3 text-sm">{a.notes}</p>}
              <form action={reviewBetaApplication.bind(null, "notes")} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="id" value={a.id} />
                <Textarea name="staff_notes" rows={1} defaultValue={a.staff_notes ?? ""} placeholder="Private notes" aria-label="Private notes" />
                <div className="flex flex-wrap items-start gap-1.5">
                  {(a.status === "new" || a.status === "declined") && <PendingButton size="sm" formAction={reviewBetaApplication.bind(null, "invite")} pendingLabel="Sending…">Invite</PendingButton>}
                  {a.status === "invited" && <PendingButton size="sm" variant="outline" formAction={reviewBetaApplication.bind(null, "invite")} pendingLabel="Sending…">Resend invite</PendingButton>}
                  {a.status === "new" && <PendingButton size="sm" variant="danger" formAction={reviewBetaApplication.bind(null, "decline")} pendingLabel="Declining…">Decline</PendingButton>}
                  {a.status === "declined" && <PendingButton size="sm" variant="ghost" formAction={reviewBetaApplication.bind(null, "reopen")} pendingLabel="Reopening…">Reopen</PendingButton>}
                  <PendingButton size="sm" variant="ghost" formAction={reviewBetaApplication.bind(null, "notes")} pendingLabel="Saving…">Save notes</PendingButton>
                </div>
              </form>
              {a.invited_at && <p className="mt-2 text-[11px] text-muted">Invited {shortDate(String(a.invited_at).slice(0, 10))}{a.joined_at ? ` · joined ${shortDate(String(a.joined_at).slice(0, 10))}` : ""}</p>}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
