import { cn } from "@/lib/format";
import { demoEnabled } from "@/lib/supabase/env";

export const DEMO_MODES = [
  { mode: "public", label: "Public visitor", sub: "No invitation", sees: "Sees: Nikkah" },
  { mode: "nikkah", label: "Nikkah-only guest", sub: "Qureshi family", sees: "Sees: Nikkah" },
  { mode: "shaadi", label: "Nikkah + Shaadi guest", sub: "Dr. Sana Malik", sees: "Sees: Nikkah, Shaadi" },
  { mode: "all", label: "All-events guest", sub: "Tariq Siddiqui's family", sees: "Sees: all four events" },
  { mode: "admin", label: "Wedding administrator", sub: "Ayesha (bride)", sees: "Full planning dashboard" },
  { mode: "vendor", label: "Vendor", sub: "Noor Light Studios", sees: "Listing, inquiries & promotion" },
] as const;

/** Floating "test as…" switcher for the demo (QUBOOL_DEMO=on). Server-rendered; it only shows a label, never data. */
export function DemoBar({ current }: { current: string }) {
  if (!demoEnabled()) return null;
  return (
    <div className="no-print fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <details className="group max-w-full rounded-2xl border border-[#e6dbcf] bg-white/95 text-[#3b2b20] shadow-[0_10px_40px_-12px_rgba(43,38,32,0.35)] backdrop-blur">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-xs">
          <span className="rounded-full bg-[#3b2b20] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f7f3ec]">Demo</span>
          <span className="truncate">Viewing as <b className="font-semibold">{current}</b></span>
          <span className="text-[#8a6a52] group-open:hidden">Switch ▴</span>
          <span className="hidden text-[#8a6a52] group-open:inline">Close ▾</span>
        </summary>
        <div className="grid gap-1 border-t border-[#e6dbcf] p-2 sm:grid-cols-3 lg:grid-cols-6">
          {DEMO_MODES.map((m) => (
            <a key={m.mode} href={`/demo/${m.mode}`} className={cn("rounded-xl px-3 py-2 text-xs hover:bg-[#f4eee3]", current.startsWith(m.label) && "bg-[#f4eee3]")}>
              <div className="font-semibold">{m.label}</div>
              <div className="text-[11px] text-[#7b7166]">{m.sub}</div>
            </a>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#e6dbcf] px-4 py-2 text-[11px] text-[#7b7166]">
          <span>Sample data. Payments, emails and domains are switched off, and the demo resets every night.</span>
          <a href="/demo/exit" className="shrink-0 font-semibold text-[#3b2b20] underline">Exit demo</a>
        </div>
      </details>
    </div>
  );
}
