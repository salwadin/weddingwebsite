import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Same settings as the app (Supabase URL/keys, INVITE_TOKEN_SECRET, QUBOOL_DEMO=on).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.PORT ?? 3000);
// tests/billing.spec.ts signs webhooks with this; the server it starts verifies with it.
// (If you reuse a dev server you started yourself, give it the same STRIPE_WEBHOOK_SECRET.)
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_qubool_local_tests";

export default defineConfig({
  testDir: "tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: false, // tests share the seeded demo wedding
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 }, // the dev server compiles pages on first visit
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { QUBOOL_DEMO: "on", STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET },
  },
});
