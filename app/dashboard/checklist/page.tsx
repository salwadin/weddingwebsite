import { can } from "@/lib/access";
import { requireOrg } from "@/lib/dashboard";
import { addSuggestedTasks, addTask, deleteTask, toggleTask } from "@/lib/actions/dashboard";
import { cn, shortDate, SIDES } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress, Select } from "@/components/ui";

export default async function ChecklistPage() {
  const o = await requireOrg("checklist");
  const { d, events, scope } = o;
  const canEdit = can(scope, "checklist", "edit");
  const tasks = d.tasks.filter((t) => t.weddingId === o.ctx.wedding.id && (!scope.eventIds || scope.eventIds.includes(t.eventId ?? "")) && (!scope.side || t.side === scope.side || t.side === "both"));
  const groups = [...events.map((e) => ({ id: e.id, name: e.name, type: e.type })), ...(scope.eventIds ? [] : [{ id: "", name: "General", type: "" }])];
  const today = new Date().toISOString().slice(0, 10);
  const assignees = [...new Set(d.collaborators.filter((c) => c.weddingId === o.ctx.wedding.id).map((c) => d.users.find((u) => u.id === c.userId)?.name).filter(Boolean))] as string[];

  return (
    <>
      <PageHeader title="Planning Checklist" description="Tasks for every event, assigned to family members." />
      <Card className="mb-5 p-5">
        <div className="flex items-baseline justify-between text-sm"><span>{tasks.filter((t) => t.done).length} of {tasks.length} complete</span><span className="text-muted">{tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today).length} overdue</span></div>
        <Progress className="mt-2" value={tasks.length ? (tasks.filter((t) => t.done).length / tasks.length) * 100 : 0} />
      </Card>
      {canEdit && (
        <Card className="mb-5">
          <form action={addTask} className="grid gap-2 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input name="title" placeholder="Add a task, e.g. Book mehndi DJ" required />
            <Select name="eventId" defaultValue={scope.eventIds?.[0] ?? ""}>{!scope.eventIds && <option value="">General</option>}{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
            <Input name="assignee" list="assignees" placeholder="Assigned to" />
            <Input name="dueDate" type="date" />
            <Button>Add</Button>
            <datalist id="assignees">{assignees.map((a) => <option key={a} value={a} />)}</datalist>
          </form>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => {
          const list = tasks.filter((t) => (t.eventId ?? "") === g.id).sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
          return (
            <Card key={g.id || "general"}>
              <CardHeader title={g.name} description={`${list.filter((t) => t.done).length}/${list.length} done`}
                action={canEdit && g.id && ["nikkah", "shaadi", "walima", "mehndi"].includes(g.type) ? (
                  <form action={addSuggestedTasks}><input type="hidden" name="eventId" value={g.id} /><Button size="sm" variant="ghost">+ Suggested tasks</Button></form>
                ) : undefined} />
              <ul className="divide-y divide-line/70">
                {list.length === 0 && <li className="px-5 py-4 text-sm text-muted">No tasks yet.</li>}
                {list.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-5 py-2.5 text-sm">
                    <form action={toggleTask}><input type="hidden" name="id" value={t.id} />
                      <button disabled={!canEdit} aria-label={t.done ? "Mark not done" : "Mark done"} className={cn("flex h-5 w-5 items-center justify-center rounded-full border", t.done ? "border-sage bg-sage text-white" : "border-line hover:border-ink")}>{t.done ? "✓" : ""}</button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={cn(t.done && "text-muted line-through")}>{t.title}</p>
                      <p className="text-xs text-muted">{t.assignee || "Unassigned"}{t.side !== "both" && ` · ${SIDES[t.side]}`}</p>
                    </div>
                    {t.dueDate && <Badge tone={!t.done && t.dueDate < today ? "rose" : "outline"}>{shortDate(t.dueDate)}</Badge>}
                    {canEdit && <form action={deleteTask} className="opacity-0 group-hover:opacity-100"><input type="hidden" name="id" value={t.id} /><button className="text-xs text-muted hover:text-[#9b4d47]" aria-label="Delete task">✕</button></form>}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
