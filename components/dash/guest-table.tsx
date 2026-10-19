"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/format";
import { Badge, Button, Checkbox, Input, Select } from "@/components/ui";

export interface GuestRow {
  id: string; name: string; side: "bride" | "groom" | "both"; relationship: string; tags: string[];
  email?: string; phone?: string; adults: number; children: number; members: string;
  events: string[]; status: Record<string, "attending" | "declined" | "partial" | "pending">;
  delivery: string; tables: string;
}
type Ev = { id: string; name: string; type: string };

const STATUS_TONE = { attending: "sage", declined: "rose", partial: "gold", pending: "outline" } as const;
const TAG_LABELS: Record<string, string> = { immediate_family: "Immediate family", extended_family: "Extended family", friends: "Friends", community: "Community", colleagues: "Colleagues", vip: "VIP" };

export function GuestTable({ rows, events, initialFilter, canEdit, bulkAction }: {
  rows: GuestRow[]; events: Ev[]; initialFilter?: string; canEdit: boolean; bulkAction: (f: FormData) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState("");
  const [tag, setTag] = useState("");
  const [segment, setSegment] = useState(initialFilter ?? "");
  const [rsvp, setRsvp] = useState("");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const byType = (t: string) => events.find((e) => e.type === t)?.id;
  const segments = useMemo(() => {
    const nik = byType("nikkah"), sha = byType("shaadi"), wal = byType("walima");
    const out: { value: string; label: string; test: (r: GuestRow) => boolean }[] = [];
    if (nik) out.push({ value: "nikkah_only", label: "Nikkah only", test: (r) => r.events.length === 1 && r.events[0] === nik });
    if (sha) out.push({ value: "shaadi_only", label: wal ? "Shaadi, not Walima" : "Shaadi", test: (r) => r.events.includes(sha) && (!wal || !r.events.includes(wal)) });
    if (wal) out.push({ value: "walima_only", label: sha ? "Walima, not Shaadi" : "Walima", test: (r) => r.events.includes(wal) && (!sha || !r.events.includes(sha)) });
    if (sha && wal) out.push({ value: "shaadi_walima", label: "Shaadi and Walima", test: (r) => r.events.includes(sha) && r.events.includes(wal) });
    out.push({ value: "all_events", label: "All events", test: (r) => events.every((e) => r.events.includes(e.id)) });
    for (const e of events) out.push({ value: `in:${e.id}`, label: `Invited to ${e.name}`, test: (r) => r.events.includes(e.id) });
    for (const e of events) out.push({ value: `not:${e.id}`, label: `Not invited to ${e.name}`, test: (r) => !r.events.includes(e.id) });
    out.push({ value: "no_contact", label: "No email or phone", test: (r) => !r.email && !r.phone });
    out.push({ value: "bounced", label: "Delivery bounced", test: (r) => r.delivery === "bounced" });
    out.push({ value: "not_sent", label: "Invitation not sent", test: (r) => r.delivery === "not_sent" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const seg = segments.find((x) => x.value === segment);
    const [rEvt, rStatus] = rsvp.split(":");
    return rows.filter((r) =>
      (!s || r.name.toLowerCase().includes(s) || r.members.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s) || r.relationship.toLowerCase().includes(s)) &&
      (!side || r.side === side) && (!tag || r.tags.includes(tag)) && (!seg || seg.test(r)) &&
      (!rsvp || (r.events.includes(rEvt) && r.status[rEvt] === rStatus)));
  }, [rows, q, side, tag, segment, rsvp, segments]);

  const PER = 40;
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice(page * PER, page * PER + PER);
  const people = filtered.reduce((n, r) => n + r.adults + r.children, 0);
  const allSelected = filtered.length > 0 && filtered.every((r) => sel.has(r.id));

  const exportCsv = () => {
    const head = ["household", "side", "relationship", "email", "phone", "members", "adults", "children", "events", ...events.map((e) => `rsvp_${e.name}`), "tags", "tables"];
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((r) => [r.name, r.side, r.relationship, r.email ?? "", r.phone ?? "", r.members, r.adults, r.children,
      events.filter((e) => r.events.includes(e.id)).map((e) => e.name).join("; "), ...events.map((e) => r.status[e.id] ?? ""), r.tags.join("; "), r.tables].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "guest-list.csv"; a.click();
  };

  const reset = () => setPage(0);

  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Search names, emails, relationships…" className="pl-9" />
        </div>
        <Select value={side} onChange={(e) => { setSide(e.target.value); reset(); }} className="lg:w-40">
          <option value="">Both sides</option><option value="bride">Bride&apos;s family</option><option value="groom">Groom&apos;s family</option><option value="both">Shared</option>
        </Select>
        <Select value={tag} onChange={(e) => { setTag(e.target.value); reset(); }} className="lg:w-44">
          <option value="">All groups</option>{Object.entries(TAG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={segment} onChange={(e) => { setSegment(e.target.value); reset(); }} className="lg:w-52">
          <option value="">All invitations</option>{segments.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select value={rsvp} onChange={(e) => { setRsvp(e.target.value); reset(); }} className="lg:w-52">
          <option value="">Any RSVP status</option>
          {events.map((e) => (["pending", "attending", "declined", "partial"] as const).map((s) => <option key={e.id + s} value={`${e.id}:${s}`}>{e.name}: {s}</option>))}
        </Select>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted"><b className="text-ink">{filtered.length}</b> households · <b className="text-ink">{people}</b> people{sel.size > 0 && <> · <b className="text-ink">{sel.size}</b> selected</>}</p>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && sel.size > 0 && (
            <form action={bulkAction} className="flex flex-wrap items-center gap-2 rounded-full bg-cream py-1 pl-3 pr-1">
              <input type="hidden" name="householdIds" value={[...sel].join(",")} />
              <Select name="mode" className="h-8 w-28 text-xs"><option value="add">Invite to</option><option value="remove">Uninvite from</option></Select>
              <Select name="eventId" className="h-8 w-32 text-xs">{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
              <Button size="sm">Apply</Button>
            </form>
          )}
          <Button variant="outline" size="sm" type="button" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line bg-cream/40 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="w-10 px-4 py-3"><Checkbox aria-label="Select all" checked={allSelected} onChange={() => setSel(allSelected ? new Set() : new Set(filtered.map((r) => r.id)))} /></th>
              <th className="px-2 py-3 font-medium">Household</th>
              <th className="px-2 py-3 font-medium">Side</th>
              <th className="px-2 py-3 text-center font-medium">Guests</th>
              {events.map((e) => <th key={e.id} className="px-2 py-3 text-center font-medium">{e.name}</th>)}
              <th className="px-2 py-3 font-medium">Invite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {shown.map((r) => (
              <tr key={r.id} className={cn("hover:bg-cream/30", sel.has(r.id) && "bg-gold-soft/20")}>
                <td className="px-4 py-3"><Checkbox aria-label={`Select ${r.name}`} checked={sel.has(r.id)} onChange={() => setSel((p) => { const n = new Set(p); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
                <td className="px-2 py-3">
                  <Link href={`/dashboard/guests/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
                    {r.relationship}
                    {r.tags.includes("vip") && <Badge tone="gold" className="py-0">VIP</Badge>}
                  </div>
                </td>
                <td className="px-2 py-3 text-xs capitalize text-muted">{r.side === "both" ? "Shared" : r.side}</td>
                <td className="px-2 py-3 text-center tabular-nums">{r.adults}{r.children ? <span className="text-muted"> + {r.children}</span> : null}</td>
                {events.map((e) => (
                  <td key={e.id} className="px-2 py-3 text-center">
                    {r.events.includes(e.id) ? <Badge tone={STATUS_TONE[r.status[e.id]]}>{r.status[e.id]}</Badge> : <span className="text-line">—</span>}
                  </td>
                ))}
                <td className="px-2 py-3 text-xs capitalize text-muted">{r.delivery.replace("_", " ")}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5 + events.length} className="px-4 py-10 text-center text-muted">No households match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-muted">Page {page + 1} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
