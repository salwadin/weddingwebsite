import { ROLE_LABELS, can } from "@/lib/access";
import { allows, requireOrg } from "@/lib/dashboard";
import { cancelInvite, inviteCollaborator, resetDemo, saveMahr, updateCollaborator } from "@/lib/actions/dashboard";
import type { Role } from "@/lib/types";
import { DEMO_WEDDING_ID } from "@/lib/seed";
import { demoEnabled } from "@/lib/supabase/env";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/dash/nav";

const ROLE_HELP: Record<Role, string> = {
  admin: "Everything, including settings, Mahr, and collaborators.",
  bride_organizer: "Bride's side guests, invitations, RSVPs, tasks and budget.",
  groom_organizer: "Groom's side guests, invitations, RSVPs, tasks and budget.",
  event_organizer: "Only the events you assign: guests, invitations, and tasks for those events.",
  guest_manager: "Full guest list, invitations and RSVPs. No budget.",
  budget_manager: "Budget and vendors only.",
  viewer: "Can view everything except settings and Mahr. Can't change anything.",
};

export default async function SettingsPage() {
  const o = await requireOrg("settings");
  const { d, ctx, events } = o;
  const w = ctx.wedding;
  const collabs = d.collaborators.filter((c) => c.weddingId === w.id);
  return (
    <>
      <PageHeader title="Settings" description="Family collaborators, permissions, and private planning details." />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Family & collaborators" description="Invite parents, siblings, and your planner. Each person sees only what their role allows." />
          <ul className="divide-y divide-line/70">
            {collabs.map((c) => {
              const u = d.users.find((x) => x.id === c.userId);
              const self = c.userId === ctx.user.id;
              return (
                <li key={c.id} className="px-5 py-4">
                  <form action={updateCollaborator.bind(null, "update")} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={c.id} />
                    <div className="min-w-48 flex-1">
                      <p className="font-medium">{u?.name} {self && <Badge tone="outline">you</Badge>}</p>
                      <p className="text-xs text-muted">{c.relationship} · {u?.email}</p>
                    </div>
                    {self ? <Badge tone="gold">{ROLE_LABELS[c.role]}</Badge> : (
                      <>
                        <Select name="role" defaultValue={c.role} className="h-9 w-52 text-xs">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                        {c.role === "event_organizer" && <span className="flex gap-2 text-xs">{events.map((e) => <label key={e.id} className="flex items-center gap-1"><Checkbox name="eventIds" value={e.id} defaultChecked={c.eventIds?.includes(e.id)} />{e.name}</label>)}</span>}
                        <Button size="sm" variant="outline">Update</Button>
                        <button formAction={updateCollaborator.bind(null, "remove")} className="text-xs text-muted hover:text-[#9b4d47]">Remove</button>
                      </>
                    )}
                  </form>
                </li>
              );
            })}
          </ul>
          {d.invites.length > 0 && (
            <ul className="divide-y divide-line/70 border-t border-line">
              {d.invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">{inv.name || inv.email} <Badge tone="outline">invited</Badge></p>
                    <p className="text-xs text-muted">{inv.relationship ? `${inv.relationship} · ` : ""}{inv.email} · joins as {ROLE_LABELS[inv.role]} once they create an account</p>
                  </div>
                  <form action={cancelInvite}><input type="hidden" name="id" value={inv.id} /><button className="text-xs text-muted hover:text-[#9b4d47]">Cancel</button></form>
                </li>
              ))}
            </ul>
          )}
          {!allows(o, "collaborators") ? (
            <p className="border-t border-line p-5 text-sm text-muted">Inviting family collaborators is part of Plus. <a href="/dashboard/billing" className="text-ink underline">See plans</a></p>
          ) : <form action={inviteCollaborator} className="grid gap-3 border-t border-line p-5 md:grid-cols-2">
            <Field label="Name"><Input name="name" placeholder="Bilal Siddiqui" /></Field>
            <Field label="Email"><Input name="email" type="email" required /></Field>
            <Field label="Relationship"><Input name="relationship" placeholder="Bride's brother" /></Field>
            <Field label="Role"><Select name="role">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field group label="Events (for event organizers)" className="md:col-span-2"><div className="flex flex-wrap gap-3 text-sm">{events.map((e) => <label key={e.id} className="flex items-center gap-1.5"><Checkbox name="eventIds" value={e.id} />{e.name}</label>)}</div></Field>
            <div><Button>Send invite</Button></div>
          </form>}
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Roles" />
            <dl className="space-y-3 p-5 text-sm">
              {(Object.keys(ROLE_HELP) as Role[]).map((r) => <div key={r}><dt className="font-medium">{ROLE_LABELS[r]}</dt><dd className="text-xs text-muted">{ROLE_HELP[r]}</dd></div>)}
            </dl>
          </Card>
          {can(o.scope, "mahr") && (
            <Card>
              <CardHeader title="Mahr" description="Private. Only administrators can see this, and it never appears on the website." />
              <form action={saveMahr} className="grid gap-3 p-5">
                <Field label="Agreed Mahr"><Input name="amount" defaultValue={w.mahr?.amount} /></Field>
                <Field label="Notes"><Textarea name="notes" rows={3} defaultValue={w.mahr?.notes} /></Field>
                <div><Button size="sm" variant="outline">Save</Button></div>
              </form>
            </Card>
          )}
          {demoEnabled() && w.id === DEMO_WEDDING_ID && (
            <Card>
              <CardHeader title="Demo data" />
              <form action={resetDemo} className="p-5">
                <p className="mb-3 text-sm text-muted">Restore Ayesha &amp; Omar&apos;s sample wedding to its original state. All changes and RSVPs are discarded and every invitation link is re-issued.</p>
                <ConfirmButton message="Reset all demo data?" className="inline-flex h-9 items-center rounded-full border border-rose/40 px-4 text-sm text-[#9b4d47] hover:bg-rose-soft">Reset demo data</ConfirmButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
