import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { allows, requireOrg } from "@/lib/dashboard";
import { addFitting, deleteOutfit, removePiece, saveOutfit, toggleFitting, togglePiece } from "@/lib/actions/outfits";
import { cn, shortDate, SIDES } from "@/lib/format";
import type { Outfit } from "@/lib/types";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/dash/nav";
import { OUTFIT_STATUSES } from "@/components/dash/outfit-card";
import { UpgradeGate } from "@/components/dash/upgrade-gate";

const BLANK: Omit<Outfit, "id" | "weddingId"> = {
  wearer: "", role: "bride", side: "bride", title: "", designer: "", status: "idea", colors: [], cost: 0, paid: 0, pieces: [], fittings: [],
};

export default async function OutfitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const o = await requireOrg("outfits");
  if (!allows(o, "outfits")) return <UpgradeGate feature="outfits" canManageBilling={can(o.scope, "billing")} />;
  const isNew = id === "new";
  const found = o.d.outfits.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id
    && (!o.scope.side || x.side === o.scope.side || x.side === "both")
    && (!o.scope.eventIds || o.scope.eventIds.includes(x.eventId ?? "")));
  if (!isNew && !found) notFound();
  const x = found ?? { ...BLANK, id: "", weddingId: o.ctx.wedding.id, side: o.scope.side ?? "bride", eventId: o.scope.eventIds?.[0] };
  const editable = can(o.scope, "outfits", "edit");
  const vendors = o.d.vendors.filter((v) => v.weddingId === o.ctx.wedding.id);

  return (
    <>
      <Link href="/dashboard/outfits" className="text-xs text-muted hover:text-ink">← All outfits</Link>
      <PageHeader title={isNew ? "Add a look" : x.title} description={isNew ? "Plan an outfit for anyone in the wedding: the couple, parents, siblings, or the whole bridal party." : `${x.wearer} · ${o.events.find((e) => e.id === x.eventId)?.name ?? "Any event"}`} />
      {saved && <p className="mb-4 rounded-xl bg-sage-soft px-4 py-2.5 text-sm text-[#3f5238]">Saved.</p>}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <form action={saveOutfit}>
          <input type="hidden" name="id" value={x.id} />
          <fieldset disabled={!editable}>
            <Card>
              <CardHeader title="The look" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Outfit" className="sm:col-span-2"><Input name="title" defaultValue={x.title} required placeholder="Red bridal lehenga, ivory thobe, bindallı…" /></Field>
                <Field label="Who's wearing it"><Input name="wearer" defaultValue={x.wearer} required placeholder="Ayesha, Groom's mother, Bridesmaids (6)" /></Field>
                <Field label="Role">
                  <Select name="role" defaultValue={x.role}><option value="bride">Bride</option><option value="groom">Groom</option><option value="family">Family</option><option value="party">Bridal party</option><option value="other">Other</option></Select>
                </Field>
                <Field label="Event">
                  <Select name="eventId" defaultValue={x.eventId ?? ""}>{!o.scope.eventIds && <option value="">Not tied to an event</option>}{o.events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
                </Field>
                <Field label="Family side">
                  <Select name="side" defaultValue={x.side} disabled={!!o.scope.side}>{Object.entries(SIDES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                </Field>
                <Field label="Designer / store"><Input name="designer" defaultValue={x.designer} /></Field>
                <Field label="Linked vendor">
                  <Select name="vendorId" defaultValue={x.vendorId ?? ""}><option value="">None</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
                </Field>
                <Field label="Status">
                  <Select name="status" defaultValue={x.status}>{OUTFIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
                </Field>
                <Field label="Needed by"><Input type="date" name="dueDate" defaultValue={x.dueDate} /></Field>
                <Field label="Cost (USD)"><Input type="number" name="cost" min={0} defaultValue={x.cost || ""} /></Field>
                <Field label="Paid so far"><Input type="number" name="paid" min={0} defaultValue={x.paid || ""} /></Field>
                <Field label="Colors" hint="Hex colors, comma separated" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Input name="colors" defaultValue={x.colors.join(", ")} placeholder="#7A1F2B, #B08D57" />
                    <span className="flex shrink-0 gap-1">{x.colors.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-line" style={{ background: c }} />)}</span>
                  </div>
                </Field>
                <Field label="Inspiration photo URL" className="sm:col-span-2"><Input name="image" defaultValue={x.image ?? ""} placeholder="https://…" /></Field>
                <Field label={isNew ? "Pieces to track" : "Add pieces"} hint="One per line: dupatta, jewelry, shoes, sehra…" className="sm:col-span-2"><Textarea name="addPieces" rows={3} /></Field>
                <Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={x.notes} /></Field>
                {editable && <div className="sm:col-span-2"><Button size="lg">{isNew ? "Add look" : "Save changes"}</Button></div>}
              </div>
            </Card>
          </fieldset>
        </form>

        {!isNew && (
          <div className="grid content-start gap-5">
            {x.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={x.image} alt="" className="arch-mask aspect-[4/3] w-full object-cover" />
            )}
            <Card>
              <CardHeader title="Pieces" description={`${x.pieces.filter((p) => p.done).length} of ${x.pieces.length} done`} />
              <ul className="divide-y divide-line/70">
                {x.pieces.length === 0 && <li className="px-5 py-4 text-sm text-muted">Add pieces like the dupatta, jewelry and shoes in the form.</li>}
                {x.pieces.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <form action={togglePiece}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="pieceId" value={p.id} />
                      <button disabled={!editable} aria-label={p.done ? `Mark ${p.name} not done` : `Mark ${p.name} done`} className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-xs", p.done ? "border-sage bg-sage text-white" : "border-line")}>{p.done ? "✓" : ""}</button>
                    </form>
                    <span className={cn("flex-1", p.done && "text-muted line-through")}>{p.name}</span>
                    {editable && <form action={removePiece}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="pieceId" value={p.id} /><button className="text-xs text-muted hover:text-[#9b4d47]" aria-label={`Remove ${p.name}`}>✕</button></form>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Fittings & appointments" />
              <ul className="divide-y divide-line/70">
                {x.fittings.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <form action={toggleFitting}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="fittingId" value={f.id} />
                      <button disabled={!editable} aria-label={f.done ? "Mark not done" : "Mark done"} className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-xs", f.done ? "border-sage bg-sage text-white" : "border-line")}>{f.done ? "✓" : ""}</button>
                    </form>
                    <span className="w-24 shrink-0 text-xs text-muted">{shortDate(f.date)}</span>
                    <span className={cn("flex-1", f.done && "text-muted line-through")}>{f.note || "Fitting"}</span>
                  </li>
                ))}
              </ul>
              {editable && (
                <form action={addFitting} className="flex flex-wrap gap-2 border-t border-line/70 p-4">
                  <input type="hidden" name="id" value={x.id} />
                  <Input type="date" name="date" required className="h-9 w-40" aria-label="Fitting date" />
                  <Input name="note" placeholder="What's this appointment for?" className="h-9 flex-1" aria-label="Note" />
                  <Button size="sm" variant="outline">Add</Button>
                </form>
              )}
            </Card>
            {editable && (
              <form action={deleteOutfit}>
                <input type="hidden" name="id" value={x.id} />
                <ConfirmButton message={`Delete ${x.title}?`} className="text-sm text-[#9b4d47] hover:underline">Delete this look</ConfirmButton>
              </form>
            )}
          </div>
        )}
      </div>
    </>
  );
}
