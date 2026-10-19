import { notFound } from "next/navigation";
import { getSite } from "@/lib/site";
import { SectionTitle } from "@/components/site/parts";

export const metadata = { title: "Gallery" };

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site || site.locked || !site.wedding.gallery.length) notFound();
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <SectionTitle eyebrow="Moments" title="Gallery" />
      <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {site.wedding.gallery.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" loading="lazy" className={`mb-5 w-full break-inside-avoid object-cover ${i % 3 === 0 ? "arch-mask aspect-[3/4]" : "rounded-3xl"}`} />
        ))}
      </div>
    </div>
  );
}
