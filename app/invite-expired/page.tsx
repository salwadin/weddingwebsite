import { ButtonLink, Logo } from "@/components/ui";

export const metadata = { title: "Invitation link unavailable" };

export default function InviteExpired() {
  return (
    <div className="jali-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-serif text-4xl">This invitation link isn&apos;t active</h1>
      <p className="mt-3 max-w-md text-sm text-muted">It may have been replaced with a new link, or mistyped. Please check your most recent invitation message, or contact the couple&apos;s family.</p>
      <ButtonLink href="/" variant="outline" className="mt-8">Go to Qubool</ButtonLink>
    </div>
  );
}
