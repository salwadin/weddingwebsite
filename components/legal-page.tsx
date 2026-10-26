import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const CONTACT_EMAIL = "admin@qubool.app";

/** Shared frame for /privacy, /terms and /sms: readable column, last-updated date, cross-links. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Qubool</p>
        <h1 className="mt-3 font-serif text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        {intro && <div className="mt-6 text-lg leading-relaxed text-muted">{intro}</div>}
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:mt-2 [&_ul]:space-y-1.5">{children}</div>
        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
          <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link> · <Link href="/terms" className="underline underline-offset-2">Terms of service</Link> · <Link href="/sms" className="underline underline-offset-2">Text messages</Link> · <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="font-serif text-2xl">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
