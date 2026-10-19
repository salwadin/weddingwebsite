import Link from "next/link";
import { CalendarDays, Clock, MapPin, Shirt } from "lucide-react";
import { cn, islamicDate, longDate, time12 } from "@/lib/format";
import type { PublicEvent, PublicWedding } from "@/lib/site";

export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 16" className={cn("mx-auto h-4 w-28 text-[var(--site-accent)]", className)} fill="none" aria-hidden>
      <path d="M0 8h48M72 8h48" stroke="currentColor" strokeWidth=".8" />
      <path d="M60 1l7 7-7 7-7-7z" stroke="currentColor" strokeWidth=".9" />
      <circle cx="60" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Bismillah({ className }: { className?: string }) {
  return <p dir="rtl" lang="ar" className={cn("font-arabic text-2xl text-[var(--site-accent)] sm:text-3xl", className)}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>;
}

export function SectionTitle({ eyebrow, title, className }: { eyebrow?: string; title: string; className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      {eyebrow && <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--site-muted)]">{eyebrow}</p>}
      <h2 className="heading mt-2 text-4xl sm:text-5xl">{title}</h2>
      <Ornament className="mt-4" />
    </div>
  );
}

const visLabel = (e: PublicEvent) =>
  e.visibility === "public" ? "Open invitation" : e.visibility === "private" ? "Family gathering" : "By invitation";

export function EventSummaryCard({ e, href, islamic }: { e: PublicEvent; href: string; islamic: boolean }) {
  return (
    <Link href={href} className="group relative flex flex-col items-center overflow-hidden rounded-t-full rounded-b-3xl border border-[var(--site-line)] bg-[var(--site-surface)] px-6 pb-8 pt-14 text-center transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(43,38,32,0.35)]">
      <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--site-muted)]">{visLabel(e)}</span>
      <h3 className="heading mt-3 text-4xl">{e.name}</h3>
      <Ornament className="my-4" />
      <p className="text-sm">{longDate(e.date)}</p>
      {islamic && <p className="mt-0.5 text-xs text-[var(--site-muted)]">{islamicDate(e.date)}</p>}
      <p className="mt-2 text-sm text-[var(--site-muted)]">{time12(e.startTime)} · {e.venueName}</p>
      <span className="mt-6 text-xs uppercase tracking-[0.18em] text-[var(--site-accent)] group-hover:underline">Details</span>
    </Link>
  );
}

export function EventDetail({ e, islamic, rsvpHref, showRsvp, id }: { e: PublicEvent; islamic: boolean; rsvpHref: string; showRsvp: boolean; id?: string }) {
  const map = `https://www.google.com/maps?q=${encodeURIComponent(`${e.venueName}, ${e.address}`)}&output=embed`;
  const notes = [
    e.genderSeparated && "Separate seating for men and women",
    e.womenOnly && "This is a women-only gathering",
    e.noPhotography && "We kindly request no photography by guests",
    e.prayerSpace && "Prayer space and wudu facilities available",
    e.halal && "All food served is zabiha halal",
  ].filter(Boolean) as string[];
  return (
    <article id={id} className="scroll-mt-28 overflow-hidden rounded-3xl border border-[var(--site-line)] bg-[var(--site-surface)]">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="p-6 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--site-muted)]">{visLabel(e)}</p>
          <h3 className="heading mt-2 text-5xl">{e.name}</h3>
          {e.publicMessage && <p className="heading mt-3 text-xl italic text-[var(--site-muted)]">{e.publicMessage}</p>}
          <p className="mt-4 leading-relaxed">{e.description}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-accent)]" /><div><dt className="sr-only">Date</dt><dd>{longDate(e.date)}{islamic && <span className="block text-xs text-[var(--site-muted)]">{islamicDate(e.date)}</span>}</dd></div></div>
            <div className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-accent)]" /><div><dt className="sr-only">Time</dt><dd>{time12(e.startTime)} – {time12(e.endTime)}</dd></div></div>
            <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-accent)]" /><div><dt className="sr-only">Venue</dt><dd>{e.venueName}<span className="block text-xs text-[var(--site-muted)]">{e.address}</span></dd></div></div>
            {e.dressCode && <div className="flex gap-3"><Shirt className="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-accent)]" /><div><dt className="sr-only">Dress code</dt><dd>{e.dressCode}</dd></div></div>}
          </dl>
          {e.palette && e.palette.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[11px] uppercase tracking-[0.24em] text-[var(--site-muted)]">Suggested colors</h4>
              <div className="mt-2 flex gap-2">
                {e.palette.map((c) => <span key={c} title={c} className="h-8 w-8 rounded-full border border-[var(--site-line)] shadow-inner" style={{ background: c }} />)}
              </div>
            </div>
          )}
          {notes.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {notes.map((n) => <li key={n} className="rounded-full bg-[var(--site-soft)] px-3 py-1 text-xs">{n}</li>)}
            </ul>
          )}
          {e.timeline.length > 0 && (
            <div className="mt-8">
              <h4 className="text-[11px] uppercase tracking-[0.24em] text-[var(--site-muted)]">Order of the evening</h4>
              <ol className="mt-3 border-l border-[var(--site-line)]">
                {e.timeline.map((t) => (
                  <li key={t.time + t.label} className="relative pb-3 pl-5 text-sm last:pb-0">
                    <span className="absolute -left-[4px] top-1.5 h-2 w-2 rounded-full bg-[var(--site-accent)]" />
                    <span className="tabular-nums text-[var(--site-muted)]">{time12(t.time)}</span> <span className="ml-2">{t.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {showRsvp && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={rsvpHref} className="inline-flex h-11 items-center rounded-full bg-[var(--site-accent)] px-7 text-sm font-medium text-[var(--site-accent-ink)] hover:opacity-90">
                {e.rsvpMode === "required" ? "RSVP" : "Let us know you're coming"}
              </Link>
              {e.rsvpMode === "optional" && <span className="text-xs text-[var(--site-muted)]">RSVP optional · all are welcome</span>}
              {typeof e.spotsLeft === "number" && e.spotsLeft < 100 && <span className="text-xs text-[var(--site-muted)]">{e.spotsLeft > 0 ? `${e.spotsLeft} spots left` : "At capacity · waitlist open"}</span>}
            </div>
          )}
        </div>
        <iframe title={`Map to ${e.venueName}`} src={map} loading="lazy" className="h-72 w-full border-0 lg:h-full lg:min-h-[420px]" referrerPolicy="no-referrer" />
      </div>
    </article>
  );
}

export function weddingNames(w: PublicWedding) {
  return `${w.partner1} & ${w.partner2}`;
}
