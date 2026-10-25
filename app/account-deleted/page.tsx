import { ButtonLink, Logo } from "@/components/ui";

export const metadata = { title: "Account deleted" };

export default function AccountDeleted() {
  return (
    <div className="jali-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-serif text-4xl">Your account has been deleted</h1>
      <p className="mt-3 max-w-md text-sm text-muted">We&apos;ve removed your account and the data that went with it. Thank you for planning with Qubool.</p>
      <ButtonLink href="/" variant="outline" className="mt-8">Go to Qubool</ButtonLink>
    </div>
  );
}
