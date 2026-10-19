import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createWedding } from "@/lib/actions/onboarding";
import { Logo } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata = { title: "Set up your wedding" };

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/signup");
  if (db().collaborators.some((c) => c.userId === user.id)) redirect("/dashboard");
  return (
    <div className="jali-bg min-h-screen px-5 pb-20 pt-8">
      <div className="mx-auto mb-10 flex max-w-3xl items-center justify-between">
        <Link href="/"><Logo /></Link>
        <span className="text-xs text-muted">About 3 minutes</span>
      </div>
      <OnboardingWizard action={createWedding} userName={user.name} />
    </div>
  );
}
