import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, Logo } from "@/components/ui";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <Card className="p-7">
          <h1 className="font-serif text-3xl">Welcome to the beta</h1>
          <p className="mt-1 text-sm text-muted">Create your account with the email you applied with, and we&apos;ll set up your wedding in a few minutes.</p>
          <p className="mb-6 mt-3 rounded-xl bg-cream/70 px-3 py-2 text-xs text-ink/80">Qubool is invite-only for now. Not invited yet? <Link href="/beta" className="underline">Request early access</Link>.</p>
          <AuthForm action={signup} mode="signup" />
        </Card>
        <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-ink underline">Sign in</Link></p>
        <p className="mt-3 text-center text-xs text-muted">By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
      </div>
    </div>
  );
}
