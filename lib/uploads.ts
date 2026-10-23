import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "./supabase/server";

// Couples' images go straight from the browser to Supabase Storage through one-time
// signed upload URLs: the app server only checks permissions and hands out the URL,
// so photos never pass through its request-size limit (4.5 MB on Vercel).
// Storage itself enforces each bucket's size and type limits
// (supabase/migrations/20261023000200_invitation_art.sql, 20261023000300_site_photos.sql).

export type UploadPurpose = "invitation" | "cover" | "gallery";

const BUCKET: Record<UploadPurpose, string> = { invitation: "invitation-art", cover: "site-photos", gallery: "site-photos" };
const MAX: Record<UploadPurpose, number> = { invitation: 8 * 1024 * 1024, cover: 10 * 1024 * 1024, gallery: 10 * 1024 * 1024 };
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** The folder a wedding's files live in: invitation art per event, website photos per wedding. */
const folder = (purpose: UploadPurpose, weddingId: string, eventId?: string) => (purpose === "invitation" ? `${weddingId}/${eventId}` : weddingId);

/** A signed URL the browser can PUT one image to, or an error to show. Callers check permissions first. */
export async function signedUpload(purpose: UploadPurpose, weddingId: string, contentType: string, size: number, eventId?: string) {
  const ext = EXT[contentType];
  if (!ext) return { error: "Please choose a PNG, JPG or WebP image." };
  if (size > MAX[purpose]) return { error: `That image is over ${MAX[purpose] / 1024 / 1024} MB. Please choose a smaller one.` };
  const path = `${folder(purpose, weddingId, eventId)}/${randomUUID().replace(/-/g, "")}.${ext}`;
  const { data, error } = await adminClient().storage.from(BUCKET[purpose]).createSignedUploadUrl(path);
  if (error || !data) return { error: "We couldn't start the upload. Please try again." };
  return { path, url: data.signedUrl };
}

/** True when `path` is a file this upload flow could have created for this wedding (and event). */
export function ownsPath(purpose: UploadPurpose, path: string, weddingId: string, eventId?: string) {
  return new RegExp(`^${folder(purpose, weddingId, eventId)}/[a-f0-9]{32}\\.(png|jpg|webp)$`).test(path);
}

/** Public URL of a website photo. */
export const photoUrl = (path: string) => adminClient().storage.from("site-photos").getPublicUrl(path).data.publicUrl;

/** Deletes website photos the couple removed, when they're ours (not a pasted link). */
export async function removePhotos(weddingId: string, urls: string[]) {
  const marker = "/storage/v1/object/public/site-photos/";
  const paths = urls.map((u) => (u.includes(marker) ? decodeURIComponent(u.split(marker)[1].split("?")[0]) : "")).filter((p) => ownsPath("gallery", p, weddingId));
  if (paths.length) await adminClient().storage.from("site-photos").remove(paths);
}
