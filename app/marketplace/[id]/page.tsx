import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, Globe, MapPin, Phone, Star } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser, organizerContext } from "@/lib/auth";
import { can, scopeFor } from "@/lib/access";
import { recordView, saveToMyVendors, sendInquiry } from "@/lib/actions/marketplace";
import { price, TRADITION_LABELS, VENDOR_TAGS } from "@/lib/marketplace";
import { Badge, Button, Card } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { InquiryForm } from "@/components/market/inquiry-form";
import { ListingCard } from "@/components/market/listing-card";

async function load(id: string) {
  const l = db().listings.find((x) => x.id === id);
  if (!l) return null;
  if (!l.published) {
    const u = await currentUser();
    if (u?.id !== l.ownerUserId) return null; // owners can preview their unpublished listing
  }
  return l;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = await load((await params).id);
  return l ? { title: `${l.name} · ${l.category} in ${l.city}`, description: l.tagline } : {};
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await load(id);
  if (!l) notFound();
  await recordView(l.id);
  const org = await organizerContext();
  const canSave = !!org && can(scopeFor(org.collaborator.role, org.collaborator.eventIds), "vendors", "edit");
  const saved = !!org && db().vendors.some((v) => v.weddingId === org.wedding.id && v.listingId === l.id);
  const firstEvent = org ? db().events.filter((e) => e.weddingId === org.wedding.id).sort((a, b) => a.date.localeCompare(b.date))[0] : undefined;
  const similar = db().listings.filter((x) => x.published && x.id !== l.id && x.category === l.category).slice(0, 3);
  const [hero, ...rest] = l.images;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <Link href="/marketplace" className="text-xs text-muted hover:text-ink">← All vendors</Link>
        {!l.published && <p className="mt-3 rounded-xl bg-gold-soft/60 px-4 py-2.5 text-sm">Preview: this listing isn&apos;t published yet. Only you can see it.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
          {hero
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={hero} alt="" className="h-80 w-full rounded-3xl object-cover sm:h-[420px]" />
            : <div className="jali-bg h-80 rounded-3xl border border-line" />}
          <div className="hidden gap-3 sm:grid">
            {rest.slice(0, 2).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-full max-h-[204px] w-full rounded-3xl object-cover" />
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline">{l.category}</Badge>
              {l.tier !== "basic" && <Badge tone={l.tier === "spotlight" ? "ink" : "gold"}>{l.tier === "spotlight" ? "Spotlight" : "Featured"}</Badge>}
            </div>
            <h1 className="mt-3 font-serif text-5xl leading-tight">{l.name}</h1>
            <p className="mt-2 text-lg text-muted">{l.tagline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gold" />{l.city}{l.serves.length > 0 && ` · ${l.serves.join(", ")}`}</span>
              {l.reviewCount > 0 && <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-gold text-gold" />{l.rating.toFixed(1)} · {l.reviewCount} reviews</span>}
              <span>{price(l.priceRange)}</span>
            </div>
            <p className="mt-6 whitespace-pre-line leading-relaxed">{l.description}</p>
            {l.tags.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {l.tags.map((t) => <li key={t} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-sage" />{VENDOR_TAGS[t] ?? t}</li>)}
              </ul>
            )}
            {l.traditions.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Experienced with</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{l.traditions.map((t) => <Badge key={t}>{TRADITION_LABELS[t] ?? t} weddings</Badge>)}</div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted">
              {l.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{l.phone}</span>}
              {l.website && <a href={l.website} target="_blank" rel="noreferrer nofollow" className="flex items-center gap-1.5 hover:text-ink"><Globe className="h-4 w-4" />Website</a>}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="p-5">
              <h2 className="font-serif text-2xl">Contact {l.name}</h2>
              <div className="mt-4">
                <InquiryForm action={sendInquiry.bind(null, l.id)} defaults={org ? { name: org.user.name, email: org.user.email, date: firstEvent?.date } : undefined} />
              </div>
            </Card>
            {canSave && (
              saved
                ? <p className="rounded-2xl bg-sage-soft px-4 py-3 text-sm text-[#3f5238]">Saved to your vendors. <Link href="/dashboard/vendors" className="underline">Open</Link></p>
                : <form action={saveToMyVendors}><input type="hidden" name="listingId" value={l.id} /><Button variant="outline" className="w-full">Save to my vendors</Button></form>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 font-serif text-3xl">More {l.category.toLowerCase()}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{similar.map((x) => <ListingCard key={x.id} l={x} />)}</div>
          </section>
        )}
      </main>
    </div>
  );
}
