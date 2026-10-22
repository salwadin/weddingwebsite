import "server-only";
import { fromRow, type Row } from "./rows";
import { anonClient, type Supabase } from "./supabase/server";
import type { Listing } from "./types";

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/**
 * Every published marketplace listing (public data, read as anon).
 * Sample listings (is_demo) are included only for demo visitors.
 */
export async function publishedListings(opts: { includeDemo: boolean }): Promise<Listing[]> {
  let q = anonClient().from("listings").select("*").eq("published", true);
  if (!opts.includeDemo) q = q.eq("is_demo", false);
  const { data, error } = await q.limit(1000);
  if (error) throw new Error(error.message);
  return (data as Row[]).map((r) => fromRow("listings", r));
}

/**
 * One listing, if `sb` may read it: published ones for anyone, unpublished ones for their owner.
 * A sample listing looks like it doesn't exist outside the demo.
 */
export async function listingById(sb: Supabase, id: string, opts: { includeDemo: boolean }): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const { data } = await sb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data || ((data as Row).is_demo && !opts.includeDemo)) return null;
  return fromRow("listings", data as Row);
}
