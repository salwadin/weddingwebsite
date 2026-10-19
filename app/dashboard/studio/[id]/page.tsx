import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { allows, eventStats, requireOrg } from "@/lib/dashboard";
import { deleteBoard, saveBoard } from "@/lib/actions/studio";
import { Badge, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/dash/nav";
import { StudioCanvas } from "@/components/dash/studio-canvas";
import { UpgradeGate } from "@/components/dash/upgrade-gate";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await requireOrg("studio");
  if (!allows(o, "studio")) return <UpgradeGate feature="studio" canManageBilling={can(o.scope, "billing")} />;
  const b = o.d.boards.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id && (!o.scope.eventIds || o.scope.eventIds.includes(x.eventId ?? "")));
  if (!b) notFound();
  const e = o.events.find((x) => x.id === b.eventId);
  const editable = can(o.scope, "studio", "edit");
  // Plan for everyone who is attending or hasn't replied yet, across the whole wedding (not just this organizer's scope).
  const expected = e ? eventStats(o.d, e, o.d.households.filter((h) => h.weddingId === o.ctx.wedding.id)) : null;

  return (
    <>
      <Link href="/dashboard/studio" className="text-xs text-muted hover:text-ink">← All boards</Link>
      <PageHeader title={b.name} description={<span className="flex flex-wrap gap-1.5"><Badge tone="outline">{b.kind === "moodboard" ? "Moodboard" : "Floor plan"}</Badge>{e && <Badge>{e.name}</Badge>}</span>}
        actions={editable && (
          <form action={deleteBoard}><input type="hidden" name="id" value={b.id} />
            <ConfirmButton message={`Delete ${b.name}?`} className="text-sm text-[#9b4d47] hover:underline">Delete board</ConfirmButton>
          </form>
        )} />
      <StudioCanvas boardId={b.id} kind={b.kind} initialItems={b.items} editable={editable} save={saveBoard}
        expectedGuests={expected ? expected.attending + expected.pending + expected.publicConfirmed : undefined} eventName={e?.name} />
    </>
  );
}
