import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "./supabase/server";

// Couples' own invitation artwork, in the private `invitation-art` bucket
// (supabase/migrations/20261023000200_invitation_art.sql). Paths are
// <wedding id>/<event id>/<random>.<ext>. Nobody reads the bucket directly:
// pages get short-lived signed URLs, and only for designs they may already see.

const BUCKET = "invitation-art";
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const ART_MAX_BYTES = 8 * 1024 * 1024;

/** Stores an uploaded invitation image and returns its path, or an error to show the couple. */
export async function uploadArt(weddingId: string, eventId: string, file: File): Promise<{ path: string } | { error: string }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: "Please upload a PNG, JPG or WebP image." };
  if (file.size > ART_MAX_BYTES) return { error: "That image is over 8 MB. Please export a smaller version." };
  const path = `${weddingId}/${eventId}/${randomUUID().replace(/-/g, "")}.${ext}`;
  const { error } = await adminClient().storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) return { error: `We couldn't save that image (${error.message}).` };
  return { path };
}

/**
 * A one-hour link to a wedding's artwork. The path must sit under that wedding's
 * folder: organizers can write image_path themselves (RLS), so this stops one
 * wedding from pointing at another's files.
 */
export async function artUrl(weddingId: string, path: string | null | undefined) {
  if (!path || !path.startsWith(`${weddingId}/`)) return null;
  const { data } = await adminClient().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
