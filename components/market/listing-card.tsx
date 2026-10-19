import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { price } from "@/lib/marketplace";
import type { Listing } from "@/lib/types";
import { Badge } from "@/components/ui";

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/marketplace/${l.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-44 bg-cream">
        {l.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.images[0].replace("w=1200", "w=600")} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        {l.tier !== "basic" && <Badge tone={l.tier === "spotlight" ? "ink" : "gold"} className="absolute left-3 top-3">{l.tier === "spotlight" ? "Spotlight" : "Featured"}</Badge>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{l.category}</p>
        <p className="mt-0.5 font-serif text-xl leading-tight group-hover:underline">{l.name}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{l.tagline}</p>
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city}</span>
          {l.reviewCount > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{l.rating.toFixed(1)} ({l.reviewCount})</span>}
          <span className="ml-auto">{price(l.priceRange)}</span>
        </div>
      </div>
    </Link>
  );
}
