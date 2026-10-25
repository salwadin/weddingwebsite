import { CONTACT_EMAIL, LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Privacy policy", description: "What Qubool collects, why, who processes it, and the choices you have." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="October 25, 2026"
      intro={<p>Qubool helps couples plan multi-event weddings and invite their guests. This policy explains what information we handle, why, and the choices you have. We don&apos;t sell personal information, and we don&apos;t use it for advertising.</p>}>
      <Section title="Information we collect">
        <ul>
          <li><strong>Account details:</strong> your name, email address and password (stored only as a secure hash by our authentication provider).</li>
          <li><strong>Wedding planning content:</strong> events, budgets, checklists, vendors, outfits, designs and anything else you add.</li>
          <li><strong>Guest information added by couples:</strong> guests&apos; names, households, email addresses, mobile numbers, RSVPs, meal choices and notes. Couples are responsible for having their guests&apos; permission to add this and to contact them.</li>
          <li><strong>RSVPs and messages from guests</strong> submitted through a wedding website.</li>
          <li><strong>Vendor listings, inquiries and program applications</strong> (Founding Vendor and Beta), including business and contact details.</li>
          <li><strong>Payment records:</strong> what was bought and when. Card details go directly to Stripe; we never see or store them.</li>
          <li><strong>Technical data:</strong> the cookies needed to keep you signed in and to run the interactive demo, and standard server logs (such as IP address and browser) kept for security and troubleshooting.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run Qubool: host wedding websites, show each guest only the events they&apos;re invited to, collect RSVPs, and power the planning tools.</li>
          <li>To send messages you ask us to send: invitations, reminders and save-the-dates by email or text, account emails such as sign-up confirmations and password resets, and replies to applications.</li>
          <li>To process payments and prevent fraud and abuse.</li>
          <li>To provide support, fix problems and keep the service secure.</li>
        </ul>
      </Section>

      <Section title="Text messages">
        <p>When a couple texts their guests through Qubool, we use the guest&apos;s mobile number only to deliver that couple&apos;s wedding texts. Guests can reply STOP at any time. Mobile numbers and text-message consent are never sold or shared with third parties or affiliates for their marketing or promotional purposes. See <a href="/sms">Text messages</a> for how texting works.</p>
      </Section>

      <Section title="Who processes it for us">
        <p>We use a small number of service providers, each only for the job below:</p>
        <ul>
          <li><strong>Supabase</strong>: database and sign-in.</li>
          <li><strong>Vercel</strong>: website hosting.</li>
          <li><strong>Stripe</strong>: payments.</li>
          <li><strong>Resend</strong>: email delivery.</li>
          <li><strong>Twilio</strong>: text message delivery.</li>
        </ul>
        <p>We may also disclose information if the law requires it, or to protect the safety of people or the service.</p>
      </Section>

      <Section title="Who can see what">
        <p>A wedding&apos;s data is visible only to that couple and the collaborators they invite, within the roles they grant. Guests see only their own household&apos;s invitation and the events they&apos;re invited to. Qubool staff access accounts only to provide support or keep the service secure.</p>
      </Section>

      <Section title="How long we keep it">
        <p>We keep wedding data while the account is active. When you delete your account, or ask us to, we delete it from our live systems straight away; backups expire on a rolling schedule. Payment records are kept as long as tax and accounting rules require.</p>
        <p>Deleting your account removes:</p>
        <ul>
          <li>Your name, email address and sign-in.</li>
          <li>Any wedding you are the only administrator of, for everyone who plans it: its website, events, guest list, RSVPs, budget, checklist, uploaded photos and invitation artwork.</li>
          <li>Your place on any wedding that has another administrator. That wedding carries on without you.</li>
          <li>Your vendor listing and the inquiries sent to it. Any promotion subscription is cancelled immediately, with no further charges.</li>
        </ul>
        <p>Inquiries you sent to vendors stay with those vendors, and program applications (Founding Vendor and Beta) stay with our records unless you ask us to remove them.</p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>You can view and correct your information in your dashboard, and export your guest list as a spreadsheet.</li>
          <li>You can delete your account at any time under Settings → Delete account (vendors: at the bottom of the vendor portal), or ask us to do it for you.</li>
          <li>Guests who want their information removed can ask the couple, or contact us directly.</li>
          <li>Reply STOP to any Qubool text to stop texts.</li>
        </ul>
        <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for any of these. We&apos;ll respond within 30 days.</p>
      </Section>

      <Section title="Children">
        <p>Qubool accounts are for adults. Couples may list children as guests; we use that information only for the wedding it belongs to.</p>
      </Section>

      <Section title="Changes">
        <p>If we make significant changes to this policy, we&apos;ll update the date above and let account holders know by email.</p>
      </Section>
    </LegalPage>
  );
}
