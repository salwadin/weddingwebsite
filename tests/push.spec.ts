import { expect, test } from "@playwright/test";
import { adminClient, anonClient, signedIn, SLUG } from "./helpers";
import { apnsSent as sent, clearApns } from "./apns-mock";

// Push notifications (lib/push). Phones register in device_tokens; the app server sends
// to the mock APNs (tests/apns-mock.ts).

const admin = adminClient();
const token = (who: string) => `${who}${"0".repeat(64 - who.length)}`; // 64 characters, like an APNs token
const userId = async (email: string) => (await admin.from("profiles").select("id").eq("email", email).single()).data!.id as string;

test.afterEach(async () => {
  await admin.from("device_tokens").delete().like("token", "test%");
  await admin.from("device_tokens").delete().like("token", "dead%");
});

test("phones register only for the signed-in person, who sees only their own", async () => {
  expect((await anonClient().rpc("register_device", { p_token: token("testanon"), p_platform: "ios" })).error).not.toBeNull();

  const ayesha = await signedIn("ayesha@example.com");
  expect((await ayesha.rpc("register_device", { p_token: token("testphone"), p_platform: "ios" })).error).toBeNull();
  expect((await ayesha.from("device_tokens").select("token")).data).toEqual([{ token: token("testphone") }]);
  // Not by writing the table directly, and not as someone else.
  expect((await ayesha.from("device_tokens").insert({ token: token("testother"), user_id: await userId("omar@example.com"), platform: "ios" })).error).not.toBeNull();

  const nasreen = await signedIn("nasreen@example.com");
  expect((await nasreen.from("device_tokens").select("token")).data).toEqual([]);
  // The same phone signed in as Nasreen: the token is hers now, and no longer Ayesha's.
  expect((await nasreen.rpc("register_device", { p_token: token("testphone"), p_platform: "ios" })).error).toBeNull();
  expect((await ayesha.from("device_tokens").select("token")).data).toEqual([]);
  expect((await nasreen.from("device_tokens").select("token")).data).toEqual([{ token: token("testphone") }]);
});

test("a household's RSVP notifies the couple and that side's organizers, and drops dead phones", async ({ browser }) => {
  const phones: Record<string, string> = {
    "ayesha@example.com": token("testayesha"), "omar@example.com": token("testomar"),
    "nasreen@example.com": token("testnasreen"), // bride-side organizer: the Maliks are on the bride's side
    "khalid@example.com": token("testkhalid"), // groom-side organizer
    "zara@example.com": token("testzara"), // organizes only the Mehndi, which the Maliks aren't invited to
    "planner@example.com": token("testplanner"), // read-only
  };
  const rows = await Promise.all(Object.entries(phones).map(async ([email, t]) => ({ token: t, user_id: await userId(email), platform: "ios" })));
  rows.push({ token: token("deadomar"), user_id: await userId("omar@example.com"), platform: "ios" });
  expect((await admin.from("device_tokens").insert(rows)).error).toBeNull();
  await clearApns();

  const page = await (await browser.newContext()).newPage();
  await page.goto("/demo/shaadi"); // Dr. Sana Malik & Mr. Faisal Malik: Nikkah and Shaadi
  await page.goto(`/w/${SLUG}/rsvp`);
  for (const b of await page.getByRole("button", { name: "Everyone is attending" }).all()) await b.click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByText("Thank you, your RSVP has been saved.")).toBeVisible();

  await expect.poll(async () => (await sent()).map((p) => p.token).sort()).toEqual(
    [phones["ayesha@example.com"], phones["nasreen@example.com"], phones["omar@example.com"]].sort());
  const push = (await sent())[0];
  expect(push.title).toBe("Dr. Sana Malik & Mr. Faisal Malik RSVP'd");
  expect(push.body).toMatch(/^\d+ attending$/);
  expect(push.url).toMatch(/^\/dashboard\/guests\/[0-9a-f-]{36}$/);
  expect(push.topic).toBe("app.qubool");
  // APNs said the "dead" phone uninstalled the app, so it's forgotten.
  await expect.poll(async () => (await admin.from("device_tokens").select("token").eq("token", token("deadomar"))).data).toEqual([]);
});

test("an inquiry notifies the vendor", async ({ browser }) => {
  const { data: l } = await admin.from("listings").select("id, owner_user_id").eq("name", "Noor Light Studios").single();
  expect((await admin.from("device_tokens").insert({ token: token("testvendor"), user_id: l!.owner_user_id, platform: "ios" })).error).toBeNull();
  await clearApns();

  const couple = await (await browser.newContext()).newPage();
  await couple.goto("/demo/marketplace"); // Noor Light is a sample vendor, only listed inside the demo
  await couple.goto(`/marketplace/${l!.id}`);
  await couple.getByLabel("Your name").fill("Maryam Push");
  await couple.getByLabel("Email").fill(`maryam.${Date.now()}@example.com`);
  await couple.getByLabel("Message").fill("Salaam! Are you free for our Walima on the 14th of June?");
  await couple.getByRole("button", { name: "Send inquiry" }).click();
  await expect(couple.getByText(/^Sent!/)).toBeVisible();

  await expect.poll(sent).toEqual([{
    token: token("testvendor"), topic: "app.qubool", url: "/vendor",
    title: "New inquiry from Maryam Push", body: "Salaam! Are you free for our Walima on the 14th of June?",
  }]);
});
