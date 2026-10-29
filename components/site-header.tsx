import Link from "next/link";
import { ButtonLink, Logo } from "./ui";

/** Header for Qubool's own marketing and marketplace pages. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/" aria-label="Qubool home"><Logo className="text-3xl sm:text-4xl" /></Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link href="/marketplace" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink/80 hover:bg-cream lg:block">Find Vendors</Link>
        <Link href="/pricing" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink/80 hover:bg-cream sm:block">Pricing</Link>
        <ButtonLink href="/login" variant="ghost" size="sm">Sign In</ButtonLink>
        <ButtonLink href="/beta" size="sm">Request Access</ButtonLink>
      </nav>
    </header>
  );
}

/** Closing brand band for Qubool's own pages: the big wordmark, the tagline, and the links. */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-ivory">
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Logo tagline className="text-[22vw] text-ivory sm:text-[9rem]" />
            <p className="mt-6 text-xs uppercase tracking-[0.4em] text-blush">One Wedding. Every Celebration.</p>
          </div>
          <Link href="/beta" className="inline-flex h-12 items-center rounded-full bg-ivory px-7 text-xs font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-blush">Request Early Access</Link>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ivory/15 pt-6 text-sm text-ivory/60">
          <p>Already invited? <Link href="/signup" className="underline underline-offset-2 hover:text-ivory">Create your account</Link></p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/pricing" className="hover:text-ivory">Pricing</Link>
            <Link href="/marketplace" className="hover:text-ivory">Find Vendors</Link>
            <Link href="/privacy" className="hover:text-ivory">Privacy</Link>
            <Link href="/terms" className="hover:text-ivory">Terms</Link>
            <Link href="/sms" className="hover:text-ivory">Text messages</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
