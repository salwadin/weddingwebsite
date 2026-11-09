import { ROLE_LABELS } from "@/lib/access";
import { staffAddPerson, staffInvite, staffUpdatePerson } from "@/lib/actions/staff-weddings";
import { shortDate } from "@/lib/format";
import { adminClient } from "@/lib/supabase/server";
import { Badge, Card, Input, Select } from "@/components/ui";
import { PendingButton } from "@/components/pending-button";

// /admin?tab=weddings: every wedding and the people on it (administrators, family,
// planners), with pending invitations. Staff can add people, change roles, remove
// people, and resend or cancel invitations.

const ROLES = Object.entries(ROLE_LABELS);

function RoleSelect({ value }: { value?: string }) {
  return (
    <Select name="role" defaultValue={value ?? "admin"} aria-label="Role" className="h-9 text-sm">
      {ROLES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </Select>
  );
}

export async function WeddingsTab({ search }: { search: string }) {
  const admin = adminClient();
  const [{ data: weddings }, { data: collabs }, { data: invites }] = await Promise.all([
    admin.from("weddings").select("id,slug,partner1,partner2,plan,created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("wedding_collaborators").select("id,wedding_id,user_id,role,relationship,invited_at").order("invited_at"),
    admin.from("collaborator_invites").select("id,wedding_id,email,name,role,relationship,created_at").order("created_at"),
  ]);
  const userIds = [...new Set((collabs ?? []).map((c) => c.user_id as string))];
  const { data: profiles } = userIds.length ? await admin.from("profiles").select("id,name,email").in("id", userIds) : { data: [] };
  const person = new Map((profiles ?? []).map((p) => [p.id as string, p as { name: string; email: string }]));

  const list = (weddings ?? []).map((w) => ({
    ...w,
    people: (collabs ?? []).filter((c) => c.wedding_id === w.id).map((c) => ({ ...c, ...person.get(c.user_id) })),
    pending: (invites ?? []).filter((i) => i.wedding_id === w.id),
  })).filter((w) => !search || [w.partner1, w.partner2, w.slug, ...w.people.flatMap((p) => [p.name, p.email]), ...w.pending.flatMap((i) => [i.name, i.email])]
    .some((x) => String(x ?? "").toLowerCase().includes(search)));

  if (list.length === 0) return <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">No weddings match.</p>;

  return (
    <div className="space-y-4">
      {list.map((w) => {
        const admins = w.people.filter((p) => p.role === "admin").length;
        return (
          <Card key={w.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-2xl leading-tight">{w.partner1} &amp; {w.partner2}</p>
                <p className="text-sm text-muted">qubool.app/w/{w.slug} · created {shortDate(String(w.created_at).slice(0, 10))}</p>
              </div>
              <Badge tone="outline" className="capitalize">{w.plan}</Badge>
            </div>

            <ul className="mt-4 divide-y divide-line/70 rounded-xl border border-line">
              {w.people.map((p) => {
                const lastAdmin = p.role === "admin" && admins <= 1;
                return (
                  <li key={p.id}>
                    <form action={staffUpdatePerson.bind(null, "role")} className="grid items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_220px_auto]">
                      <input type="hidden" name="id" value={p.id} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name ?? "Unknown"}{p.relationship ? <span className="font-normal text-muted"> · {p.relationship}</span> : null}</p>
                        <p className="truncate text-xs text-muted">{p.email}</p>
                      </div>
                      <RoleSelect value={p.role} />
                      <div className="flex gap-1.5">
                        <PendingButton size="sm" variant="outline" pendingLabel="Saving…">Save</PendingButton>
                        {!lastAdmin && <PendingButton size="sm" variant="danger" formAction={staffUpdatePerson.bind(null, "remove")} pendingLabel="Removing…">Remove</PendingButton>}
                      </div>
                    </form>
                  </li>
                );
              })}
              {w.pending.map((i) => (
                <li key={i.id}>
                  <form action={staffInvite.bind(null, "resend")} className="grid items-center gap-2 bg-cream/40 px-3 py-2.5 sm:grid-cols-[1fr_220px_auto]">
                    <input type="hidden" name="id" value={i.id} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.name || i.email} <Badge tone="gold" className="ml-1 py-0 text-[10px]">Invited, no account yet</Badge></p>
                      <p className="truncate text-xs text-muted">{i.email} · invited {shortDate(String(i.created_at).slice(0, 10))}</p>
                    </div>
                    <p className="text-sm text-muted">{ROLE_LABELS[i.role as keyof typeof ROLE_LABELS]}</p>
                    <div className="flex gap-1.5">
                      <PendingButton size="sm" variant="outline" pendingLabel="Sending…">Resend</PendingButton>
                      <PendingButton size="sm" variant="ghost" formAction={staffInvite.bind(null, "cancel")} pendingLabel="Canceling…">Cancel</PendingButton>
                    </div>
                  </form>
                </li>
              ))}
              {w.people.length + w.pending.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No one yet.</li>}
            </ul>

            <form action={staffAddPerson} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr_1fr_220px_auto]">
              <input type="hidden" name="weddingId" value={w.id} />
              <Input name="name" placeholder="Name" aria-label="Name" className="h-9 text-sm" />
              <Input name="email" type="email" required placeholder="Email" aria-label="Email" className="h-9 text-sm" />
              <Input name="relationship" placeholder="Relationship (optional)" aria-label="Relationship" className="h-9 text-sm" />
              <RoleSelect />
              <PendingButton size="sm" pendingLabel="Adding…" className="h-9">Add person</PendingButton>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
