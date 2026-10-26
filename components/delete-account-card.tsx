import { deletionPlan } from "@/lib/account";
import { isDemoEmail } from "@/lib/demo";
import { adminClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";
import { Card, CardHeader } from "./ui";
import { DeleteAccountForm } from "./delete-account-form";

/** "Delete my account", with exactly what will happen to each wedding and listing. */
export async function DeleteAccountCard({ user, id = "delete-account" }: { user: User; id?: string }) {
  const plan = await deletionPlan(adminClient(), user.id);
  const demo = isDemoEmail(user.email);
  return (
    <Card id={id} className="scroll-mt-6 border-rose/40">
      <CardHeader title="Delete account" description="Permanently delete your Qubool account. This can't be undone." />
      <div className="space-y-4 p-5 text-sm">
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          {plan.deleteWeddings.map((w) => (
            <li key={w.id}>
              <b className="text-ink">{w.name}</b> will be deleted for everyone: its website, events, guest list, RSVPs, budget and uploaded photos.
              {w.others > 0 && <> {w.others === 1 ? "1 other collaborator" : `${w.others} other collaborators`} will lose access. To keep it going without you, make one of them a Full administrator first.</>}
            </li>
          ))}
          {plan.leaveWeddings.map((w) => (
            <li key={w.id}><b className="text-ink">{w.name}</b> stays: another administrator runs it. You&apos;ll just be removed from it.</li>
          ))}
          {plan.listings.map((l) => (
            <li key={l.id}>Your listing <b className="text-ink">{l.name}</b> and its inquiries will be deleted, and any promotion subscription cancelled right away (no further charges).</li>
          ))}
          <li>Your name, email and sign-in are deleted. Payment records are kept as tax and accounting rules require.</li>
        </ul>
        {demo ? <p className="text-xs text-muted">The shared demo accounts can&apos;t be deleted.</p> : null}
        <DeleteAccountForm disabled={demo} />
      </div>
    </Card>
  );
}
