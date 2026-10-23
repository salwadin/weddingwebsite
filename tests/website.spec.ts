import { expect, test, type Locator } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { adminClient, DEMO_WEDDING_ID, loginAs, SLUG } from "./helpers";

// Couples upload their own website photos: straight to storage, saved with the form.
const admin = adminClient();
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });
const stored = async () => ((await admin.storage.from("site-photos").list(DEMO_WEDDING_ID)).data ?? []).map((f) => f.name);

test.afterAll(async () => {
  const names = await stored();
  if (names.length) await admin.storage.from("site-photos").remove(names.map((n) => `${DEMO_WEDDING_ID}/${n}`));
  await loadDemoSeed(admin);
});

async function upload(input: Locator, files: ReturnType<typeof png>[], status: Locator) {
  await input.setInputFiles(files);
  await expect(status).toContainText(/ready/);
}

test("couples upload a cover and gallery photos, see them on their site, and remove them", async ({ page }) => {
  const { data: before } = await admin.from("weddings").select("gallery").eq("id", DEMO_WEDDING_ID).single();
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/website");
  const photos = page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: "Photos" }) });
  const cover = photos.locator("div", { has: page.locator('input[data-upload="cover"]') }).last();
  const gallery = photos.locator("div", { has: page.locator('input[data-upload="gallery"]') }).last();
  await upload(cover.locator('input[type="file"]'), [png("cover.png")], cover.locator("[aria-live]"));
  await upload(gallery.locator('input[type="file"]'), [png("a.png"), png("b.png")], gallery.locator("[aria-live]"));
  await page.getByRole("button", { name: "Save website" }).click();
  await page.waitForURL(/saved=1/);

  const { data: w } = await admin.from("weddings").select("hero_image,gallery").eq("id", DEMO_WEDDING_ID).single();
  const ours = new RegExp(`/storage/v1/object/public/site-photos/${DEMO_WEDDING_ID}/[a-f0-9]{32}\\.png$`);
  expect(w!.hero_image).toMatch(ours);
  expect(w!.gallery).toHaveLength(before!.gallery.length + 2);
  const added = w!.gallery.slice(-2);
  for (const u of added) expect(u).toMatch(ours);
  expect((await page.request.get(w!.hero_image)).status()).toBe(200);
  expect(await (await page.request.get(`/w/${SLUG}`)).text()).toContain(w!.hero_image);
  expect(await stored()).toHaveLength(3);

  // Remove the cover and one new gallery photo: they leave the site and storage.
  await page.goto("/dashboard/website");
  await page.getByLabel("Remove the cover photo").check();
  await page.getByLabel(`Remove gallery photo ${before!.gallery.length + 1}`).check();
  await page.getByRole("button", { name: "Save website" }).click();
  await page.waitForURL(/saved=1/);
  const { data: after } = await admin.from("weddings").select("hero_image,gallery").eq("id", DEMO_WEDDING_ID).single();
  expect(after!.hero_image).toBe("");
  expect(after!.gallery).toEqual([...before!.gallery, added[1]]);
  expect(await stored()).toHaveLength(1);
});

test("only images, and only to your own wedding's folder", async ({ page }) => {
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/website");
  const input = page.locator('input[data-upload="gallery"]');
  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("Please choose a PNG, JPG or WebP image.")).toBeVisible();

  // A path from another wedding's folder submitted with the form is ignored.
  const { data: before } = await admin.from("weddings").select("hero_image").eq("id", DEMO_WEDDING_ID).single();
  await page.locator("form").first().evaluate((f) => {
    const i = document.createElement("input"); i.type = "hidden"; i.name = "coverPath";
    i.value = "00000000-0000-4000-8000-000000000000/0123456789abcdef0123456789abcdef.png"; f.appendChild(i);
  });
  await page.getByRole("button", { name: "Save website" }).click();
  await page.waitForURL(/saved=1/);
  const { data: after } = await admin.from("weddings").select("hero_image").eq("id", DEMO_WEDDING_ID).single();
  expect(after!.hero_image).toBe(before!.hero_image);
});
