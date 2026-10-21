import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ExternalLink, LogOut } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { publishedListings } from "@/lib/listings";
import { fromRow } from "@/lib/rows";
import { serverClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { changeListingTier, setInquiryStatus, updateListing } from "@/lib/actions/marketplace";
import { cn, shortDate } from "@/lib/format";
import { CATEGORIES, TRADITION_LABELS, VENDOR_TAGS } from "@/lib/marketplace";
import { LISTING_TIERS } from "@/lib/plans";
import type { ListingTier } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Logo, Select, Stat, Textarea } from "@/components/ui";
import { DemoBar } from "@/components/demo-bar";
import { DEMO_VENDOR_EMAIL } from "@/lib/seed";

export const metadata = { title: "Vendor portal" };

export default async function VendorPortal({ searchParams }: { searchParams: Promise<{ welcome?: string; saved?: string; tier?: string; show?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.kind !== "vendor") redirect("/dashboard");
  const sb = await serverClient();
  const { data: mine } = await sb.from("listings").select("*").eq("owner_user_id", user.id).limit(1).maybeSingle();
  if (!mine) redirect("/for-vendors");
  const l = fromRow("listings", mine);
  const { data: inq } = await sb.from("inquiries").select("*").eq("listing_id", l.id).order("created_at", { ascending: false }).limit(500);
  const all = (inq ?? []).map((r) => fromRow("inquiries", r));
  const show = sp.show ?? "open";
  const inquiries = all.filter((q) => show === "all" || (show === "open" ? q.status === "new" || q.status === "replied" : q.status === show));
  const booked = all.filter((q) => q.status === "booked").length;
  const rank = (await publishedListings()).filter((x) => x.published && x.category === l.category).sort((a, b) => ({ spotlight: 0, featured: 1, basic: 2 })[a.tier] - ({ spotlight: 0, featured: 1, basic: 2 })[b.tier] || b.rating - a.rating).findIndex((x) => x.id === l.id) + 1;

  return (
    <div className="min-h-screen pb-28">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/"><Logo className="text-xl" /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.name}</span>
            <Badge tone="gold">Vendor</Badge>
            <form action={logout}><button className="flex items-center gap-1 text-xs text-muted hover:text-ink"><LogOut className="h-3.5 w-3.5" />Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        {sp.welcome && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Welcome! Add photos and a description below, then publish your listing.</p>}
        {sp.saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Listing saved.</p>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl">{l.name}</h1>
            <p className="text-sm text-muted">{l.category} · {l.city} · {l.published ? "Published" : "Not published yet"}</p>
          </div>
          <Link href={`/marketplace/${l.id}`} target="_blank" className="flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm hover:bg-cream"><ExternalLink className="h-3.5 w-3.5" />View listing</Link>
        </div>

        <Card className="mt-6 grid grid-cols-2 gap-6 p-5 md:grid-cols-4">
          <Stat label="Profile views" value={l.views.toLocaleString()} />
          <Stat label="Inquiries" value={all.length} sub={`${all.filter((q) => q.status === "new").length} new`} tone="gold" />
          <Stat label="Booked" value={booked} tone="sage" />
          <Stat label={`Rank in ${l.category}`} value={l.published ? `#${rank}` : "—"} sub={LISTING_TIERS[l.tier].name} />
        </Card>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader title="Inquiries" action={
              <div className="flex gap-1 text-xs">{["open", "booked", "closed", "all"].map((k) => <Link key={k} href={`/vendor?show=${k}`} className={cn("rounded-full px-2.5 py-1 capitalize", show === k ? "bg-ink text-ivory" : "hover:bg-cream")}>{k}</Link>)}</div>} />
            <ul className="divide-y divide-line/70">
              {inquiries.length === 0 && <li className="px-5 py-6 text-sm text-muted">No inquiries here yet.</li>}
              {inquiries.map((q) => (
                <li key={q.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{q.fromName}</span>
                    <Badge tone={q.status === "new" ? "gold" : q.status === "booked" ? "sage" : "outline"}>{q.status}</Badge>
                    <span className="ml-auto text-xs text-muted">{new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{q.eventDate ? `Wedding ${shortDate(q.eventDate)}` : "Date not set"}{q.guests ? ` · ${q.guests} guests` : ""} · <a href={`mailto:${q.fromEmail}`} className="underline">{q.fromEmail}</a></p>
                  <p className="mt-2 text-sm leading-relaxed">{q.message}</p>
                  <form action={setInquiryStatus} className="mt-2 flex gap-1">
                    <input type="hidden" name="id" value={q.id} />
                    {(["replied", "booked", "closed"] as const).filter((s) => s !== q.status).map((s) => (
                      <button key={s} name="status" value={s} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:bg-cream">Mark {s}</button>
                    ))}
                  </form>
                </li>
              ))}
            </ul>
          </Card>

          <Card id="promote">
            <CardHeader title="Promotion" description="Higher tiers appear first in search and in couples' dashboards." />
            {sp.tier && <p className="mx-5 mt-4 rounded-xl bg-sage-soft px-3 py-2 text-sm text-[#3f5238]">You&apos;re now on {LISTING_TIERS[sp.tier as ListingTier]?.name}.</p>}
            <div className="space-y-3 p-5">
              {(Object.keys(LISTING_TIERS) as ListingTier[]).map((t) => (
                <div key={t} className={cn("rounded-2xl border p-4", l.tier === t ? "border-ink bg-cream/50" : "border-line")}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-xl">{LISTING_TIERS[t].name}</p>
                    <p className="text-sm">{LISTING_TIERS[t].price ? `$${LISTING_TIERS[t].price}/mo` : "Free"}</p>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted">{LISTING_TIERS[t].perks.map((p) => <li key={p} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-sage" />{p}</li>)}</ul>
                  {l.tier === t ? <p className="mt-3 text-xs font-medium">Current plan</p> : (
                    <form action={changeListingTier} className="mt-3"><input type="hidden" name="tier" value={t} /><Button size="sm" variant={LISTING_TIERS[t].price > LISTING_TIERS[l.tier].price ? "primary" : "outline"}>{LISTING_TIERS[t].price > LISTING_TIERS[l.tier].price ? "Upgrade" : "Switch"}</Button></form>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-muted">Demo: switching tiers doesn&apos;t charge anything. Real billing would go through a payment provider such as Stripe.</p>
            </div>
          </Card>
        </div>

        <Card id="listing" className="mt-6 scroll-mt-6">
          <CardHeader title="Your listing" />
          <form action={updateListing} className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Business name"><Input name="name" defaultValue={l.name} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Select name="category" defaultValue={l.category}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Price range"><Select name="priceRange" defaultValue={String(l.priceRange)}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</Select></Field>
            </div>
            <Field label="City"><Input name="city" defaultValue={l.city} /></Field>
            <Field label="Also serves" hint="Comma separated, e.g. Texas, Travels nationwide"><Input name="serves" defaultValue={l.serves.join(", ")} /></Field>
            <Field label="Tagline" className="md:col-span-2"><Input name="tagline" defaultValue={l.tagline} maxLength={160} /></Field>
            <Field label="Description" className="md:col-span-2"><Textarea name="description" rows={5} defaultValue={l.description} /></Field>
            <Field label="Photo links" hint="One https:// link per line. The first is your cover photo." className="md:col-span-2"><Textarea name="images" rows={3} defaultValue={l.images.join("\n")} className="font-mono text-xs" /></Field>
            <Field label="Phone"><Input name="phone" defaultValue={l.phone} /></Field>
            <Field label="Website"><Input name="website" defaultValue={l.website} placeholder="https://…" /></Field>
            <Field group label="Services & features" className="md:col-span-2">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{Object.entries(VENDOR_TAGS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5"><Checkbox name="tags" value={k} defaultChecked={l.tags.includes(k)} />{v}</label>)}</div>
            </Field>
            <Field group label="Traditions you know well" className="md:col-span-2">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{Object.entries(TRADITION_LABELS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5"><Checkbox name="traditions" value={k} defaultChecked={l.traditions.includes(k)} />{v}</label>)}</div>
            </Field>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox name="published" defaultChecked={l.published} /> Published in the marketplace</label>
            <div><Button size="lg">Save listing</Button></div>
          </form>
        </Card>
      </main>
      {user.email === DEMO_VENDOR_EMAIL && <DemoBar current="Vendor · Noor Light Studios" />}
    </div>
  );
}
