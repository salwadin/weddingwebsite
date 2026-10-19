import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { SectionTitle } from "@/components/site/parts";

export const metadata = { title: "FAQ" };

export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site || site.locked || !site.wedding.faqs.length) notFound();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <SectionTitle eyebrow="Good to know" title="Questions" />
      <div className="mt-12 divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
        {site.wedding.faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="heading text-2xl">{f.q}</span>
              <span className="text-[var(--site-accent)] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-[var(--site-muted)]">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
