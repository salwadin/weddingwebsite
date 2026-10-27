"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Copy, Image as ImageIcon, Minus, Palette, Plus, RectangleHorizontal, Square, StickyNote, Trash2, Type, Theater } from "lucide-react";
import { cn } from "@/lib/format";
import type { BoardItem, BoardItemType } from "@/lib/types";
import { Button, Input, Textarea } from "@/components/ui";

const W = 1400, H = 900, GRID = 10;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const ADDERS: { type: BoardItemType; label: string; icon: typeof Plus; make: () => Partial<BoardItem> }[] = [
  { type: "note", label: "Note", icon: StickyNote, make: () => ({ w: 240, h: 150, text: "New note", color: "#FFF4C2" }) },
  { type: "text", label: "Heading", icon: Type, make: () => ({ w: 420, h: 60, text: "Heading" }) },
  { type: "swatch", label: "Color", icon: Palette, make: () => ({ w: 120, h: 120, color: "#B08D57", text: "Gold" }) },
  { type: "image", label: "Image", icon: ImageIcon, make: () => ({ w: 300, h: 220, src: "" }) },
  { type: "table_round", label: "Round table", icon: Circle, make: () => ({ w: 90, h: 90, text: "T", seats: 10 }) },
  { type: "table_rect", label: "Long table", icon: RectangleHorizontal, make: () => ({ w: 240, h: 60, text: "Table", seats: 10 }) },
  { type: "zone", label: "Area", icon: Square, make: () => ({ w: 300, h: 200, text: "Area", color: "#E3E8DE" }) },
  { type: "stage", label: "Stage", icon: Theater, make: () => ({ w: 320, h: 100, text: "Stage", color: "#E8D9BC" }) },
];

type Drag = { id: string; mode: "move" | "resize"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number };

