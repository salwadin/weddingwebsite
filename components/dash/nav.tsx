"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CheckSquare, CreditCard, Globe, Home, LayoutGrid, Mail, PiggyBank, Settings, Shirt, Store, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/format";

const ICONS = { dashboard: Home, website: Globe, events: CalendarHeart, guests: Users, invitations: Mail, rsvps: UserCheck, checklist: CheckSquare, budget: PiggyBank, vendors: Store, settings: Settings, outfits: Shirt, studio: LayoutGrid, billing: CreditCard };
export type NavKey = keyof typeof ICONS;

export function DashNav({ items }: { items: { key: NavKey; href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {items.map((i) => {
        const Icon = ICONS[i.key];
        const active = i.href === "/dashboard" ? path === "/dashboard" : path.startsWith(i.href);
        return (
          <Link key={i.key} href={i.href} className={cn(
            "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
            active ? "bg-ink text-ivory" : "text-ink/75 hover:bg-cream",
          )}>
            <Icon className="h-4 w-4" strokeWidth={1.6} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  return (
    <button type="button" className={cn("inline-flex h-8 items-center rounded-full border border-line bg-white px-3 text-xs font-medium hover:bg-cream", className)}
      onClick={async (e) => {
        const full = text.startsWith("/") ? window.location.origin + text : text;
        await navigator.clipboard.writeText(full);
        const b = e.currentTarget; const old = b.textContent; b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = old), 1400);
      }}>
      {label}
    </button>
  );
}

export function WhatsAppButton({ message, className }: { message: string; className?: string }) {
  return (
    <button type="button" className={cn("inline-flex h-8 items-center rounded-full bg-[#25d366]/15 px-3 text-xs font-medium text-[#1a7f45] hover:bg-[#25d366]/25", className)}
      onClick={() => {
        const msg = message.replace(/(\/i\/[A-Za-z0-9_-]+|\/w\/[a-z0-9-]+[^\s]*)/g, (m) => window.location.origin + m);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      }}>
      Share on WhatsApp
    </button>
  );
}

export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>
  );
}
