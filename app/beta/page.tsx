import { Gift, MessageCircleHeart, Sparkles } from "lucide-react";
import { submitBetaApplication, submitVendorApplication } from "@/lib/actions/programs";
import { Card } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { RequestAccessForm } from "@/components/programs/forms";

export const metadata = {
  title: "Request Access",
  description: "Early access to Qubool for couples, planners and wedding vendors.",
};

const PERKS = [
  { icon: Gift, title: "Complimentary full access", body: "Every feature, including the design studio, outfit planning and unlimited events, free for the length of the beta." },
  { icon: MessageCircleHeart, title: "Help shape Qubool", body: "Talk to the people building it. Your feedback decides what we build next." },
  { icon: Sparkles, title: "First in line", body: "New features reach beta members first, so you can try them before anyone else." },
];

export default async function Beta({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 pb-14 pt-10 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-gold">Qubool Beta</p>
        <h1 className="mt-5 font-serif text-5xl leading-[1.05] sm:text-6xl">Plan with us, <span className="italic">before anyone else.</span></h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          For couples, planners and wedding vendors. Early access is free.
        </p>
        <a href="#apply" className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-8 text-xs font-medium uppercase tracking-[0.2em] text-ivory hover:bg-ink/90">Request Early Access</a>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 text-center md:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="mx-auto h-7 w-7 text-ink" strokeWidth={1.2} />
              <h2 className="mt-4 font-serif text-xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl scroll-mt-6 px-6 py-16">
        <h2 className="font-serif text-4xl">Apply for early access</h2>
        <p className="mt-2 text-sm text-muted">It takes about two minutes. We invite people in small groups and will email you when it&apos;s your turn.</p>
        <Card className="mt-6 p-6 sm:p-8"><RequestAccessForm betaAction={submitBetaApplication} vendorAction={submitVendorApplication} initial={as === "vendor" || as === "planner" ? as : "couple"} /></Card>
      </section>
      <SiteFooter />
    </div>
  );
}
