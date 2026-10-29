import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, Section } from "@/components/legal-page";

export const metadata = { title: "Terms of service", description: "The terms for using Qubool as a couple, collaborator, guest or vendor." };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="October 23, 2026"
      intro={<p>These terms apply when you use Qubool, whether you&apos;re planning a wedding, helping plan one, RSVPing as a guest, or listing a business. By using Qubool you agree to them.</p>}>
      <Section title="Your account">
        <p>You need to be an adult to create an account. Keep your password safe; you&apos;re responsible for activity under your account and for the collaborators you invite and the roles you give them.</p>
      </Section>

      <Section title="Your content and your guests">
        <p>Your wedding content stays yours. You give us permission to store it and display it as you set it up, for example showing each guest the events you invite them to. You&apos;re responsible for what you add, and for having your guests&apos; permission to add their details and to contact them by email or text.</p>
      </Section>

      <Section title="Messages to guests">
        <p>Qubool can email and text your guests on your behalf. You may send them only to people who agreed to hear from you about your wedding, and only through the invitation, save-the-date and reminder messages Qubool provides. Texting follows our <Link href="/sms">text message terms</Link>; guests can reply STOP at any time, and we honor it. Don&apos;t use Qubool to send spam, marketing, or anything unrelated to your celebration. We may pause messaging for an account that is misused.</p>
      </Section>

      <Section title="Plans and payments">
        <p>Essentials is free. Plus and Signature are one-time purchases for one wedding; vendor Featured and Spotlight listings are monthly subscriptions you can cancel at any time. Prices are shown on our <Link href="/pricing">pricing page</Link>, and payments are processed by Stripe. What each plan includes is listed on the pricing page. If something isn&apos;t right with a purchase, email us and we&apos;ll make it right.</p>
      </Section>

      <Section title="Vendors">
        <p>Vendors are responsible for the accuracy of their listings and for their own services, contracts and payments with couples. Qubool introduces couples and vendors but isn&apos;t a party to their agreements. Founding Vendor perks apply as described when you&apos;re approved.</p>
      </Section>

      <Section title="Acceptable use">
        <ul>
          <li>Don&apos;t break the law, infringe others&apos; rights, or upload anything harmful.</li>
          <li>Don&apos;t try to access weddings, invitations or accounts that aren&apos;t yours.</li>
          <li>Don&apos;t disrupt or overload the service, or scrape it.</li>
        </ul>
        <p>We may suspend or close accounts that break these terms.</p>
      </Section>

      <Section title="The service">
        <p>We work hard to keep Qubool reliable, but we provide it &ldquo;as is&rdquo; and can&apos;t guarantee it will always be available or error-free, or that every email or text will be delivered. Keep your own copy of anything critical, such as your final guest list. To the extent the law allows, Qubool isn&apos;t liable for indirect losses, and our total liability is limited to the amount you paid us in the last twelve months.</p>
      </Section>

      <Section title="Changes and contact">
        <p>We may update these terms; if a change is significant, we&apos;ll tell account holders by email before it takes effect. Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Section>
    </LegalPage>
  );
}