export function StudioCanvas({ boardId, kind, initialItems, editable, save, expectedGuests, eventName }: {
  boardId: string; kind: "moodboard" | "floorplan"; initialItems: BoardItem[]; editable: boolean;
  save: (boardId: string, items: BoardItem[]) => Promise<{ ok: boolean; updatedAt: string }>;
  expectedGuests?: number; eventName?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const drag = useRef<Drag | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Fit the board to the available width on first render.
  useEffect(() => {
    const w = wrap.current?.clientWidth;
    if (w) setZoom(Math.max(0.35, Math.min(1, (w - 24) / W)));
  }, []);

  const commit = useCallback((next: BoardItem[]) => {
    setItems(next);
    if (!editable) return;
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try { await save(boardId, next); setStatus("saved"); } catch { setStatus("error"); }
    }, 700);
  }, [boardId, editable, save]);

  const update = (id: string, patch: Partial<BoardItem>) => commit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const selected = items.find((i) => i.id === sel) ?? null;

  const add = (a: (typeof ADDERS)[number]) => {
    const base = a.make();
    if (a.type === "image") {
      const src = prompt("Paste an image link (https://…)");
      if (!src || !/^https:\/\//.test(src)) return;
      base.src = src;
    }
    const n = items.filter((i) => i.type === a.type).length;
    const it = { id: `bi_${Date.now().toString(36)}`, type: a.type, x: 60 + (n % 8) * 30, y: 60 + (n % 8) * 30, w: 100, h: 100, ...base } as BoardItem;
    if (a.type === "table_round" || a.type === "table_rect") it.text = `T${items.filter((i) => i.type.startsWith("table")).length + 1}`;
    commit([...items, it]);
    setSel(it.id);
  };

  const remove = (id: string) => { commit(items.filter((i) => i.id !== id)); setSel(null); };
  const duplicate = (i: BoardItem) => { const c = { ...i, id: `bi_${Date.now().toString(36)}`, x: i.x + 30, y: i.y + 30 }; commit([...items, c]); setSel(c.id); };
  const toFront = (id: string) => { const i = items.find((x) => x.id === id)!; commit([...items.filter((x) => x.id !== id), i]); };

  const onPointerDown = (e: React.PointerEvent, i: BoardItem, mode: Drag["mode"]) => {
    e.stopPropagation();
    setSel(i.id);
    if (!editable) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id: i.id, mode, sx: e.clientX, sy: e.clientY, ox: i.x, oy: i.y, ow: i.w, oh: i.h };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.sx) / zoom, dy = (e.clientY - d.sy) / zoom;
    setItems((prev) => prev.map((i) => i.id !== d.id ? i : d.mode === "move"
      ? { ...i, x: snap(d.ox + dx), y: snap(d.oy + dy) }
      : { ...i, w: Math.max(30, snap(d.ow + dx)), h: Math.max(30, snap(i.type === "table_round" || i.type === "swatch" ? d.ow + dx : d.oh + dy)) }));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    commit(items);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sel || !editable) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(sel); }
      const step = e.shiftKey ? 50 : GRID;
      const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (mv[e.key]) { e.preventDefault(); const i = items.find((x) => x.id === sel)!; update(sel, { x: i.x + mv[e.key][0], y: i.y + mv[e.key][1] }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const seats = items.reduce((n, i) => n + (i.type.startsWith("table") ? i.seats ?? 0 : 0), 0);
  const tables = items.filter((i) => i.type.startsWith("table")).length;
  const adders = kind === "floorplan" ? [...ADDERS.slice(4), ...ADDERS.slice(0, 4)] : ADDERS;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {editable && adders.map((a) => (
            <button key={a.type} type="button" onClick={() => add(a)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs hover:bg-cream">
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-xs">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white"><Plus className="h-3.5 w-3.5" /></button>
            <span className={cn("ml-2 rounded-full px-2.5 py-1", status === "error" ? "bg-rose-soft text-[#8f3f39]" : "bg-cream text-muted")}>
              {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : status === "error" ? "Couldn't save" : "Unsaved"}
            </span>
          </span>
        </div>
        <div ref={wrap} className="overflow-auto rounded-2xl border border-line bg-white" style={{ maxHeight: "72vh" }}>
          <div style={{ width: W * zoom, height: H * zoom }}>
            <div
              className={cn("relative origin-top-left select-none", kind === "floorplan" ? "bg-[#fbfaf7]" : "bg-ivory")}
              style={{ width: W, height: H, transform: `scale(${zoom})`, backgroundImage: kind === "floorplan" ? "linear-gradient(#ece5d8 1px, transparent 1px), linear-gradient(90deg, #ece5d8 1px, transparent 1px)" : undefined, backgroundSize: "20px 20px" }}
              onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerDown={() => setSel(null)}
            >
              {items.map((i) => (
                <div key={i.id} onPointerDown={(e) => onPointerDown(e, i, "move")}
                  className={cn("absolute touch-none", editable && "cursor-move", sel === i.id && "outline outline-2 outline-offset-2 outline-[#8a6a52]")}
                  style={{ left: i.x, top: i.y, width: i.w, height: i.h }}>
                  <ItemView i={i} />
                  {editable && sel === i.id && (
                    <span onPointerDown={(e) => onPointerDown(e, i, "resize")} className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-[#b08d57] shadow" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Drag to move, and drag the gold dot to resize. Arrow keys nudge (hold Shift for bigger steps), and Delete removes the selected item.</p>
      </div>

      <aside className="space-y-4">
        {kind === "floorplan" && (
          <div className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-serif text-xl">Capacity</p>
            <p className="mt-1"><b className="font-serif text-3xl">{seats}</b> seats at {tables} tables</p>
            {expectedGuests !== undefined && (
              <p className={cn("mt-1 text-xs", seats < expectedGuests ? "text-[#9b4d47]" : "text-[#3f5238]")}>
                Up to {expectedGuests} guests{eventName ? ` at the ${eventName}` : ""} (attending + not yet replied). {seats < expectedGuests ? `You need ${expectedGuests - seats} more seats.` : `${seats - expectedGuests} spare seats.`}
              </p>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-line bg-white p-4 text-sm">
          {!selected ? <p className="text-muted">Select an item to edit it.</p> : (
            <div className="space-y-3">
              <p className="font-serif text-xl capitalize">{selected.type.replace("_", " ")}</p>
              {selected.type !== "image" && (
                selected.type === "note"
                  ? <Textarea rows={4} value={selected.text ?? ""} disabled={!editable} onChange={(e) => update(selected.id, { text: e.target.value })} aria-label="Text" />
                  : <Input value={selected.text ?? ""} disabled={!editable} onChange={(e) => update(selected.id, { text: e.target.value })} aria-label="Label" />
              )}
              {selected.type === "image" && <Input value={selected.src ?? ""} disabled={!editable} onChange={(e) => update(selected.id, { src: e.target.value })} aria-label="Image link" placeholder="https://…" />}
              {["note", "swatch", "zone", "stage"].includes(selected.type) && (
                <label className="flex items-center gap-2"><span className="text-xs text-muted">Color</span>
                  <input type="color" value={selected.color ?? "#ffffff"} disabled={!editable} onChange={(e) => update(selected.id, { color: e.target.value })} className="h-8 w-12 cursor-pointer rounded border border-line" />
                  <code className="text-xs">{selected.color}</code>
                </label>
              )}
              {selected.type.startsWith("table") && (
                <label className="flex items-center gap-2"><span className="text-xs text-muted">Seats</span>
                  <Input type="number" min={0} max={40} value={selected.seats ?? 0} disabled={!editable} onChange={(e) => update(selected.id, { seats: Number(e.target.value) })} className="h-8 w-20" />
                </label>
              )}
              {editable && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => duplicate(selected)}><Copy className="h-3 w-3" /> Duplicate</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => toFront(selected.id)}>Bring to front</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => remove(selected.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ItemView({ i }: { i: BoardItem }) {
  switch (i.type) {
    case "image":
      return i.src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={i.src} alt="" draggable={false} className="pointer-events-none h-full w-full rounded-xl object-cover shadow-sm" />
        : <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted">Add an image link</div>;
    case "note":
      return <div className="h-full w-full overflow-hidden rounded-md p-3 font-serif text-lg leading-snug shadow-md" style={{ background: i.color ?? "#FFF4C2" }}>{i.text}</div>;
    case "swatch":
      return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex-1" style={{ background: i.color }} />
          <div className="px-2 py-1 text-[11px] leading-tight"><b>{i.text}</b> <span className="text-muted">{i.color}</span></div>
        </div>
      );
    case "text":
      return <div className="h-full w-full font-serif text-4xl leading-tight">{i.text}</div>;
    case "table_round": {
      const seats = Math.min(i.seats ?? 0, 24), r = i.w / 2;
      return (
        <div className="relative h-full w-full">
          {Array.from({ length: seats }, (_, k) => {
            const a = (k / seats) * Math.PI * 2;
            return <span key={k} className="absolute h-3 w-3 rounded-full bg-[#d9cdb6]" style={{ left: Math.round(r + Math.cos(a) * (r + 7) - 6), top: Math.round(r + Math.sin(a) * (r + 7) - 6) }} />;
          })}
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-[#cdbb98] bg-white text-xs shadow-sm">
            <b>{i.text}</b><span className="text-[10px] text-muted">{i.seats} seats</span>
          </div>
        </div>
      );
    }
    case "table_rect":
      return <div className="flex h-full w-full items-center justify-center gap-2 rounded-lg border border-[#cdbb98] bg-white text-xs shadow-sm"><b>{i.text}</b><span className="text-muted">{i.seats} seats</span></div>;
    case "zone":
      return <div className="flex h-full w-full items-start rounded-xl border-2 border-dashed p-2 text-sm font-medium" style={{ background: `${i.color ?? "#E3E8DE"}aa`, borderColor: i.color ?? "#cbd5c0" }}>{i.text}</div>;
    case "stage":
      return <div className="flex h-full w-full items-center justify-center rounded-2xl font-serif text-xl shadow-inner" style={{ background: i.color ?? "#E8D9BC" }}>{i.text}</div>;
  }
}
