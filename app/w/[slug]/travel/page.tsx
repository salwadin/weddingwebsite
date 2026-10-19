import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { SectionTitle } from "@/components/site/parts";

export const metadata = { title: "Travel" };

export default async function TravelPage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site || site.locked) notFound();
  const { travel, registry } = site.wedding;
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <SectionTitle eyebrow="Getting here" title="Travel & Stay" />
      <p className="mx-auto mt-8 max-w-2xl text-center leading-relaxed text-[var(--site-muted)]">{travel.intro}</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-7 sm:col-span-2">
          <h3 className="heading text-2xl">Arriving</h3>
          <p className="mt-2 text-sm text-[var(--site-muted)]">{travel.airport}</p>
        </div>
        {travel.hotels.map((h) => (
          <div key={h.name} className="rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)] p-7">
            <h3 className="heading text-2xl">{h.name}</h3>
            <p className="mt-2 text-sm text-[var(--site-muted)]">{h.note}</p>
          </div>
        ))}
      </div>
      {registry.message && (
        <section className="mt-20 text-center">
          <SectionTitle eyebrow="Gifts" title="With gratitude" />
          <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-[var(--site-muted)]">{registry.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {registry.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--site-line)] px-5 py-2 text-sm hover:border-[var(--site-accent)]">{l.label}</a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
