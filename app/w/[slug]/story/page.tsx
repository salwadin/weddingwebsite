import { photoFrame } from "@/lib/site-style";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { SectionTitle } from "@/components/site/parts";

export const metadata = { title: "Our Story" };

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site || site.locked || !site.wedding.story.length) notFound();
  const w = site.wedding;
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle eyebrow={`${w.partner1} & ${w.partner2}`} title="Our Story" />
      <div className="mt-14 space-y-20">
        {w.story.map((s, i) => (
          <section key={s.title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>img]:order-2" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {(s.image || w.gallery[i % Math.max(1, w.gallery.length)] || w.heroImage) && <img src={s.image || w.gallery[i % Math.max(1, w.gallery.length)] || w.heroImage} alt="" className={`${photoFrame(w.theme)} aspect-[4/5] w-full object-cover`} />}
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--site-accent)]">Chapter {i + 1}</p>
              <h3 className="heading mt-2 text-4xl">{s.title}</h3>
              <p className="mt-4 leading-relaxed text-[var(--site-muted)]">{s.body}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
