import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, Logo } from "@/components/ui";
import { DEMO_PASSWORD } from "@/lib/seed";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="jali-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <Card className="p-7">
          <h1 className="font-serif text-3xl">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Sign in to plan your wedding.</p>
          <AuthForm action={login} mode="login" />
        </Card>
        <div className="mt-5 rounded-2xl border border-line bg-white/80 p-4 text-xs text-muted">
          <p className="font-medium text-ink">Demo accounts (password <code className="rounded bg-cream px-1">{DEMO_PASSWORD}</code>)</p>
          <ul className="mt-2 space-y-0.5">
            <li>ayesha@example.com · full administrator</li>
            <li>nasreen@example.com · bride-side organizer</li>
            <li>khalid@example.com · groom-side organizer</li>
            <li>zara@example.com · Mehndi organizer</li>
            <li>hamza@example.com · budget manager</li>
            <li>planner@example.com · read-only</li>
          </ul>
        </div>
        <p className="mt-5 text-center text-sm text-muted">New here? <Link href="/signup" className="text-ink underline">Create an account</Link></p>
      </div>
    </div>
  );
}
