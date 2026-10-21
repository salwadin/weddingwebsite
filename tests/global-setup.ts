import { adminClient } from "./helpers";
import { loadDemoSeed } from "../lib/seed-load";
import { startResendMock } from "./resend-mock";

/** Every run starts from a freshly seeded demo wedding in the local Supabase, with a mock Resend API. */
export default async function globalSetup() {
  await loadDemoSeed(adminClient());
  const resend = await startResendMock();
  return () => new Promise<void>((done) => resend.close(() => done()));
}
