import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseServiceKey, supabaseUrl } from "./env";

export type Supabase = SupabaseClient;

/**
 * The signed-in visitor's client: requests carry their session, so Row Level
 * Security applies. Use this for everything an organizer or vendor does.
 */
export const serverClient = cache(async (): Promise<Supabase> => {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
});

/** A client with no session (the `anon` role): public marketplace reads and guest RPCs. */
export const anonClient = cache((): Supabase =>
  createClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false, autoRefreshToken: false } }));

/**
 * Service-role client: bypasses RLS. Only for server code that has already
 * decided the caller may do this (demo switcher, link re-send, billing + Stripe webhook).
 * Never use it to read data on behalf of an organizer.
 */
export function adminClient(): Supabase {
  return createClient(supabaseUrl(), supabaseServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}
