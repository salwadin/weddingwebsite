import { Check, Gift, MessageCircleHeart, Sparkles } from "lucide-react";
import { submitBetaApplication } from "@/lib/actions/programs";
import { SITE_PHOTOS } from "@/lib/photos";
import { Card } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { BetaApplicationForm } from "@/components/programs/forms";

export const metadata = {
  title: "Join the Qubool Beta",
  description: "Early access for couples and wedding planners: complimentary full access while you help shape Qubool.",
};

const PERKS = [
  { icon: Gift, title: "Complimentary full access", body: "Every feature, including the design studio, outfit planning and unlimited events, free for the length of the beta." },
  { icon: MessageCircleHeart, title: "Help shape Qubool", body: "Talk to the people building it. Your feedback decides what we build next." },
  { icon: Sparkles, title: "First in line", body: "New features reach beta members first, so you can try them before anyone else." },
];

export default function Beta() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="jali-bg border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Qubool Beta</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-6xl">Plan with us before anyone else</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              We&apos;re opening Qubool to a small group of couples and professional planners, especially those with multi-day, multicultural, multi-event celebrations. Early access is complimentary.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Couples planning a wedding with more than one event", "Wedding and event planners managing several families", "Every culture, faith and celebration style"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{t}</li>
              ))}
            </ul>
            <a href="#apply" className="mt-7 inline-flex h-12 items-center rounded-full bg-ink px-7 text-[15px] font-medium text-ivory hover:bg-ink/90">Request early access</a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_PHOTOS.toast} alt="Guests raising a toast at a wedding reception" className="mt-10 aspect-[3/4] w-full rounded-3xl object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_PHOTOS.malayCouple} alt="A couple in traditional wedding attire" className="arch-mask aspect-[3/4] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream"><Icon className="h-5 w-5 text-gold" /></span>
              <h2 className="mt-4 font-serif text-2xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="apply" className="mx-auto max-w-3xl scroll-mt-6 px-6 pb-20">
        <h2 className="font-serif text-4xl">Apply for early access</h2>
        <p className="mt-2 text-sm text-muted">It takes about two minutes. We invite people in small groups and will email you when it&apos;s your turn.</p>
        <Card className="mt-6 p-6 sm:p-8"><BetaApplicationForm action={submitBetaApplication} /></Card>
      </section>
      <SiteFooter />
    </div>
  );
}
