import { CONTACT_EMAIL, LegalPage, Section } from "@/components/legal-page";

export const metadata = {
  title: "Text messages",
  description: "How Qubool's text messages to wedding guests work: who sends them, how guests agree to them, and how to stop them.",
};

export default function SmsTerms() {
  return (
    <LegalPage title="Text messages from Qubool" updated="October 23, 2026"
      intro={<p>Couples who plan their wedding on Qubool can text their guests invitations, save-the-dates and RSVP reminders. This page explains how those texts work and how to stop them.</p>}>
      <Section title="What the texts are">
        <p>Texts come from Qubool&apos;s number on behalf of a couple you know, about their wedding. Each one names the couple and links to your personal invitation page, for example:</p>
        <blockquote className="rounded-2xl border border-line bg-white p-4 font-mono text-sm leading-relaxed">
          Qubool: The Ahmed Family, you&apos;re invited to the wedding of Ayesha &amp; Omar! Your personal invitation: https://www.qubool.app/i/…<br />Reply STOP to opt out.
        </blockquote>
        <p>We never send marketing or promotional texts, and couples can&apos;t write their own text messages through Qubool: every text is one of the three kinds above.</p>
      </Section>

      <Section title="How guests agree to texts">
        <p>A couple adds a guest&apos;s mobile number to their guest list only after the guest has agreed to get texts about the wedding, typically when the couple asks for their contact details. Before Qubool sends any text, the couple must confirm it by ticking this box in their dashboard:</p>
        <div className="flex items-start gap-2 rounded-2xl border border-line bg-white p-4 text-sm">
          <span aria-hidden className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-ink bg-ink" />
          <span>If texting: these guests agreed to get texts from us</span>
        </div>
        <p>Agreeing to texts is never a condition of attending, RSVPing, or buying anything.</p>
      </Section>

      <Section title="How often">
        <p>Message frequency varies. Most guests receive between one and five texts per wedding: an invitation or save-the-date, and a reminder if they haven&apos;t replied. Message and data rates may apply.</p>
      </Section>

      <Section title="Stopping texts and getting help">
        <ul>
          <li>Reply <strong>STOP</strong> to any text to stop all texts from Qubool. You&apos;ll get one confirmation and nothing after that.</li>
          <li>Reply <strong>START</strong> to receive texts again.</li>
          <li>Reply <strong>HELP</strong> for help, or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
        </ul>
        <p>Carriers are not liable for delayed or undelivered messages.</p>
      </Section>

      <Section title="Your number stays private">
        <p>Phone numbers are used only to send the couple&apos;s wedding texts. We don&apos;t sell or share mobile numbers, or your agreement to receive texts, with anyone for their marketing. See our <a href="/privacy">privacy policy</a> for details.</p>
      </Section>
    </LegalPage>
  );
}
