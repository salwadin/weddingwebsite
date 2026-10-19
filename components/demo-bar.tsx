import Link from "next/link";
import { cn } from "@/lib/format";

export const DEMO_MODES = [
  { mode: "public", label: "Public visitor", sub: "No invitation · sees public events only" },
  { mode: "nikkah", label: "Nikkah-only guest", sub: "Qureshi family" },
  { mode: "shaadi", label: "Nikkah + Shaadi guest", sub: "Dr. Sana Malik" },
  { mode: "all", label: "All-events guest", sub: "Tariq Siddiqui's family" },
  { mode: "admin", label: "Wedding administrator", sub: "Ayesha (bride)" },
] as const;

/** Floating "test as…" switcher for the demo. Server-rendered; it only shows a label, never data. */
export function DemoBar({ current }: { current: string }) {
  return (
    <div className="no-print fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <details className="group max-w-full rounded-2xl border border-[#e7ddcd] bg-white/95 text-[#2b2620] shadow-[0_10px_40px_-12px_rgba(43,38,32,0.35)] backdrop-blur">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-xs">
          <span className="rounded-full bg-[#2b2620] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#fbf8f2]">Demo</span>
          <span className="truncate">Viewing as <b className="font-semibold">{current}</b></span>
          <span className="text-[#b08d57] group-open:hidden">Switch ▴</span>
          <span className="hidden text-[#b08d57] group-open:inline">Close ▾</span>
        </summary>
        <div className="grid gap-1 border-t border-[#e7ddcd] p-2 sm:grid-cols-5">
          {DEMO_MODES.map((m) => (
            <Link key={m.mode} href={`/demo/${m.mode}`} prefetch={false} className={cn("rounded-xl px-3 py-2 text-xs hover:bg-[#f4eee3]", current.startsWith(m.label) && "bg-[#f4eee3]")}>
              <div className="font-semibold">{m.label}</div>
              <div className="text-[11px] text-[#7b7166]">{m.sub}</div>
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
