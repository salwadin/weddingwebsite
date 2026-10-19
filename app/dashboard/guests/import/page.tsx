import Link from "next/link";
import { requireOrg } from "@/lib/dashboard";
import { importCsv } from "@/lib/actions/dashboard";
import { Card, PageHeader } from "@/components/ui";
import { ImportForm } from "@/components/dash/import-form";

export default async function ImportPage() {
  const o = await requireOrg("guests", "edit");
  return (
    <>
      <Link href="/dashboard/guests" className="text-xs text-muted hover:text-ink">← Guest list</Link>
      <PageHeader title="Import guests" description="Paste rows from a spreadsheet or upload a CSV. Each row is a household. Separate members and events with semicolons." />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5"><ImportForm action={importCsv} /></Card>
        <Card className="p-5 text-sm">
          <h3 className="font-serif text-xl">Columns</h3>
          <dl className="mt-3 space-y-2 text-muted">
            <div><dt className="font-medium text-ink">household</dt><dd>How the invitation is addressed</dd></div>
            <div><dt className="font-medium text-ink">side</dt><dd>bride, groom, or both{o.scope.side && ` (your role imports everything as ${o.scope.side})`}</dd></div>
            <div><dt className="font-medium text-ink">members</dt><dd>Names separated by “;”. Add (child) or (plus one) as needed.</dd></div>
            <div><dt className="font-medium text-ink">events</dt><dd>Any of: {o.events.map((e) => e.name).join(", ")}</dd></div>
            <div><dt className="font-medium text-ink">tags</dt><dd>extended_family, friends, community, vip…</dd></div>
            <div><dt className="font-medium text-ink">email, phone, relationship</dt><dd>Optional. Rows with an email already on the list are skipped as duplicates.</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
