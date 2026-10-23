import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { deleteExpense, saveExpense, setTotalBudget } from "@/lib/actions/dashboard";
import { money, SIDES } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress, Select, Stat } from "@/components/ui";

const CATEGORIES = ["Venue", "Catering", "Decor", "Photography", "Videography", "Attire", "Jewelry", "Makeup", "Henna", "Florist", "Invitations", "Transportation", "Mahr", "Gifts", "Other"];

export default async function BudgetPage() {
  const o = await requireOrg("budget");
  const { d, events, scope } = o;
  const w = o.ctx.wedding;
  const canEdit = can(scope, "budget", "edit");
  const all = d.expenses.filter((x) => x.weddingId === w.id);
  const expenses = all.filter((x) => !scope.side || x.responsibility === scope.side || x.responsibility === "both");
  const cost = (x: (typeof all)[number]) => x.actual || x.estimated;
  const committed = expenses.reduce((n, x) => n + cost(x), 0);
  const paid = expenses.reduce((n, x) => n + x.paid, 0);
  const vendors = d.vendors.filter((v) => v.weddingId === w.id);
  const bySide = (["bride", "groom", "both"] as const).map((s) => ({ s, total: all.filter((x) => x.responsibility === s).reduce((n, x) => n + cost(x), 0), paid: all.filter((x) => x.responsibility === s).reduce((n, x) => n + x.paid, 0) }));
  const byCat = Object.entries(expenses.reduce<Record<string, number>>((m, x) => ((m[x.category] = (m[x.category] ?? 0) + cost(x)), m), {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title="Budget" description={scope.side ? `Showing expenses that are the ${scope.side}'s family's responsibility, plus shared costs. Costs of events private to the other family aren't shown.` : "Track costs by event and category, and see who is responsible for each."} />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Total budget" value={money(w.totalBudget)} />
            <Stat label="Committed" value={money(committed)} tone={committed > w.totalBudget ? "rose" : "gold"} />
            <Stat label="Paid" value={money(paid)} tone="sage" />
            <Stat label="Remaining balance" value={money(committed - paid)} />
          </div>
          {!scope.side && <Progress className="mt-5" value={(committed / Math.max(1, w.totalBudget)) * 100} tone={committed > w.totalBudget ? "rose" : "gold"} />}
          {canEdit && !scope.side && (
            <form action={setTotalBudget} className="mt-4 flex items-center gap-2">
              <Input name="total" type="number" defaultValue={w.totalBudget} className="h-9 w-40" aria-label="Total budget" />
              <Button size="sm" variant="outline">Update total</Button>
            </form>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-serif text-xl">Family responsibilities</h3>
          <div className="mt-4 space-y-3">
            {bySide.filter((b) => !scope.side || b.s === scope.side || b.s === "both").map((b) => (
              <div key={b.s}>
                <div className="flex justify-between text-sm"><span>{SIDES[b.s]}</span><span className="tabular-nums">{money(b.paid)} / {money(b.total)}</span></div>
                <Progress value={b.total ? (b.paid / b.total) * 100 : 0} tone={b.s === "bride" ? "rose" : b.s === "groom" ? "sage" : "gold"} className="mt-1" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="By event" />
          <ul className="divide-y divide-line/70 text-sm">
            {events.map((e) => {
              const c = expenses.filter((x) => x.eventId === e.id).reduce((n, x) => n + cost(x), 0);
              return (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex justify-between"><span>{e.name}</span><span className="tabular-nums">{money(c)} <span className="text-muted">/ {money(e.budget)}</span></span></div>
                  <Progress className="mt-1.5" value={e.budget ? (c / e.budget) * 100 : 0} tone={c > e.budget ? "rose" : "gold"} />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="By category" />
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 p-5 text-sm">
            {byCat.map(([c, n]) => <li key={c} className="flex justify-between"><span className="text-muted">{c}</span><span className="tabular-nums">{money(n)}</span></li>)}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Expenses & vendor payments" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line bg-cream/40 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
              <tr><th className="px-5 py-2.5 font-medium">Item</th><th className="px-2 font-medium">Event</th><th className="px-2 font-medium">Paid by</th><th className="px-2 text-right font-medium">Estimate</th><th className="px-2 text-right font-medium">Actual</th><th className="px-2 font-medium">Paid / deposit</th><th className="px-2 text-right font-medium">Balance</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {expenses.map((x) => {
                const v = vendors.find((y) => y.id === x.vendorId);
                const editable = canEdit && (!scope.side || x.responsibility === scope.side);
                return (
                  <tr key={x.id}>
                    <td className="px-5 py-2.5"><div>{x.description}</div><div className="text-xs text-muted">{x.category}{v && ` · ${v.name}`}{x.dueDate && ` · due ${x.dueDate}`}</div></td>
                    <td className="px-2 text-xs">{events.find((e) => e.id === x.eventId)?.name ?? "General"}</td>
                    <td className="px-2"><Badge tone={x.responsibility === "bride" ? "rose" : x.responsibility === "groom" ? "sage" : "neutral"}>{x.responsibility === "both" ? "Shared" : x.responsibility === "bride" ? "Bride's family" : "Groom's family"}</Badge></td>
                    <td className="px-2 text-right tabular-nums text-muted">{money(x.estimated)}</td>
                    <td className="px-2 text-right tabular-nums">{x.actual ? money(x.actual) : "—"}</td>
                    <td className="px-2">
                      {editable ? (
                        <form action={saveExpense} className="flex items-center gap-1">
                          {Object.entries({ id: x.id, category: x.category, description: x.description, eventId: x.eventId ?? "", vendorId: x.vendorId ?? "", estimated: x.estimated, actual: x.actual, responsibility: x.responsibility, dueDate: x.dueDate ?? "" }).map(([k, val]) => <input key={k} type="hidden" name={k} value={String(val)} />)}
                          <Input name="paid" type="number" defaultValue={x.paid} className="h-8 w-24 text-xs" aria-label="Paid" />
                          <Button size="sm" variant="ghost">Save</Button>
                        </form>
                      ) : <span className="tabular-nums">{money(x.paid)}</span>}
                    </td>
                    <td className="px-2 text-right tabular-nums">{money(cost(x) - x.paid)}</td>
                    <td className="px-3">{editable && <form action={deleteExpense}><input type="hidden" name="id" value={x.id} /><button className="text-xs text-muted hover:text-[#9b4d47]" aria-label="Delete">✕</button></form>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <form action={saveExpense} className="grid gap-2 border-t border-line p-4 md:grid-cols-4 xl:grid-cols-8">
            <Input name="description" placeholder="Description" required className="md:col-span-2" />
            <Select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
            <Select name="eventId"><option value="">General</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
            <Select name="responsibility" defaultValue={scope.side ?? "both"} disabled={!!scope.side}><option value="bride">Bride&apos;s family</option><option value="groom">Groom&apos;s family</option><option value="both">Shared</option></Select>
            <Input name="estimated" type="number" placeholder="Estimate" />
            <Input name="paid" type="number" placeholder="Deposit paid" />
            <Button>Add expense</Button>
            <Select name="vendorId" className="md:col-span-2"><option value="">No vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
          </form>
        )}
      </Card>
    </>
  );
}
