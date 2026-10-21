import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePassword } from "@/lib/actions/auth";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

/** Reached from the reset email via /auth/confirm, which signs the user in first. */
export default async function ResetPasswordPage() {
  if (!(await currentUser())) redirect("/forgot-password");
  return (
    <div className="jali-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <Card className="p-7">
          <h1 className="font-serif text-3xl">Choose a new password</h1>
          <p className="mb-6 mt-1 text-sm text-muted">At least 8 characters.</p>
          <AuthForm action={updatePassword} mode="reset" />
        </Card>
      </div>
    </div>
  );
}
