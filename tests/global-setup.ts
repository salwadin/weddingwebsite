import { adminClient } from "./helpers";
import { loadDemoSeed } from "../lib/seed-load";
import { startResendMock } from "./resend-mock";
import { startTwilioMock } from "./twilio-mock";
import { startApnsMock } from "./apns-mock";

/** Every run starts from a freshly seeded demo wedding in the local Supabase, with mock Resend, Twilio and APNs APIs. */
export default async function globalSetup() {
  await loadDemoSeed(adminClient());
  const resend = await startResendMock();
  const twilio = await startTwilioMock();
  const apns = await startApnsMock();
  return () => Promise.all([resend, twilio, apns].map((s) => new Promise<void>((done) => s.close(() => done())))).then(() => {});
}
