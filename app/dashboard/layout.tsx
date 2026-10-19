import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { organizerContext } from "@/lib/auth";
import { can, ROLE_LABELS, scopeFor, type Area } from "@/lib/access";
import { logout } from "@/lib/actions/auth";
import { Badge, Logo } from "@/components/ui";
import { DashNav, type NavKey } from "@/components/dash/nav";
import { DemoBar } from "@/components/demo-bar";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

const ITEMS: { key: NavKey; area: Area; label: string; href: string }[] = [
  { key: "dashboard", area: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "website", area: "website", label: "Our Wedding Website", href: "/dashboard/website" },
  { key: "events", area: "events", label: "Events", href: "/dashboard/events" },
  { key: "guests", area: "guests", label: "Guest List", href: "/dashboard/guests" },
  { key: "invitations", area: "invitations", label: "Invitations", href: "/dashboard/invitations" },
  { key: "rsvps", area: "rsvps", label: "RSVPs", href: "/dashboard/rsvps" },
  { key: "checklist", area: "checklist", label: "Planning Checklist", href: "/dashboard/checklist" },
  { key: "budget", area: "budget", label: "Budget", href: "/dashboard/budget" },
  { key: "vendors", area: "vendors", label: "Vendors", href: "/dashboard/vendors" },
  { key: "settings", area: "settings", label: "Settings", href: "/dashboard/settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await organizerContext();
  if (!ctx) redirect("/login");
  const scope = scopeFor(ctx.collaborator.role, ctx.collaborator.eventIds);
  const items = ITEMS.filter((i) => can(scope, i.area)).map(({ key, label, href }) => ({ key, label, href }));
  const w = ctx.wedding;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="flex items-center justify-between px-4 py-3 lg:px-2 lg:py-0">
          <Link href="/dashboard"><Logo className="text-xl" /></Link>
          <form action={logout} className="lg:hidden"><button className="text-xs text-muted">Sign out</button></form>
        </div>
        <div className="mx-2 my-5 hidden rounded-2xl border border-line bg-white p-4 lg:block">
          <p className="font-serif text-xl leading-tight">{w.partner1} &amp; {w.partner2}</p>
          <p className="mt-0.5 text-xs text-muted">{ctx.user.name} · {ctx.collaborator.relationship}</p>
          <Badge tone="gold" className="mt-2">{ROLE_LABELS[ctx.collaborator.role]}</Badge>
          <Link href={`/w/${w.slug}`} target="_blank" className="mt-3 flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink">
            <ExternalLink className="h-3 w-3" /> /w/{w.slug}
          </Link>
        </div>
        <DashNav items={items} />
        <form action={logout} className="absolute bottom-6 left-6 hidden lg:block">
          <button className="flex items-center gap-2 text-xs text-muted hover:text-ink"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:px-10 lg:pt-10">{children}</main>
      {w.id === "wed_ayesha_omar" && <DemoBar current={`Wedding administrator · ${ctx.user.name}`} />}
    </div>
  );
}
