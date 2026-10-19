import { Mail, Phone } from "lucide-react";
import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { deleteVendor, saveVendor, setVendorStatus } from "@/lib/actions/dashboard";
import { money } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Checkbox, Input, PageHeader, Select } from "@/components/ui";

const CATS = ["Venue", "Catering", "Decor", "Photography", "Videography", "Makeup", "Henna", "Florist", "Invitations", "Transportation", "DJ / Music", "Officiant", "Other"];
const STATUS = { researching: "outline", contacted: "gold", booked: "sage", paid: "ink" } as const;

export default async function VendorsPage() {
  const o = await requireOrg("vendors");
  const { d, events } = o;
  const canEdit = can(o.scope, "vendors", "edit");
  const vendors = d.vendors.filter((v) => v.weddingId === o.ctx.wedding.id).filter((v) => !o.scope.eventIds || v.eventIds.some((e) => o.scope.eventIds!.includes(e)));
  const spend = (vid: string) => d.expenses.filter((x) => x.vendorId === vid).reduce((n, x) => ({ total: n.total + (x.actual || x.estimated), paid: n.paid + x.paid }), { total: 0, paid: 0 });
  const cats = [...new Set(vendors.map((v) => v.category))].sort((a, b) => CATS.indexOf(a) - CATS.indexOf(b));

  return (
    <>
      <PageHeader title="Vendors" description={`${vendors.filter((v) => v.status === "booked" || v.status === "paid").length} of ${vendors.length} vendors booked.`} />
      {cats.map((c) => (
        <section key={c} className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">{c}</h2>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {vendors.filter((v) => v.category === c).map((v) => {
              const s = spend(v.id);
              return (
                <Card key={v.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><h3 className="font-serif text-xl leading-tight">{v.name}</h3><p className="text-xs text-muted">{v.contact}</p></div>
                    <Badge tone={STATUS[v.status]}>{v.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">{v.eventIds.map((id) => <Badge key={id} tone="outline">{events.find((e) => e.id === id)?.name ?? ""}</Badge>)}</div>
                  {v.notes && <p className="mt-3 text-sm text-muted">{v.notes}</p>}
                  <div className="mt-3 space-y-1 text-xs text-muted">
                    {v.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{v.phone}</p>}
                    {v.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{v.email}</p>}
                  </div>
                  {s.total > 0 && <p className="mt-3 text-sm">{money(s.paid)} paid of {money(s.total)}</p>}
                  {canEdit && (
                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <form action={setVendorStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={v.id} />
                        <Select name="status" defaultValue={v.status} className="h-8 w-32 text-xs">{Object.keys(STATUS).map((s) => <option key={s}>{s}</option>)}</Select>
                        <Button size="sm" variant="ghost">Update</Button>
                      </form>
                      <form action={deleteVendor} className="ml-auto"><input type="hidden" name="id" value={v.id} /><button className="text-xs text-muted hover:text-[#9b4d47]">Remove</button></form>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      {canEdit && (
        <Card>
          <CardHeader title="Add a vendor" />
          <form action={saveVendor} className="grid gap-3 p-5 md:grid-cols-3">
            <Input name="name" placeholder="Business name" required />
            <Select name="category">{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
            <Input name="contact" placeholder="Contact person" />
            <Input name="phone" placeholder="Phone" />
            <Input name="email" type="email" placeholder="Email" />
            <Select name="status">{Object.keys(STATUS).map((s) => <option key={s}>{s}</option>)}</Select>
            <div className="flex flex-wrap gap-3 text-sm md:col-span-2">{events.map((e) => <label key={e.id} className="flex items-center gap-1.5"><Checkbox name="eventIds" value={e.id} /> {e.name}</label>)}</div>
            <Input name="notes" placeholder="Notes" />
            <div><Button>Add vendor</Button></div>
          </form>
        </Card>
      )}
    </>
  );
}
