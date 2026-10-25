import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { DeleteAccountCard } from "@/components/delete-account-card";

export const metadata = { title: "Delete account" };

/** For signed-in people who don't have a dashboard or portal yet (e.g. mid-onboarding). */
export default async function DeleteAccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="jali-bg min-h-screen px-5 pb-20 pt-8">
      <div className="mx-auto mb-10 flex max-w-2xl items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href={await homeFor(user.id)} className="text-xs text-muted underline hover:text-ink">Back</Link>
      </div>
      <div className="mx-auto max-w-2xl"><DeleteAccountCard user={user} /></div>
    </div>
  );
}
