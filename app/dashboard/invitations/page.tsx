import Link from "next/link";
import { can } from "@/lib/access";
import { allows, requireOrg } from "@/lib/dashboard";
import { UpgradeGate } from "@/components/dash/upgrade-gate";
import { saveDesign, sendMessages } from "@/lib/actions/dashboard";
import { cn, islamicDate, longDate, time12 } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Checkbox, Field, PageHeader, Select, Textarea } from "@/components/ui";
import { CopyButton, WhatsAppButton } from "@/components/dash/nav";
import { InvitationPreview } from "@/components/dash/invitation-preview";
import { emailEnabled } from "@/lib/email/resend";
import { hasFeature, SMS_PER_MONTH } from "@/lib/plans";
import { normalizePhone } from "@/lib/sms/rules";
import { smsEnabled } from "@/lib/sms/twilio";

export default async function InvitationsPage({ searchParams }: { searchParams: Promise<{ event?: string; saved?: string; sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const o = await requireOrg("invitations");
  if (!allows(o, "invitation_designer")) return <><PageHeader title="Invitations" description="Each family's personal invitation link is always available on their page in the Guest List." /><UpgradeGate feature="invitation_designer" canManageBilling={can(o.scope, "billing")}>Design invitations for each event in English, Arabic and a second language, personalized with each family's name and an RSVP QR code.</UpgradeGate></>;
  const { d, events, households } = o;
  const w = o.ctx.wedding;
  const e = events.find((x) => x.id === sp.event) ?? events[0];
  if (!e) return <PageHeader title="Invitations" description="Add an event first." />;
  const design = d.designs.find((x) => x.eventId === e.id) ?? { template: "arch" as const, englishText: `Together with their families, ${w.partner1} & ${w.partner2} invite you to their ${e.name}`, urduText: "", arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", showQr: true };
  const canEdit = can(o.scope, "invitations", "edit");
  const invited = households.filter((h) => d.invitations.some((i) => i.householdId === h.id && i.eventId === e.id));
  const tokenFor = (hid: string) => d.tokens.find((t) => t.householdId === hid && !t.revokedAt)?.token;
  const recipients = [
    ...(e.visibility === "public" ? [{ name: `${e.name} page`, link: `/w/${w.slug}/events/${e.id}` }] : []),
    ...invited.slice(0, 40).flatMap((h) => { const t = tokenFor(h.id); return t ? [{ name: h.name, link: `/i/${t}` }] : []; }),
  ];
  const unsent = invited.filter((h) => h.deliveryStatus === "not_sent").length;
  const pendingHH = invited.filter((h) => {
    const inv = d.invitations.find((i) => i.householdId === h.id && i.eventId === e.id)!;
    return inv.guestIds.some((g) => !d.rsvps.some((r) => r.guestId === g && r.eventId === e.id));
  }).length;
  const outbox = d.outbox.filter((m) => m.weddingId === w.id && (!m.householdId || households.some((h) => h.id === m.householdId))).slice(0, 25);
  const publicLink = `/w/${w.slug}/events/${e.id}`;
  const delivering = emailEnabled();
  // Texting: only on a bought plan (w.plan stays "free" during the trial), and only once Twilio is configured.
  const texting = smsEnabled(), canText = texting && hasFeature(w.plan, "sms");
  const { count: textsUsed } = canText
    ? await o.sb.from("outbox").select("id", { count: "exact", head: true }).eq("wedding_id", w.id).eq("channel", "sms")
      .in("status", ["sent", "delivered"]).gte("sent_at", new Date(Date.now() - 30 * 864e5).toISOString())
    : { count: 0 };
  const textable = invited.filter((h) => normalizePhone(h.phone)).length;

  return (
    <>
      <PageHeader title="Invitations" description="Design a digital invitation for each event. Public events get one shareable link. Private events get a personal link per family, and sharing one never unlocks other events." />
      <div className="mb-5 flex flex-wrap gap-2">
        {events.map((x) => (
          <Link key={x.id} href={`/dashboard/invitations?event=${x.id}`} className={cn("rounded-full border px-4 py-1.5 text-sm", x.id === e.id ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:bg-cream")}>{x.name}</Link>
        ))}
      </div>
      {sp.saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">Design saved.</p>}
      {sp.sent && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">{delivering ? `${sp.sent} messages sent. Email and text delivery shows in the outbox below; WhatsApp messages are ready to share.` : `${sp.sent} messages queued. See the outbox below. (Delivery is simulated in this demo.)`}</p>}
      {sp.error === "sms_consent" && <p className="mb-4 rounded-xl bg-rose-soft px-4 py-2.5 text-sm text-[#9b4d47]">Nothing was sent. To text guests, tick the box confirming they agreed to receive texts from you.</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Design" description="English plus Arabic and a second language: Urdu, Farsi, Turkish, Somali, or any other." />
            <form action={saveDesign} className="grid gap-4 p-5">
              <input type="hidden" name="eventId" value={e.id} />
              <fieldset disabled={!canEdit} className="contents">
                <div className="grid grid-cols-3 gap-2">
                  {(["arch", "jali", "minimal"] as const).map((t) => (
                    <label key={t} className="cursor-pointer rounded-xl border border-line p-3 text-center text-sm capitalize has-[:checked]:border-ink has-[:checked]:bg-cream/60">
                      <input type="radio" name="template" value={t} defaultChecked={design.template === t} className="sr-only" />
                      {t === "arch" ? "Mehrab arch" : t === "jali" ? "Jali lattice" : "Modern minimal"}
                    </label>
                  ))}
                </div>
                <Field label="Arabic (top)"><Textarea name="arabicText" rows={1} dir="rtl" defaultValue={design.arabicText} className="font-arabic text-lg" /></Field>
                <Field label="Invitation wording (English)"><Textarea name="englishText" rows={3} defaultValue={design.englishText} /></Field>
                <Field label="Second-language line"><Textarea name="urduText" rows={1} dir="rtl" defaultValue={design.urduText} className="font-urdu leading-[2.4]" /></Field>
                <label className="flex items-center gap-2 text-sm"><Checkbox name="showQr" defaultChecked={design.showQr} /> Include a QR code that links to RSVP</label>
                {canEdit && <div><Button>Save design</Button></div>}
              </fieldset>
            </form>
          </Card>

          <Card>
            <CardHeader title="Send" description={e.visibility === "public" ? "This is an open invitation. Share it anywhere." : `${invited.length} households are invited. Each one receives its own link.`} />
            <div className="grid gap-4 p-5 text-sm">
              {e.visibility === "public" && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sage-soft/60 p-3">
                  <code className="flex-1 break-all text-xs">{publicLink}</code>
                  <CopyButton text={publicLink} />
                  <WhatsAppButton message={`${e.publicMessage || `You're invited to the ${e.name} of ${w.partner1} & ${w.partner2}`}. ${longDate(e.date)}, ${time12(e.startTime)} at ${e.venueName}. Details: ${publicLink}`} />
                </div>
              )}
              {canEdit && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { kind: "invitation", title: "Personal invitations", body: `${unsent} households haven't been sent theirs.`, cta: "Send to unsent" },
                    { kind: "reminder", title: "RSVP reminder", body: `${pendingHH} households still have pending replies.`, cta: "Remind pending" },
                    { kind: "save_the_date", title: "Save the date", body: `Announce the date to all ${invited.length} invited households.`, cta: "Send save-the-date" },
                  ].map((a) => (
                    <form key={a.kind} action={sendMessages} className="flex flex-col rounded-xl border border-line p-4">
                      <input type="hidden" name="kind" value={a.kind} /><input type="hidden" name="eventId" value={e.id} />
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 flex-1 text-xs text-muted">{a.body}</p>
                      <Select name="channel" className="mt-3 h-8 text-xs" aria-label="Send by">
                        <option value="email">Email</option>
                        {texting && <option value="sms" disabled={!canText}>{canText ? "Text message" : "Text message (Plus or Signature)"}</option>}
                        <option value="whatsapp">WhatsApp</option>
                      </Select>
                      {canText && (
                        <label className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted">
                          <Checkbox name="smsConsent" className="mt-0.5" /> If texting: these guests agreed to get texts from us
                        </label>
                      )}
                      <Button size="sm" variant="outline" className="mt-2">{a.cta}</Button>
                    </form>
                  ))}
                </div>
              )}
              {canEdit && texting && (
                <p className="text-xs text-muted">
                  {canText
                    ? <>Texts: {textsUsed ?? 0} of {SMS_PER_MONTH[w.plan].toLocaleString()} used in the last 30 days. {textable} of {invited.length} invited households have a US or Canadian mobile number. Every text ends with &ldquo;Reply STOP to opt out&rdquo;.</>
                    : <>Texting guests is included once you buy Plus or Signature (it isn&apos;t part of the free trial).</>}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Outbox" description={delivering ? "Messages sent from Qubool. Emails go out right away; bounced addresses are flagged in the guest list." : "Messages sent from Qubool. In this demo, nothing actually leaves your computer."} />
            <ul className="divide-y divide-line/70 text-sm">
              {outbox.length === 0 && <li className="px-5 py-5 text-muted">No messages yet.</li>}
              {outbox.map((m) => (
                <li key={m.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={m.channel === "whatsapp" ? "sage" : "neutral"}>{m.channel === "sms" ? "text" : m.channel}</Badge>
                    <Badge tone="outline">{m.kind.replace(/_/g, " ")}</Badge>
                    {((delivering && m.channel === "email") || (texting && m.channel === "sms")) && m.status && m.status !== "pending" && m.status !== "skipped" && (
                      <Badge tone={m.status === "bounced" || m.status === "failed" || m.status === "complained" ? "rose" : "sage"} title={m.error}>{m.status}</Badge>
                    )}
                    <span className="text-xs text-muted">to {m.to} · {new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-medium">{m.subject}</p>
                  <p className="text-xs text-muted">{m.body}</p>
                  {m.channel === "sms" && m.status === "failed" && m.error && <p className="mt-1 text-xs text-[#9b4d47]">{m.error}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="xl:sticky xl:top-8 xl:self-start">
          <InvitationPreview
            template={design.template} englishText={design.englishText} urduText={design.urduText} arabicText={design.arabicText} showQr={design.showQr}
            eventName={e.name} names={`${w.partner1} & ${w.partner2}`} dateLine={longDate(e.date)}
            islamicLine={w.culture.islamicDates ? islamicDate(e.date) : ""} timeLine={`${time12(e.startTime)} onwards`} venue={e.venueName} address={e.address}
            recipients={recipients.length ? recipients : [{ name: "Sample guest", link: `/w/${w.slug}` }]} />
        </div>
      </div>
    </>
  );
}
