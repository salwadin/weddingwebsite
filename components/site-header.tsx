import Link from "next/link";
import { ButtonLink, Logo } from "./ui";

/** Header for Qubool's own marketing and marketplace pages. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/"><Logo /></Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link href="/marketplace" className="hidden rounded-full px-3 py-2 text-sm text-ink/75 hover:bg-cream lg:block">Vendors</Link>
        <Link href="/pricing" className="hidden rounded-full px-3 py-2 text-sm text-ink/75 hover:bg-cream sm:block">Pricing</Link>
        <Link href="/founding-vendors" className="hidden rounded-full px-3 py-2 text-sm text-ink/75 hover:bg-cream md:block">For vendors</Link>
        <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
        <ButtonLink href="/beta" size="sm">Request access</ButtonLink>
      </nav>
    </header>
  );
}
