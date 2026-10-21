import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="jali-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <Card className="p-7">
          <h1 className="font-serif text-3xl">Forgot your password?</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
          <AuthForm action={requestPasswordReset} mode="forgot" />
        </Card>
        <p className="mt-5 text-center text-sm text-muted"><Link href="/login" className="text-ink underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
