import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ExternalLink, LogOut } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { publishedListings } from "@/lib/listings";
import { isDemoEmail } from "@/lib/demo";
import { applyFoundingPerks } from "@/lib/programs";
import { fromRow } from "@/lib/rows";
import { serverClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { changeListingTier, openBillingPortal, setInquiryStatus, updateListing } from "@/lib/actions/marketplace";
import { confirmCheckout } from "@/lib/payments";
import { paymentsEnabled } from "@/lib/stripe";
import { inNativeApp } from "@/lib/native";
import { adminClient } from "@/lib/supabase/server";
import { cn, shortDate } from "@/lib/format";
import { CATEGORIES, TRADITION_LABELS, VENDOR_TAGS } from "@/lib/marketplace";
import { LISTING_TIERS } from "@/lib/plans";
import type { ListingTier } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Logo, Select, Stat, Textarea } from "@/components/ui";
import { DemoBar } from "@/components/demo-bar";
import { PushPrompt } from "@/components/push-prompt";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { DEMO_VENDOR_EMAIL } from "@/lib/seed";

export const metadata = { title: "Vendor portal" };

export default async function VendorPortal({ searchParams }: { searchParams: Promise<{ welcome?: string; saved?: string; tier?: string; show?: string; checkout?: string; session_id?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.kind !== "vendor") redirect("/dashboard");
  const sb = await serverClient();
  let { data: mine } = await sb.from("listings").select("*").eq("owner_user_id", user.id).limit(1).maybeSingle();
  if (!mine) redirect("/for-vendors");
  // Approved Founding Vendors get their free Featured year the first time they open the portal.
  if (!mine.founding_until && !isDemoEmail(user.email) && (await applyFoundingPerks(user.email))) {
    ({ data: mine } = await sb.from("listings").select("*").eq("id", mine.id).single());
  }
  const founding = mine!.founding_number ? { number: mine!.founding_number as number, until: new Date(mine!.founding_until as string) } : null;
  const l = fromRow("listings", mine!);
  const demo = isDemoEmail(user.email), live = !demo && paymentsEnabled();
  const app = await inNativeApp();
  // Back from Stripe Checkout: apply the subscription now rather than waiting for the webhook.
  if (sp.session_id && live) {
    const tier = await confirmCheckout(adminClient(), sp.session_id, { listing_id: l.id });
    if (tier) redirect(`/vendor?tier=${tier}#promote`);
  }
  const { data: subs } = await sb.from("subscriptions").select("tier,status,stripe_customer_id,current_period_end,cancel_at_period_end,created_at")
    .eq("listing_id", l.id).order("created_at", { ascending: false }).limit(20);
  const sub = subs?.find((x) => ["active", "trialing", "past_due"].includes(x.status));
  const pending = subs?.find((x) => x.status === "pending" && Date.now() - new Date(x.created_at).getTime() < 60 * 60 * 1000);
  const hasCustomer = !!subs?.some((x) => x.stripe_customer_id);
  const { data: inq } = await sb.from("inquiries").select("*").eq("listing_id", l.id).order("created_at", { ascending: false }).limit(500);
  const all = (inq ?? []).map((r) => fromRow("inquiries", r));
  const show = sp.show ?? "open";
  const inquiries = all.filter((q) => show === "all" || (show === "open" ? q.status === "new" || q.status === "replied" : q.status === show));
  const booked = all.filter((q) => q.status === "booked").length;
  const rank = (await publishedListings({ includeDemo: isDemoEmail(user.email) })).filter((x) => x.published && x.category === l.category).sort((a, b) => ({ spotlight: 0, featured: 1, basic: 2 })[a.tier] - ({ spotlight: 0, featured: 1, basic: 2 })[b.tier] || b.rating - a.rating).findIndex((x) => x.id === l.id) + 1;

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
        {app && <PushPrompt title="Hear about new inquiries right away" text="Get a notification on this phone whenever a couple contacts you." />}
        {sp.welcome && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Welcome! Add photos and a description below, then publish your listing.</p>}
        {sp.saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Listing saved.</p>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl">{l.name}</h1>
            <p className="text-sm text-muted">{l.category} · {l.city} · {l.published ? "Published" : "Not published yet"}</p>
            {founding && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold-soft/70 px-3 py-1 text-xs text-[#7a5d2f]">
                <b>Founding Vendor #{founding.number}</b>
                {founding.until > new Date() ? `· Featured free until ${founding.until.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "· Founding year complete"}
              </p>
            )}
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
                  <form className="mt-2 flex gap-1">
                    <input type="hidden" name="id" value={q.id} />
                    {(["replied", "booked", "closed"] as const).filter((s) => s !== q.status).map((s) => (
                      <button key={s} formAction={setInquiryStatus.bind(null, s)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:bg-cream">Mark {s}</button>
                    ))}
                  </form>
                </li>
              ))}
            </ul>
          </Card>

          {app ? null : <Card id="promote">
            <CardHeader title="Promotion" description="Higher tiers appear first in search and in couples' dashboards." />
            {sp.tier && <p className="mx-5 mt-4 rounded-xl bg-sage-soft px-3 py-2 text-sm text-[#3f5238]">You&apos;re now on {LISTING_TIERS[sp.tier as ListingTier]?.name}.</p>}
            {sp.checkout === "success" && !sp.tier && (
              <p className="mx-5 mt-4 rounded-xl bg-gold-soft/40 px-3 py-2 text-sm"><meta httpEquiv="refresh" content="5" />Thank you! We&apos;re confirming your subscription with Stripe…</p>
            )}
            {sp.checkout === "cancelled" && <p className="mx-5 mt-4 rounded-xl bg-cream px-3 py-2 text-sm">Checkout cancelled. You haven&apos;t been charged.</p>}
            {pending && !sub && sp.checkout !== "success" && (
              <p className="mx-5 mt-4 rounded-xl bg-cream px-3 py-2 text-sm">Your {LISTING_TIERS[pending.tier as ListingTier].name} checkout hasn&apos;t completed yet. You can start again below.</p>
            )}
            {sub?.status === "past_due" && <p className="mx-5 mt-4 rounded-xl bg-rose-soft px-3 py-2 text-sm">Your last payment didn&apos;t go through. Update your card under Manage billing to keep {LISTING_TIERS[l.tier].name}.</p>}
            {sub && !demo && (
              <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span>
                  {LISTING_TIERS[sub.tier as ListingTier].name}
                  {sub.current_period_end && <span className="text-muted"> · {sub.cancel_at_period_end ? "ends" : "renews"} {new Date(sub.current_period_end).toLocaleDateString()}</span>}
                </span>
                <form action={openBillingPortal}><button className="text-xs underline">Manage billing</button></form>
              </div>
            )}
            <div className="space-y-3 p-5">
              {(Object.keys(LISTING_TIERS) as ListingTier[]).map((t) => (
                <div key={t} className={cn("rounded-2xl border p-4", l.tier === t ? "border-ink bg-cream/50" : "border-line")}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-serif text-xl">{LISTING_TIERS[t].name}</p>
                    <p className="text-sm">{LISTING_TIERS[t].price ? `$${LISTING_TIERS[t].price}/mo` : "Free"}</p>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted">{LISTING_TIERS[t].perks.map((p) => <li key={p} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-sage" />{p}</li>)}</ul>
                  {l.tier === t ? <p className="mt-3 text-xs font-medium">Current plan</p> : !demo && t === "basic" ? (
                    hasCustomer && live ? <form action={openBillingPortal} className="mt-3"><Button size="sm" variant="outline">Cancel in billing portal</Button></form> : null
                  ) : (
                    <form action={changeListingTier} className="mt-3"><input type="hidden" name="tier" value={t} /><Button size="sm" disabled={!demo && !live} variant={LISTING_TIERS[t].price > LISTING_TIERS[l.tier].price ? "primary" : "outline"}>{LISTING_TIERS[t].price > LISTING_TIERS[l.tier].price ? "Upgrade" : "Switch"}</Button></form>
                  )}
                </div>
              ))}
              {demo && <p className="text-[11px] text-muted">Demo: switching tiers doesn&apos;t charge anything.</p>}
              {live && <p className="text-[11px] text-muted">Billed monthly through Stripe. Switching between paid tiers is prorated; cancel any time in the billing portal.</p>}
              {!demo && !live && <p className="text-[11px] text-muted">Online payments aren&apos;t available yet. Please check back soon.</p>}
            </div>
          </Card>}
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

        <div className="mt-6 max-w-2xl"><DeleteAccountCard user={user} /></div>
      </main>
      {user.email === DEMO_VENDOR_EMAIL && <DemoBar current="Vendor · Noor Light Studios" />}
    </div>
  );
}
