"use server";

import { redirect } from "next/navigation";
import { currentUser } from "../auth";
import { audit, db, mutate, uid } from "../db";
import { newToken } from "../seed";
import type { EventType, RsvpMode, Side, ThemeSettings, Visibility, WeddingEvent } from "../types";

export interface OnboardingInput {
  partner1: string; partner2: string; partner1Family: string; partner2Family: string; role: "bride" | "groom";
  tradition?: string;
  events: { type: EventType; name: string; date: string; startTime: string; venueName: string; address: string; visibility: Visibility; rsvpMode: RsvpMode; hostSide: Side }[];
  theme: ThemeSettings["id"];
  households: { name: string; members: string[]; side: Side }[];
  assign: Record<string, { bride: boolean; groom: boolean }>; // event index → which sides are invited
  slug: string;
  publish: boolean;
}

export async function createWedding(input: OnboardingInput): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (db().collaborators.some((c) => c.userId === user.id)) redirect("/dashboard");
  const clean = (s: string, n = 80) => String(s ?? "").trim().slice(0, n);
  if (!clean(input.partner1) || !clean(input.partner2)) return { error: "Please enter both names." };
  if (!input.events?.length) return { error: "Please choose at least one event." };
  let slug = clean(input.slug, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `${input.partner1}-and-${input.partner2}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  while (db().weddings.some((w) => w.slug === slug)) slug += "-" + Math.floor(Math.random() * 90 + 10);

  mutate((d) => {
    const now = new Date().toISOString();
    const W = uid("wed");
    d.weddings.push({
      id: W, slug, partner1: clean(input.partner1), partner2: clean(input.partner2),
      partner1Family: clean(input.partner1Family), partner2Family: clean(input.partner2Family),
      tagline: "Two families, one beginning, Insha'Allah.",
      heroImage: "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=2000&q=80",
      story: [], gallery: [], faqs: [
        { q: "Will there be space for prayer?", a: "Yes, there will be a dedicated prayer space at each venue." },
        { q: "Is the food halal?", a: "Yes, all food served is halal." },
      ],
      travel: { intro: "", airport: "", hotels: [] }, registry: { message: "Your duas and presence are the greatest gift.", links: [] },
      theme: { id: (["noor", "gulab", "zaitoon", "mehtab"] as const).includes(input.theme) ? input.theme : "noor", heading: "cormorant", pattern: "arch" },
      culture: {
        showBismillah: true, islamicDates: true,
        verse: { enabled: true, arabic: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً", translation: "And among His signs is that He created for you mates from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.", reference: "Surah Ar-Rum 30:21" },
        urduNames: { partner1: "", partner2: "" }, halalNote: "All food served is halal.", modestyNote: "We kindly ask guests to dress modestly.", prayerNote: "Prayer space will be available.",
      },
      passwordProtected: false, published: !!input.publish, totalBudget: 50000, currency: "USD",
      plan: "free", trialEndsAt: new Date(Date.now() + 14 * 864e5).toISOString(), tradition: clean(input.tradition ?? "", 30) || undefined, createdAt: now,
    });
    d.collaborators.push({ id: uid("col"), weddingId: W, userId: user.id, role: "admin", relationship: input.role === "groom" ? "Groom" : "Bride", invitedAt: now });

    const events: WeddingEvent[] = input.events.slice(0, 20).map((e, i) => ({
      id: uid("evt"), weddingId: W, type: /^[a-z_]{3,20}$/.test(e.type) ? e.type : "custom", name: clean(e.name) || "Event", date: clean(e.date, 10) || "2027-06-01", startTime: clean(e.startTime, 5) || "18:00", endTime: "22:00",
      venueName: clean(e.venueName, 120), address: clean(e.address, 200), dressCode: "", description: "",
      publicMessage: e.visibility === "public" ? `We would be honored to have you join us for our ${clean(e.name)}.` : "",
      hostSide: (["bride", "groom", "both"] as const).includes(e.hostSide) ? e.hostSide : "both",
      visibility: (["public", "invite", "private"] as const).includes(e.visibility) ? e.visibility : "invite",
      rsvpMode: (["required", "optional", "none"] as const).includes(e.rsvpMode) ? e.rsvpMode : "required", waitlist: false,
      mealOptions: [], timeline: [], genderSeparated: e.type === "nikkah", womenOnly: false, noPhotography: false, prayerSpace: true, halal: true, budget: 0, sortOrder: i + 1,
    }));
    d.events.push(...events);

    for (const hh of (input.households ?? []).slice(0, 2000)) {
      const members = (hh.members?.length ? hh.members : [hh.name]).map((m) => clean(m)).filter(Boolean).slice(0, 30);
      if (!members.length) continue;
      const hid = uid("hh");
      d.households.push({ id: hid, weddingId: W, name: clean(hh.name, 120) || members[0], side: (["bride", "groom", "both"] as const).includes(hh.side) ? hh.side : "bride", relationship: "", tags: [], deliveryStatus: "not_sent", createdAt: now });
      const gs = members.map((m, i) => {
        const isChild = /\(child\)/i.test(m); const plus = /\(plus one\)|^guest$/i.test(m);
        const [first, ...rest] = m.replace(/\(.*?\)/g, "").trim().split(/\s+/);
        return { id: uid("g"), householdId: hid, firstName: first || "Guest", lastName: rest.join(" "), isChild, isPlusOne: plus, isPrimary: i === 0 };
      });
      d.guests.push(...gs);
      events.forEach((e, i) => {
        const a = input.assign?.[i];
        const invited = e.visibility === "public" || (hh.side === "bride" && a?.bride) || (hh.side === "groom" && a?.groom) || (hh.side === "both" && (a?.bride || a?.groom));
        if (invited) d.invitations.push({ id: uid("inv"), householdId: hid, eventId: e.id, guestIds: gs.map((g) => g.id), createdAt: now });
      });
      d.tokens.push({ token: newToken(), householdId: hid, weddingId: W, createdAt: now, useCount: 0 });
    }

    const starter = ["Set your overall budget", "Book venues", "Finalize guest list", "Send invitations", "Book photographer"];
    for (const t of starter) d.tasks.push({ id: uid("tsk"), weddingId: W, title: t, assignee: user.name, done: false, side: "both" });
    audit(d, W, user.name, "wedding_create", `${input.partner1} & ${input.partner2}`);
  });
  redirect("/dashboard?welcome=1");
}
