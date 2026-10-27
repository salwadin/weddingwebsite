import Link from "next/link";
import { notFound } from "next/navigation";
import { canEditEvent } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { deleteEvent, saveEvent } from "@/lib/actions/dashboard";
import { EVENT_TYPES, RSVP_MODES, SIDES, VISIBILITY } from "@/lib/format";
import type { WeddingEvent } from "@/lib/types";
import { Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { CopyButton, ConfirmButton } from "@/components/dash/nav";

const BLANK: Omit<WeddingEvent, "id" | "weddingId"> = {
  type: "custom", name: "", date: "", startTime: "18:00", endTime: "22:00", venueName: "", address: "", dressCode: "", description: "",
  publicMessage: "", hostSide: "both", sidePrivate: false, visibility: "invite", rsvpMode: "required", waitlist: false, mealOptions: [], timeline: [],
  genderSeparated: false, womenOnly: false, noPhotography: false, prayerSpace: true, halal: true, budget: 0, sortOrder: 99,
};

export default async function EventEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const o = await requireOrg("events");
  const isNew = id === "new";
  const e = isNew ? { ...BLANK, id: "" } : o.events.find((x) => x.id === id);
  if (!e) notFound();
  const editable = isNew ? !o.scope.eventIds : canEditEvent(o.scope, e as WeddingEvent);
  const publicLink = `/w/${o.ctx.wedding.slug}/events/${e.id}`;

  return (
    <>
      <Link href="/dashboard/events" className="text-xs text-muted hover:text-ink">← All events</Link>
      <PageHeader title={isNew ? "New event" : e.name} description={editable ? undefined : "You can view this event but your role can't edit it."} />
      {saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">Saved. Your website has been updated.</p>}
      <form action={saveEvent} className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <input type="hidden" name="id" value={e.id} />
        <fieldset disabled={!editable} className="contents">
          <div className="grid gap-5">
            <Card>
              <CardHeader title="Details" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Event type"><Select name="type" defaultValue={e.type}>{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
                <Field label="Name shown to guests"><Input name="name" defaultValue={e.name} required placeholder="e.g. Nikkah" /></Field>
                <Field label="Date"><Input type="date" name="date" defaultValue={e.date} required /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Starts"><Input type="time" name="startTime" defaultValue={e.startTime} /></Field>
                  <Field label="Ends"><Input type="time" name="endTime" defaultValue={e.endTime} /></Field>
                </div>
                <Field label="Venue"><Input name="venueName" defaultValue={e.venueName} /></Field>
                <Field label="Address"><Input name="address" defaultValue={e.address} /></Field>
                <Field label="Dress code" className="sm:col-span-2"><Input name="dressCode" defaultValue={e.dressCode} placeholder="Modest formal attire" /></Field>
                <Field label="Guest color palette" hint="Hex colors separated by commas, shown to guests next to the dress code." className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Input name="palette" defaultValue={(e.palette ?? []).join(", ")} placeholder="#7A1F2B, #B08D57, #1F2A44" />
                    <span className="flex shrink-0 gap-1">{(e.palette ?? []).map((c) => <span key={c} className="h-6 w-6 rounded-full border border-line" style={{ background: c }} />)}</span>
                  </div>
                </Field>
                <Field label="Description" className="sm:col-span-2"><Textarea name="description" rows={3} defaultValue={e.description} /></Field>
                <Field label="Hosted by"><Select name="hostSide" defaultValue={e.hostSide}>{Object.entries(SIDES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <label className="flex items-start gap-2 self-end pb-2 text-sm">
                  <Checkbox name="sidePrivate" defaultChecked={e.sidePrivate} className="mt-0.5" />
                  <span>Private to the hosting family<span className="block text-xs text-muted">For a Mehndi, a girls-only night or a family dinner: the other side&apos;s organizers won&apos;t see this event or any of its costs. Doesn&apos;t apply to events hosted by both sides.</span></span>
                </label>
                <Field label="Event budget (USD)"><Input type="number" name="budget" defaultValue={e.budget || ""} min={0} /></Field>
              </div>
            </Card>
            <Card>
              <CardHeader title="Program & timeline" description="One item per line, e.g. “19:52 Maghrib prayer”." />
              <div className="p-5">
                <Textarea name="timeline" rows={7} defaultValue={e.timeline.map((t) => `${t.time} ${t.label}`).join("\n")} className="font-mono text-xs" />
              </div>
            </Card>
          </div>
          <div className="grid content-start gap-5">
            <Card>
              <CardHeader title="Who can see this event" />
              <div className="space-y-2 p-5">
                {(Object.keys(VISIBILITY) as (keyof typeof VISIBILITY)[]).map((v) => (
                  <label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink has-[:checked]:bg-cream/50">
                    <input type="radio" name="visibility" value={v} defaultChecked={e.visibility === v} className="mt-1 accent-[#3b2b20]" />
                    <span><span className="block text-sm font-medium">{VISIBILITY[v].label}</span><span className="text-xs text-muted">{VISIBILITY[v].help}</span></span>
                  </label>
                ))}
                <Field label="Public invitation message" className="pt-2" hint="Shown on open-invitation events.">
                  <Input name="publicMessage" defaultValue={e.publicMessage} placeholder="We would be honored to have you join us for our Nikkah." />
                </Field>
                {!isNew && e.visibility === "public" && (
                  <div className="flex items-center justify-between rounded-xl bg-sage-soft/60 px-3 py-2 text-xs">
                    <span>Shareable public link. It grants access to this event only.</span>
                    <CopyButton text={publicLink} />
                  </div>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="RSVP" description="Independent from visibility." />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="RSVP"><Select name="rsvpMode" defaultValue={e.rsvpMode}>{Object.entries(RSVP_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Reply by"><Input type="date" name="rsvpDeadline" defaultValue={e.rsvpDeadline} /></Field>
                <Field label="Attendance cap" hint="Public events only."><Input type="number" name="capacity" min={0} defaultValue={e.capacity ?? ""} /></Field>
                <label className="flex items-center gap-2 self-center pt-4 text-sm"><Checkbox name="waitlist" defaultChecked={e.waitlist} /> Waitlist when full</label>
                <Field label="Meal options" hint="One per line. Leave empty for no meal question." className="sm:col-span-2">
                  <Textarea name="mealOptions" rows={3} defaultValue={e.mealOptions.join("\n")} />
                </Field>
              </div>
            </Card>
            <Card>
              <CardHeader title="Cultural & religious settings" />
              <div className="grid gap-2.5 p-5 text-sm">
                {([["genderSeparated", "Separate seating for men and women"], ["womenOnly", "Women-only event"], ["noPhotography", "Request no photography from guests"], ["prayerSpace", "Prayer space & wudu facilities"], ["halal", "Halal catering"]] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2"><Checkbox name={k} defaultChecked={e[k]} /> {l}</label>
                ))}
              </div>
            </Card>
            {editable && (
              <div className="flex items-center justify-between gap-3">
                <Button size="lg">{isNew ? "Create event" : "Save changes"}</Button>
              </div>
            )}
          </div>
        </fieldset>
      </form>
      {!isNew && o.scope.role === "admin" && (
        <form action={deleteEvent} className="mt-8 border-t border-line pt-6">
          <input type="hidden" name="id" value={e.id} />
          <ConfirmButton message={`Delete the ${e.name}? Its invitations and RSVPs will be removed.`} className="text-sm text-[#9b4d47] hover:underline">Delete this event</ConfirmButton>
        </form>
      )}
    </>
  );
}
