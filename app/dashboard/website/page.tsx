import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { saveWebsite } from "@/lib/actions/dashboard";
import { Button, ButtonLink, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { CopyButton } from "@/components/dash/nav";

const THEMES = [
  { id: "noor", name: "Noor", desc: "Ivory & champagne gold", swatch: ["#fbf8f2", "#b08d57", "#2b2620"] },
  { id: "gulab", name: "Gulab", desc: "Blush & dusty rose", swatch: ["#fcf7f5", "#b77a74", "#2b2620"] },
  { id: "zaitoon", name: "Zaitoon", desc: "Olive & sage", swatch: ["#f8f8f3", "#6f8466", "#2b2620"] },
  { id: "mehtab", name: "Mehtab", desc: "Midnight & moonlit gold", swatch: ["#141a26", "#d2b07a", "#f3ede2"] },
];

export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const o = await requireOrg("website");
  const w = o.ctx.wedding;
  const canEdit = can(o.scope, "website", "edit");
  return (
    <>
      <PageHeader title="Our Wedding Website" description="One website for everyone. Each guest automatically sees only the events they're invited to."
        actions={<><CopyButton text={`/w/${w.slug}`} label="Copy website link" className="h-10 px-5 text-sm" /><ButtonLink href={`/w/${w.slug}`} target="_blank" variant="outline">Preview</ButtonLink></>} />
      {saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">Website updated.</p>}
      <form action={saveWebsite}>
        <fieldset disabled={!canEdit} className="grid gap-5 xl:grid-cols-2">
          <Card className="xl:col-span-2">
            <CardHeader title="Theme" description="Contemporary South Asian palettes. Change any time." />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {THEMES.map((t) => (
                <label key={t.id} className="cursor-pointer rounded-2xl border border-line p-4 has-[:checked]:border-ink has-[:checked]:ring-2 has-[:checked]:ring-gold-soft">
                  <input type="radio" name="themeId" value={t.id} defaultChecked={w.theme.id === t.id} className="sr-only" />
                  <div className="flex h-20 items-end gap-1 rounded-xl p-2" style={{ background: t.swatch[0] }}>
                    <span className="arch-mask h-14 w-10" style={{ background: t.swatch[1] }} />
                    <span className="font-serif text-2xl" style={{ color: t.swatch[2] }}>A&amp;O</span>
                  </div>
                  <p className="mt-2 font-serif text-lg">{t.name}</p>
                  <p className="text-xs text-muted">{t.desc}</p>
                </label>
              ))}
            </div>
            <div className="grid gap-4 border-t border-line/70 p-5 sm:grid-cols-3">
              <Field label="Heading font"><Select name="heading" defaultValue={w.theme.heading}><option value="cormorant">Cormorant (classic)</option><option value="playfair">Playfair (editorial)</option><option value="marcellus">Marcellus (engraved)</option></Select></Field>
              <Field label="Pattern"><Select name="pattern" defaultValue={w.theme.pattern}><option value="arch">Mehrab arches</option><option value="jali">Jali lattice</option><option value="none">None</option></Select></Field>
              <Field label="Accent color override" hint="Optional hex, e.g. #9c7a4a"><Input name="accent" defaultValue={w.theme.accent ?? ""} placeholder="#b08d57" /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="The couple" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Bride"><Input name="partner1" defaultValue={w.partner1} /></Field>
              <Field label="Groom"><Input name="partner2" defaultValue={w.partner2} /></Field>
              <Field label="Bride's family name"><Input name="partner1Family" defaultValue={w.partner1Family} /></Field>
              <Field label="Groom's family name"><Input name="partner2Family" defaultValue={w.partner2Family} /></Field>
              <Field label="Bride's name in another script" hint="Optional: Arabic, Urdu, Farsi…"><Input name="urdu1" dir="rtl" defaultValue={w.culture.urduNames.partner1} className="font-urdu" /></Field>
              <Field label="Groom's name in another script"><Input name="urdu2" dir="rtl" defaultValue={w.culture.urduNames.partner2} className="font-urdu" /></Field>
              <Field label="Tagline" className="sm:col-span-2"><Input name="tagline" defaultValue={w.tagline} /></Field>
              <Field label="Web address" hint="Your website lives at /w/your-address" className="sm:col-span-2"><Input name="slug" defaultValue={w.slug} /></Field>
              <Field label="Cover photo URL" className="sm:col-span-2"><Input name="heroImage" defaultValue={w.heroImage} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Islamic design elements" />
            <div className="grid gap-4 p-5">
              <label className="flex items-center gap-2 text-sm"><Checkbox name="showBismillah" defaultChecked={w.culture.showBismillah} /> Show Bismillah calligraphy</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="islamicDates" defaultChecked={w.culture.islamicDates} /> Show Hijri dates alongside Gregorian</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="verseEnabled" defaultChecked={w.culture.verse.enabled} /> Show a Quranic verse</label>
              <Field label="Verse (Arabic)"><Textarea name="verseArabic" rows={2} dir="rtl" defaultValue={w.culture.verse.arabic} className="font-arabic text-lg leading-loose" /></Field>
              <Field label="Translation"><Textarea name="verseTranslation" rows={2} defaultValue={w.culture.verse.translation} /></Field>
              <Field label="Reference"><Input name="verseReference" defaultValue={w.culture.verse.reference} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Our story" description="Separate chapters with a blank line. The first line of each is its title." />
            <div className="p-5"><Textarea name="story" rows={12} defaultValue={w.story.map((s) => `${s.title}\n${s.body}`).join("\n\n")} /></div>
          </Card>

          <Card>
            <CardHeader title="FAQ" description="Question on the first line, answer below. Blank line between each." />
            <div className="p-5"><Textarea name="faqs" rows={12} defaultValue={w.faqs.map((f) => `${f.q}\n${f.a}`).join("\n\n")} /></div>
          </Card>

          <Card>
            <CardHeader title="Travel & accommodation" />
            <div className="grid gap-4 p-5">
              <Field label="Introduction"><Textarea name="travelIntro" rows={2} defaultValue={w.travel.intro} /></Field>
              <Field label="Airports & getting here"><Textarea name="airport" rows={2} defaultValue={w.travel.airport} /></Field>
              <Field label="Hotels" hint="One per line: Hotel name | note"><Textarea name="hotels" rows={3} defaultValue={w.travel.hotels.map((h) => `${h.name} | ${h.note}`).join("\n")} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Gifts & gallery" />
            <div className="grid gap-4 p-5">
              <Field label="Gifting message"><Textarea name="registryMessage" rows={3} defaultValue={w.registry.message} /></Field>
              <Field label="Links" hint="One per line: Label | https://…"><Textarea name="registryLinks" rows={2} defaultValue={w.registry.links.map((l) => `${l.label} | ${l.url}`).join("\n")} /></Field>
              <Field label="Gallery photo URLs" hint="One per line"><Textarea name="gallery" rows={4} defaultValue={w.gallery.join("\n")} className="font-mono text-xs" /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Guest guidance" description="Shown on the events page." />
            <div className="grid gap-4 p-5">
              <Field label="Modest dress guidance"><Textarea name="modestyNote" rows={2} defaultValue={w.culture.modestyNote} /></Field>
              <Field label="Prayer & Salah"><Textarea name="prayerNote" rows={2} defaultValue={w.culture.prayerNote} /></Field>
              <Field label="Halal catering"><Input name="halalNote" defaultValue={w.culture.halalNote} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Privacy & publishing" />
            <div className="grid gap-4 p-5">
              <label className="flex items-center gap-2 text-sm"><Checkbox name="published" defaultChecked={w.published} /> Website is published</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="passwordProtected" defaultChecked={w.passwordProtected} /> Require a password for the public website</label>
              <Field label="Website password" hint="Stored encrypted, so it can't be shown again. Guests with a personal invitation link skip the password."><Input name="sitePassword" type="password" autoComplete="new-password" placeholder={w.passwordProtected ? "Leave blank to keep the current password" : "e.g. chai2027"} /></Field>
              <p className="text-xs text-muted">Invitation-only and family events are always hidden from anyone without an invitation, whether or not a password is set.</p>
            </div>
          </Card>

          {canEdit && <div className="xl:col-span-2"><Button size="lg">Save website</Button></div>}
        </fieldset>
      </form>
    </>
  );
}
