import { ButtonLink } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { PlanCards } from "@/components/plan-cards";

export const metadata = { title: "Pricing" };

const FAQ = [
  ["Is it really free to start?", "Yes. Every new wedding gets 14 days with all features. After that you keep Essentials for free, or upgrade once for the whole wedding."],
  ["Is it a subscription?", "No. Plus and Signature are one-time payments per wedding, so they last until your very last celebration."],
  ["Do guests pay anything?", "Never. Guests open their personal link and RSVP for free."],
  ["Do I pay to contact vendors?", "No. Browsing and messaging vendors is free on every plan."],
];

export default function Pricing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="py-10 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Pricing</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">One payment for the whole wedding</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">Start free with every feature for 14 days. Upgrade only if you need more events, a bigger guest list, or the planning studio.</p>
        </div>
        <PlanCards action={(p) => <ButtonLink href="/signup" variant={p === "plus" ? "primary" : "outline"} className="w-full">{p === "free" ? "Start free" : "Start 14-day trial"}</ButtonLink>} />
        <div className="mx-auto mt-16 max-w-3xl divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-xl">{q}<span className="text-gold group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
