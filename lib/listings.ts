import "server-only";
import { fromRow, type Row } from "./rows";
import { anonClient, type Supabase } from "./supabase/server";
import type { Listing } from "./types";

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Every published marketplace listing (public data, read as anon). */
export async function publishedListings(): Promise<Listing[]> {
  const { data, error } = await anonClient().from("listings").select("*").eq("published", true).limit(1000);
  if (error) throw new Error(error.message);
  return (data as Row[]).map((r) => fromRow("listings", r));
}

/** One listing, if `sb` may read it: published ones for anyone, unpublished ones for their owner. */
export async function listingById(sb: Supabase, id: string): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const { data } = await sb.from("listings").select("*").eq("id", id).maybeSingle();
  return data ? fromRow("listings", data as Row) : null;
}
