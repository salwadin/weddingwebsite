import { expect, test } from "@playwright/test";
import { isDemoOutboxRow } from "../lib/demo-rules";
import { adminClient, DEMO_WEDDING_ID } from "./helpers";

// The interactive demo lives inside the real site but is sealed off from it:
// sample vendors only show inside the demo, and nothing in the demo is emailed.

const admin = adminClient();

test("the public marketplace shows only real vendors; demo visitors also see the samples", async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/marketplace");
  await expect(visitor.getByText("Noor Light Studios")).toHaveCount(0);
  await expect(visitor.getByText("Founding vendors", { exact: true })).toBeVisible();

  // A real, published listing shows up for everyone.
  const name = `Real Vendor ${Date.now()}`;
  const { data: real, error } = await admin.from("listings")
    .insert({ name, category: "Catering", city: "Dallas", email: "owner@qubool.test", published: true, tier: "basic" }).select("id").single();
  expect(error).toBeNull();
  try {
    await visitor.goto("/marketplace");
    await expect(visitor.getByText(name)).toBeVisible();
    await expect(visitor.getByText("Noor Light Studios")).toHaveCount(0);

    // Entering the demo reveals the sample vendors alongside the real one.
    await visitor.goto("/demo/marketplace");
    await expect(visitor).toHaveURL(/\/marketplace$/);
    await expect(visitor.getByText("You're exploring the demo")).toBeVisible();
    await expect(visitor.getByText("Noor Light Studios").first()).toBeVisible();
    await expect(visitor.getByText(name)).toBeVisible();

    // Leaving the demo hides them again.
    await visitor.goto("/demo/exit");
    await visitor.goto("/marketplace");
    await expect(visitor.getByText("Noor Light Studios")).toHaveCount(0);
  } finally {
    await admin.from("listings").delete().eq("id", real!.id);
  }
});

test("the demo never emails: demo-wedding rows and example.com recipients are skipped", () => {
  expect(isDemoOutboxRow({ wedding_id: DEMO_WEDDING_ID, recipient: "real.person@gmail.com" }, DEMO_WEDDING_ID)).toBe(true);
  expect(isDemoOutboxRow({ wedding_id: null, recipient: "hello@noorlight.example.com" }, DEMO_WEDDING_ID)).toBe(true);
  expect(isDemoOutboxRow({ wedding_id: null, recipient: "owner@notexample.com" }, DEMO_WEDDING_ID)).toBe(false);
  expect(isDemoOutboxRow({ wedding_id: null, recipient: "ayesha@example.com" }, DEMO_WEDDING_ID)).toBe(true);
  expect(isDemoOutboxRow({ wedding_id: "some-real-wedding", recipient: " Guest@EXAMPLE.com " }, DEMO_WEDDING_ID)).toBe(true);
  expect(isDemoOutboxRow({ wedding_id: "some-real-wedding", recipient: "guest@gmail.com" }, DEMO_WEDDING_ID)).toBe(false);
});
