import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="jali-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <Card className="p-7">
          <h1 className="font-serif text-3xl">Mubarak!</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Create an account and we&apos;ll set up your wedding in a few minutes.</p>
          <AuthForm action={signup} mode="signup" />
        </Card>
        <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-ink underline">Sign in</Link></p>
      </div>
    </div>
  );
}
