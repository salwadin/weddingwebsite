"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutate, uid } from "../db";
import { assertFeature, requireOrg, type Org } from "../dashboard";
import { BOARD_H, BOARD_W, TEMPLATES, templateItems } from "../studio-templates";
import type { BoardItem, BoardItemType } from "../types";

const TYPES: BoardItemType[] = ["image", "note", "swatch", "text", "table_round", "table_rect", "zone", "stage"];
const clamp = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));

async function editor() {
  const o = await requireOrg("studio", "edit");
  assertFeature(o, "studio");
  return o;
}

function boardOrThrow(o: Org, id: string) {
  const b = o.d.boards.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
  if (!b || (o.scope.eventIds && !o.scope.eventIds.includes(b.eventId ?? ""))) throw new Error("Not permitted");
  return b;
}

/** Validate everything coming from the canvas before it is stored. */
function sanitize(items: unknown): BoardItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 400).flatMap((raw): BoardItem[] => {
    const i = raw as Partial<BoardItem>;
    if (!i || !TYPES.includes(i.type as BoardItemType)) return [];
    const src = typeof i.src === "string" && /^https:\/\//.test(i.src) ? i.src.slice(0, 600) : undefined;
    return [{
      id: String(i.id ?? uid("bi")).slice(0, 40),
      type: i.type as BoardItemType,
      x: clamp(i.x, -200, BOARD_W), y: clamp(i.y, -200, BOARD_H),
      w: clamp(i.w, 10, BOARD_W), h: clamp(i.h, 10, BOARD_H),
      text: typeof i.text === "string" ? i.text.slice(0, 500) : undefined,
      color: typeof i.color === "string" && /^#[0-9a-f]{6}$/i.test(i.color) ? i.color : undefined,
      src,
      seats: i.seats === undefined ? undefined : clamp(i.seats, 0, 40),
    }];
  });
}

export async function createBoard(form: FormData) {
  const o = await editor();
  const template = String(form.get("template") ?? "blank_mood");
  const t = TEMPLATES.find((x) => x.value === template) ?? TEMPLATES[0];
  const eventId = String(form.get("eventId") ?? "") || undefined;
  if (eventId && !o.events.some((e) => e.id === eventId)) throw new Error("Unknown event");
  if (o.scope.eventIds && !eventId) throw new Error("Choose one of your events");
  const id = uid("brd");
  await mutate(o, (d) => {
    d.boards.push({
      id, weddingId: o.ctx.wedding.id, kind: t.kind, eventId,
      name: String(form.get("name") ?? "").trim().slice(0, 80) || t.label,
      items: templateItems(t.value), updatedAt: new Date().toISOString(),
    });
  });
  revalidatePath("/dashboard/studio");
  redirect(`/dashboard/studio/${id}`);
}

export async function saveBoard(boardId: string, items: unknown, name?: string) {
  const o = await editor();
  const b = boardOrThrow(o, boardId);
  const clean = sanitize(items);
  const updatedAt = new Date().toISOString();
  await mutate(o, (d) => {
    const t = d.boards.find((x) => x.id === b.id)!;
    t.items = clean;
    if (name !== undefined) t.name = name.trim().slice(0, 80) || t.name;
    t.updatedAt = updatedAt;
  });
  return { ok: true, updatedAt };
}

export async function deleteBoard(form: FormData) {
  const o = await editor();
  const b = boardOrThrow(o, String(form.get("id")));
  await mutate(o, (d) => { d.boards = d.boards.filter((x) => x.id !== b.id); });
  revalidatePath("/dashboard/studio");
  redirect("/dashboard/studio");
}
