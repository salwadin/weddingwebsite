import { adminClient } from "./helpers";
import { loadDemoSeed } from "../lib/seed-load";

/** Every run starts from a freshly seeded demo wedding in the local Supabase. */
export default async function globalSetup() {
  await loadDemoSeed(adminClient());
}
