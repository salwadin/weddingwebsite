import "server-only";
import { adminClient } from "./supabase/server";

// Couples' own invitation artwork, in the private `invitation-art` bucket
// (supabase/migrations/20261023000200_invitation_art.sql), uploaded by the browser
// through lib/uploads.ts. Paths are <wedding id>/<event id>/<random>.<ext>. Nobody reads
// the bucket directly: pages get short-lived signed URLs, only for designs they may already see.

const BUCKET = "invitation-art";

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
