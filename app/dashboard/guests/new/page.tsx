import Link from "next/link";
import { requireOrg } from "@/lib/dashboard";
import { createHousehold } from "@/lib/actions/dashboard";
import { SIDES, TAGS } from "@/lib/format";
import { Button, Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

export default async function NewHousehold() {
  const o = await requireOrg("guests", "edit");
  return (
    <>
      <Link href="/dashboard/guests" className="text-xs text-muted hover:text-ink">← Guest list</Link>
      <PageHeader title="Add a household" description="Invite a whole family under one name. One person will be able to RSVP for everyone." />
      <form action={createHousehold}>
        <Card className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Invitation name" hint="How the invitation is addressed." className="md:col-span-2">
            <Input name="name" placeholder="Mr. and Mrs. Ahmed & Family" />
          </Field>
          <Field label="Household members" hint="One per line. Add “(child)” for children or “Guest (plus one)” for an unnamed plus-one." className="md:col-span-2">
            <Textarea name="members" rows={5} required placeholder={"Javed Ahmed\nFarah Ahmed\nZayd Ahmed (child)\nHana Ahmed (child)"} />
          </Field>
          <Field label="Side">
            <Select name="side" defaultValue={o.scope.side ?? "bride"} disabled={!!o.scope.side}>{Object.entries(SIDES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            {o.scope.side && <input type="hidden" name="side" value={o.scope.side} />}
          </Field>
          <Field label="Relationship"><Input name="relationship" placeholder="Ayesha's khala" /></Field>
          <Field label="Email"><Input type="email" name="email" /></Field>
          <Field label="Phone / WhatsApp"><Input name="phone" placeholder="+1 214 555 0100" /></Field>
          <Field group label="Groups">
            <div className="flex flex-wrap gap-3 pt-1 text-sm">{Object.entries(TAGS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5"><Checkbox name="tags" value={k} /> {v}</label>)}</div>
          </Field>
          <Field group label="Invite to">
            <div className="flex flex-wrap gap-3 pt-1 text-sm">{o.events.map((e) => <label key={e.id} className="flex items-center gap-1.5"><Checkbox name="events" value={e.id} defaultChecked={e.visibility === "public"} /> {e.name}</label>)}</div>
          </Field>
          <Field label="Notes" className="md:col-span-2"><Textarea name="notes" rows={2} /></Field>
          <div className="md:col-span-2"><Button size="lg">Add household</Button></div>
        </Card>
      </form>
    </>
  );
}
