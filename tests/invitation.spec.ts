import { expect, test, type Browser } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { adminClient, DEMO_EVENTS, DEMO_WEDDING_ID, loginAs, SLUG } from "./helpers";

// A guest's personal link opens their invitation, like Zola: the designed card (or the
// couple's own uploaded artwork) for each event they're invited to, with RSVP below it.
test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.storage.from("invitation-art").list(DEMO_WEDDING_ID);
  for (const dir of data ?? []) {
    const { data: files } = await admin.storage.from("invitation-art").list(`${DEMO_WEDDING_ID}/${dir.name}`);
    if (files?.length) await admin.storage.from("invitation-art").remove(files.map((f) => `${DEMO_WEDDING_ID}/${dir.name}/${f.name}`));
  }
  await loadDemoSeed(admin);
});

const admin = adminClient();
// A 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function guestPage(browser: Browser, mode: "nikkah" | "shaadi" | "all") {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/demo/${mode}`); // follows the household's real /i/<token> link
  await expect(page).toHaveURL(new RegExp(`/w/${SLUG}/invitation$`));
  return page;
}

async function uploadDesign(page: import("@playwright/test").Page, eventId: string, file: { name: string; mimeType: string; buffer: Buffer } | null) {
  await page.goto(`/dashboard/invitations?event=${eventId}`);
  const form = page.locator("form").filter({ hasText: "Your own design" }).first();
  await form.locator("label", { has: page.locator('input[name="template"][value="custom"]') }).click();
  if (file) await form.locator('input[type="file"]').setInputFiles(file);
  await form.getByRole("button", { name: "Save design" }).click();
}

test("the personal link opens the guest's invitations, only for their events, with RSVP", async ({ browser }) => {
  const page = await guestPage(browser, "shaadi");
  await expect(page.getByRole("heading", { name: "Dear Dr. Sana Malik & Mr. Faisal Malik" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Invitation to the Nikkah" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Invitation to the Shaadi" })).toBeVisible();
  const html = await page.content();
  for (const hidden of ["Mehndi Night", "The Siddiqui Residence", "Magnolia Estate"]) expect(html).not.toContain(hidden);
  // The designed card is addressed to the household.
  await expect(page.getByRole("region", { name: "Invitation to the Shaadi" }).locator("svg")).toContainText("Dear Dr. Sana Malik & Mr. Faisal Malik,");
  await page.getByRole("region", { name: "Invitation to the Shaadi" }).getByRole("link", { name: /RSVP/ }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${SLUG}/rsvp$`));
});

test("couples upload their own design; invited guests see it through a private signed link", async ({ page, browser }) => {
  await loginAs(page, "ayesha@example.com");
  await uploadDesign(page, DEMO_EVENTS.nikkah, { name: "nikah.png", mimeType: "image/png", buffer: PNG });
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByRole("img", { name: "Invitation to the Nikkah" })).toBeVisible();

  const { data: design } = await admin.from("invitation_designs").select("template,image_path").eq("event_id", DEMO_EVENTS.nikkah).single();
  expect(design!.template).toBe("custom");
  expect(design!.image_path).toMatch(new RegExp(`^${DEMO_WEDDING_ID}/${DEMO_EVENTS.nikkah}/[a-f0-9]{32}\\.png$`));

  const guest = await guestPage(browser, "nikkah");
  const img = guest.getByRole("img", { name: "Invitation to the Nikkah" });
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect(src).toContain("/storage/v1/object/sign/invitation-art/");
  expect((await guest.request.get(src!)).status()).toBe(200);
  // The bucket itself isn't public: the plain object URL doesn't work.
  const publicUrl = src!.replace("/object/sign/", "/object/public/").split("?")[0];
  expect((await guest.request.get(publicUrl)).status()).not.toBe(200);
});

test("a family-only event's artwork never reaches guests who aren't invited", async ({ page, browser }) => {
  await loginAs(page, "ayesha@example.com");
  await uploadDesign(page, DEMO_EVENTS.mehndi, { name: "mehndi.png", mimeType: "image/png", buffer: PNG });
  await expect(page).toHaveURL(/saved=1/);
  const { data: design } = await admin.from("invitation_designs").select("image_path").eq("event_id", DEMO_EVENTS.mehndi).single();

  const outsider = await guestPage(browser, "shaadi");
  expect(await outsider.content()).not.toContain(design!.image_path);
  for (const path of ["", "/invitation", "/events", "/rsvp"]) expect(await (await outsider.request.get(`/w/${SLUG}${path}`)).text()).not.toContain(design!.image_path);

  const family = await guestPage(browser, "all");
  await expect(family.getByRole("img", { name: "Invitation to the Mehndi Night" })).toBeVisible();
});

test("uploads are checked: images only, and your own design needs an image", async ({ page }) => {
  await admin.from("invitation_designs").update({ template: "arch", image_path: null }).eq("event_id", DEMO_EVENTS.walima);
  await loginAs(page, "ayesha@example.com");
  await uploadDesign(page, DEMO_EVENTS.walima, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.getByText("Please upload a PNG, JPG or WebP image.")).toBeVisible();
  await uploadDesign(page, DEMO_EVENTS.walima, null);
  await expect(page.getByText("Upload your design image to use your own design.")).toBeVisible();
  const { data } = await admin.from("invitation_designs").select("template,image_path").eq("event_id", DEMO_EVENTS.walima).single();
  expect(data).toEqual({ template: "arch", image_path: null });
});

test("a design can't point at another wedding's files", async ({ browser }) => {
  // Organizers can write image_path under RLS; a path outside their wedding's folder is never signed.
  await admin.from("invitation_designs").update({ template: "custom", image_path: `00000000-0000-4000-8000-000000000000/${DEMO_EVENTS.nikkah}/abcdef.png` }).eq("event_id", DEMO_EVENTS.nikkah);
  const guest = await guestPage(browser, "nikkah");
  await expect(guest.getByRole("region", { name: "Invitation to the Nikkah" }).locator("svg")).toBeVisible(); // falls back to the designed card
  expect(await guest.content()).not.toContain("/object/sign/");
});
