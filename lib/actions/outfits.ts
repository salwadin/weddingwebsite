"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, mutate, uid } from "../db";
import { assertFeature, requireOrg, type Org } from "../dashboard";
import type { Outfit, OutfitStatus, Side } from "../types";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Math.max(0, Number(f.get(k)) || 0);
const STATUSES: OutfitStatus[] = ["idea", "sourcing", "ordered", "alterations", "ready", "worn"];

async function editor() {
  const o = await requireOrg("outfits", "edit");
  assertFeature(o, "outfits");
  return o;
}

/** Side organizers manage their own family's looks; event organizers only their events. */
function canTouch(o: Org, x: Pick<Outfit, "side" | "eventId" | "weddingId">) {
  if (x.weddingId !== o.ctx.wedding.id) return false;
  if (o.scope.side && x.side !== o.scope.side && x.side !== "both") return false;
  if (o.scope.eventIds && !o.scope.eventIds.includes(x.eventId ?? "")) return false;
  return true;
}

function outfitOrThrow(o: Org, id: string) {
  const x = o.d.outfits.find((y) => y.id === id);
  if (!x || !canTouch(o, x)) throw new Error("Not permitted");
  return x;
}

const done = (o: Org, id?: string) => {
  revalidatePath("/dashboard/outfits", "layout");
  revalidatePath(`/w/${o.ctx.wedding.slug}`, "layout");
  if (id) redirect(`/dashboard/outfits/${id}?saved=1`);
};

export async function saveOutfit(form: FormData) {
  const o = await editor();
  const id = str(form, "id");
  const side = (o.scope.side ?? (str(form, "side") || "both")) as Side;
  const eventId = str(form, "eventId") || undefined;
  if (eventId && !o.events.some((e) => e.id === eventId)) throw new Error("Unknown event");
  const values = {
    eventId, side,
    wearer: str(form, "wearer", 80) || "Unassigned",
    role: (str(form, "role") || "other") as Outfit["role"],
    title: str(form, "title", 120) || "Untitled look",
    designer: str(form, "designer", 120),
    vendorId: str(form, "vendorId") || undefined,
    status: (STATUSES.includes(str(form, "status") as OutfitStatus) ? str(form, "status") : "idea") as OutfitStatus,
    colors: str(form, "colors", 200).split(/[,\s]+/).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6),
    image: /^https?:\/\//.test(str(form, "image", 500)) ? str(form, "image", 500) : undefined,
    cost: num(form, "cost"), paid: num(form, "paid"),
    dueDate: str(form, "dueDate", 10) || undefined,
    notes: str(form, "notes", 2000) || undefined,
  };
  const newPieces = str(form, "addPieces", 1000).split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  let outId = id;
  await mutate(o, (d) => {
    if (id) {
      const x = outfitOrThrow(o, id);
      const target = d.outfits.find((y) => y.id === x.id)!;
      Object.assign(target, values);
      target.pieces.push(...newPieces.map((name) => ({ id: uid("pc"), name, done: false })));
      audit(d, o.ctx.wedding.id, o.ctx.user.name, "outfit_update", `${target.wearer}: ${target.title} (${target.status})`);
    } else {
      outId = uid("out");
      d.outfits.push({ id: outId, weddingId: o.ctx.wedding.id, ...values, pieces: newPieces.map((name) => ({ id: uid("pc"), name, done: false })), fittings: [] });
      audit(d, o.ctx.wedding.id, o.ctx.user.name, "outfit_create", `${values.wearer}: ${values.title}`);
    }
  });
  done(o, outId);
}

export async function setOutfitStatus(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  const status = str(form, "status") as OutfitStatus;
  if (!STATUSES.includes(status)) return;
  await mutate(o, (d) => { d.outfits.find((y) => y.id === x.id)!.status = status; });
  done(o);
}

export async function togglePiece(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  await mutate(o, (d) => {
    const p = d.outfits.find((y) => y.id === x.id)!.pieces.find((p) => p.id === str(form, "pieceId"));
    if (p) p.done = !p.done;
  });
  done(o);
}

export async function removePiece(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  await mutate(o, (d) => {
    const t = d.outfits.find((y) => y.id === x.id)!;
    t.pieces = t.pieces.filter((p) => p.id !== str(form, "pieceId"));
  });
  done(o, x.id);
}

export async function addFitting(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  const date = str(form, "date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await mutate(o, (d) => {
    const t = d.outfits.find((y) => y.id === x.id)!;
    t.fittings.push({ id: uid("ft"), date, note: str(form, "note", 200), done: false });
    t.fittings.sort((a, b) => a.date.localeCompare(b.date));
  });
  done(o, x.id);
}

export async function toggleFitting(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  await mutate(o, (d) => {
    const f = d.outfits.find((y) => y.id === x.id)!.fittings.find((f) => f.id === str(form, "fittingId"));
    if (f) f.done = !f.done;
  });
  done(o);
}

export async function deleteOutfit(form: FormData) {
  const o = await editor();
  const x = outfitOrThrow(o, str(form, "id"));
  await mutate(o, (d) => {
    d.outfits = d.outfits.filter((y) => y.id !== x.id);
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "outfit_delete", `${x.wearer}: ${x.title}`);
  });
  revalidatePath("/dashboard/outfits", "layout");
  redirect("/dashboard/outfits");
}
