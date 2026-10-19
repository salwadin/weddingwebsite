import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { deleteHousehold, regenerateToken, removeGuest, revokeToken, saveInvitations, setRsvp, updateHousehold } from "@/lib/actions/dashboard";
import { SIDES, TAGS } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ConfirmButton, CopyButton, WhatsAppButton } from "@/components/dash/nav";

export default async function HouseholdPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const o = await requireOrg("guests");
  const h = o.households.find((x) => x.id === id);
  if (!h) notFound(); // outside this organizer's scope looks identical to nonexistent
  const { d, events, scope } = o;
  const w = o.ctx.wedding;
  const members = d.guests.filter((g) => g.householdId === h.id);
  const invs = d.invitations.filter((i) => i.householdId === h.id);
  const token = d.tokens.filter((t) => t.householdId === h.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const active = token && !token.revokedAt;
  const link = active ? `/i/${token.token}` : "";
  const invitedEvents = events.filter((e) => invs.some((i) => i.eventId === e.id));
  const canGuests = can(scope, "guests", "edit"), canInv = can(scope, "invitations", "edit"), canRsvp = can(scope, "rsvps", "edit");
  const history = d.audit.filter((a) => a.weddingId === w.id && (a.detail.includes(h.name) || a.actor === h.name)).slice(0, 10);

  return (
    <>
      <Link href="/dashboard/guests" className="text-xs text-muted hover:text-ink">← Guest list</Link>
      <PageHeader title={h.name} description={<>{h.relationship || "—"} · {SIDES[h.side]} · {members.length} {members.length === 1 ? "person" : "people"}</>}
        actions={<div className="flex flex-wrap gap-1.5">{h.tags.map((t) => <Badge key={t} tone={t === "vip" ? "gold" : "neutral"}>{TAGS[t] ?? t}</Badge>)}</div>} />
      {saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">Saved.</p>}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Invitations" description="Choose exactly which members are invited to each event. Uninvited events are invisible to this family." />
            <form action={saveInvitations} className="overflow-x-auto">
              <input type="hidden" name="householdId" value={h.id} />
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                  <tr><th className="px-5 py-3 font-medium">Member</th>{events.map((e) => <th key={e.id} className="px-3 py-3 text-center font-medium">{e.name}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-2.5">{m.firstName} {m.lastName} <span className="text-xs text-muted">{m.isChild ? "· child" : m.isPlusOne ? "· plus-one" : ""}</span></td>
                      {events.map((e) => (
                        <td key={e.id} className="px-3 py-2.5 text-center">
                          <Checkbox name={`inv:${e.id}:${m.id}`} disabled={!canInv} defaultChecked={invs.some((i) => i.eventId === e.id && i.guestIds.includes(m.id))} aria-label={`${m.firstName} invited to ${e.name}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {canInv && <div className="border-t border-line/70 px-5 py-3"><Button size="sm">Save invitations</Button></div>}
            </form>
          </Card>

          <Card>
            <CardHeader title="RSVP status" description={canRsvp ? "Update a reply on someone's behalf, for example after a phone call. Changes are logged." : undefined} />
            {invitedEvents.length === 0 && <p className="px-5 py-6 text-sm text-muted">Not invited to any events yet.</p>}
            <div className="divide-y divide-line/70">
              {invitedEvents.map((e) => {
                const inv = invs.find((i) => i.eventId === e.id)!;
                return (
                  <div key={e.id} className="px-5 py-4">
                    <h4 className="font-serif text-lg">{e.name}</h4>
                    <ul className="mt-2 space-y-2">
                      {inv.guestIds.map((gid) => {
                        const m = members.find((x) => x.id === gid);
                        const r = d.rsvps.find((x) => x.eventId === e.id && x.guestId === gid);
                        if (!m) return null;
                        return (
                          <li key={gid} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2">
                              {m.firstName} {m.lastName}
                              <Badge tone={r?.status === "attending" ? "sage" : r?.status === "declined" ? "rose" : "outline"}>{r?.status ?? "pending"}</Badge>
                              {r?.meal && <span className="text-xs text-muted">{r.meal}</span>}
                              {r?.updatedVia === "organizer" && <span className="text-[10px] text-muted">(set by organizer)</span>}
                            </span>
                            {canRsvp && (
                              <form action={setRsvp} className="flex items-center gap-1.5">
                                <input type="hidden" name="householdId" value={h.id} /><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="guestId" value={gid} />
                                <Select name="status" defaultValue={r?.status ?? "pending"} className="h-8 w-32 text-xs"><option value="pending">Pending</option><option value="attending">Attending</option><option value="declined">Declined</option></Select>
                                {e.mealOptions.length > 0 && <Select name="meal" defaultValue={r?.meal ?? ""} className="h-8 w-40 text-xs"><option value="">Meal…</option>{e.mealOptions.map((x) => <option key={x}>{x}</option>)}</Select>}
                                <Button size="sm" variant="outline">Set</Button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Household details" />
            <form action={updateHousehold} className="grid gap-4 p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={h.id} />
              <fieldset disabled={!canGuests} className="contents">
                <Field label="Invitation name" className="sm:col-span-2"><Input name="name" defaultValue={h.name} /></Field>
                <Field label="Side"><Select name="side" defaultValue={h.side} disabled={!!scope.side}>{Object.entries(SIDES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Relationship"><Input name="relationship" defaultValue={h.relationship} /></Field>
                <Field label="Email"><Input name="email" type="email" defaultValue={h.email} /></Field>
                <Field label="Phone / WhatsApp"><Input name="phone" defaultValue={h.phone} /></Field>
                <Field group label="Groups" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-3 pt-1 text-sm">{Object.entries(TAGS).map(([k, v]) => <label key={k} className="flex items-center gap-1.5"><Checkbox name="tags" value={k} defaultChecked={h.tags.includes(k)} /> {v}</label>)}</div>
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted">Members</p>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="grid grid-cols-2 gap-2 rounded-xl bg-cream/40 p-2 md:grid-cols-[1fr_1fr_1fr_110px_auto]">
                        <Input name={`first:${m.id}`} defaultValue={m.firstName} aria-label="First name" className="h-9" />
                        <Input name={`last:${m.id}`} defaultValue={m.lastName} aria-label="Last name" className="h-9" />
                        <Input name={`diet:${m.id}`} defaultValue={m.dietary} placeholder="Dietary" aria-label="Dietary" className="h-9" />
                        <Input name={`table:${m.id}`} defaultValue={m.table} placeholder="Table" aria-label="Seating" className="h-9" />
                        <label className="flex items-center gap-1.5 text-xs"><Checkbox name={`child:${m.id}`} defaultChecked={m.isChild} /> Child</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Field label="Add members" hint="One per line, e.g. “Musa Ahmed (child)”." className="sm:col-span-2"><Textarea name="addMembers" rows={2} /></Field>
                <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={h.notes} /></Field>
                {canGuests && <div><Button>Save details</Button></div>}
              </fieldset>
            </form>
            {canGuests && members.length > 1 && (
              <div className="flex flex-wrap gap-2 border-t border-line/70 px-5 py-3">
                <span className="text-xs text-muted">Remove a member:</span>
                {members.filter((m) => !m.isPrimary).map((m) => (
                  <form key={m.id} action={removeGuest}>
                    <input type="hidden" name="householdId" value={h.id} /><input type="hidden" name="guestId" value={m.id} />
                    <button className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-rose hover:text-[#9b4d47]">{m.firstName} ×</button>
                  </form>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Personal invitation link" description="Opens a website personalized for this family. Only their events are visible." />
            <div className="space-y-3 p-5 text-sm">
              {active ? (
                <>
                  <code className="block break-all rounded-xl bg-cream px-3 py-2 text-xs">{link}</code>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={link} label="Copy link" />
                    <WhatsAppButton message={`Assalamu alaikum ${h.name}! You're warmly invited to the wedding of ${w.partner1} & ${w.partner2}. Your personal invitation: ${link}`} />
                    <a href={link} target="_blank" className="inline-flex h-8 items-center rounded-full border border-line px-3 text-xs hover:bg-cream">Open as this guest ↗</a>
                  </div>
                  <p className="text-xs text-muted">Created {new Date(token.createdAt).toLocaleDateString()} · opened {token.useCount} {token.useCount === 1 ? "time" : "times"}{token.lastUsedAt && ` · last ${new Date(token.lastUsedAt).toLocaleString()}`}</p>
                </>
              ) : (
                <p className="rounded-xl bg-rose-soft px-3 py-2 text-[#8f3f39]">Access revoked. This family can only see public events.</p>
              )}
              {canInv && (
                <div className="flex flex-wrap gap-2 border-t border-line/70 pt-3">
                  <form action={regenerateToken}><input type="hidden" name="householdId" value={h.id} /><Button size="sm" variant="outline">{active ? "Issue new link" : "Restore access with new link"}</Button></form>
                  {active && <form action={revokeToken}><input type="hidden" name="householdId" value={h.id} /><ConfirmButton message="Revoke this family's link? They will immediately lose access to private events." className="inline-flex h-8 items-center rounded-full border border-rose/40 px-3 text-xs text-[#9b4d47] hover:bg-rose-soft">Revoke access</ConfirmButton></form>}
                </div>
              )}
              <p className="text-xs text-muted">Issuing a new link immediately disables the old one. Use this if a link was forwarded to someone else.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Delivery" />
            <div className="p-5 text-sm"><Badge tone={h.deliveryStatus === "bounced" ? "rose" : h.deliveryStatus === "opened" ? "sage" : "outline"}>{h.deliveryStatus.replace("_", " ")}</Badge></div>
          </Card>
          <Card>
            <CardHeader title="History" />
            <ul className="divide-y divide-line/70 text-xs">
              {history.length === 0 && <li className="px-5 py-4 text-muted">No activity yet.</li>}
              {history.map((a) => (
                <li key={a.id} className="px-5 py-2.5"><span className="text-muted">{new Date(a.at).toLocaleDateString()} · {a.actor}</span><br />{a.detail}</li>
              ))}
            </ul>
          </Card>
          {canGuests && (
            <form action={deleteHousehold}>
              <input type="hidden" name="id" value={h.id} />
              <ConfirmButton message={`Remove ${h.name} from the guest list? Their invitation link will stop working.`} className="text-sm text-[#9b4d47] hover:underline">Remove household</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
