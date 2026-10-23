"use server";

import { TRADITIONS } from "../format";
import { applyBetaPerks } from "../programs";
import { redirect } from "next/navigation";
import { currentUser, organizerContext } from "../auth";
import { audit, loadWedding, loadWeddingRow, mutate, newInviteToken, uid } from "../db";
import { adminClient, serverClient } from "../supabase/server";
import type { EventType, RsvpMode, Side, ThemeSettings, Visibility, WeddingEvent } from "../types";

export interface OnboardingInput {
  partner1: string; partner2: string; partner1Family: string; partner2Family: string; role: "bride" | "groom";
  tradition?: string;
  events: { type: EventType; name: string; date: string; startTime: string; venueName: string; address: string; visibility: Visibility; rsvpMode: RsvpMode; hostSide: Side; sidePrivate?: boolean }[];
  theme: ThemeSettings["id"];
  households: { name: string; members: string[]; side: Side }[];
  assign: Record<string, { bride: boolean; groom: boolean }>; // event index → which sides are invited
  slug: string;
  publish: boolean;
}

export async function createWedding(input: OnboardingInput): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (await organizerContext()) redirect("/dashboard");
  const clean = (s: string, n = 80) => String(s ?? "").trim().slice(0, n);
  if (!clean(input.partner1) || !clean(input.partner2)) return { error: "Please enter both names." };
  if (!input.events?.length) return { error: "Please choose at least one event." };
  const slug = clean(input.slug, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `${input.partner1}-and-${input.partner2}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // The wedding row and the caller's admin role are created together in the database
  // (create_wedding() picks a free slug and sets the plan + trial); everything else is
  // then written as that new administrator, through RLS like any other dashboard change.
  const islamic = !!TRADITIONS.find((t) => t.value === input.tradition)?.islamic;
  const sb = await serverClient();
  const { data: created, error } = await sb.rpc("create_wedding", { p: {
    slug, partner1: clean(input.partner1), partner2: clean(input.partner2),
    partner1Family: clean(input.partner1Family), partner2Family: clean(input.partner2Family),
    relationship: input.role === "groom" ? "Groom" : "Bride",
    tagline: islamic ? "Two families, one beginning, Insha'Allah." : "Two families, one beginning.",
    heroImage: "", // no stock photo: the site shows a plain cover until the couple uploads their own
    story: [], gallery: [], faqs: islamic ? [
      { q: "Will there be space for prayer?", a: "Yes, there will be a dedicated prayer space at each venue." },
      { q: "Is the food halal?", a: "Yes, all food served is halal." },
    ] : [
      { q: "Is there parking at the venues?", a: "Details for each venue are listed on the Events page." },
      { q: "Can I bring my children?", a: "Please refer to the names listed on your personal invitation." },
    ],
    travel: { intro: "", airport: "", hotels: [] }, registry: { message: islamic ? "Your duas and presence are the greatest gift." : "Your presence is the greatest gift.", links: [] },
    theme: { id: (["noor", "gulab", "zaitoon", "mehtab"] as const).includes(input.theme) ? input.theme : "noor", heading: "cormorant", pattern: "none" } satisfies ThemeSettings,
    culture: {
      // Islamic touches are on for Muslim traditions and off otherwise; couples can change them in Website settings.
      showBismillah: islamic, islamicDates: islamic,
      verse: { enabled: islamic, arabic: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً", translation: "And among His signs is that He created for you mates from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.", reference: "Surah Ar-Rum 30:21" },
      urduNames: { partner1: "", partner2: "" },
      halalNote: islamic ? "All food served is halal." : "", modestyNote: islamic ? "We kindly ask guests to dress modestly." : "", prayerNote: islamic ? "Prayer space will be available." : "",
    },
    published: !!input.publish, totalBudget: 50000, currency: "USD", tradition: clean(input.tradition ?? "", 30) || null,
  } });
  if (error) return { error: error.message.includes("already") ? "You're already planning a wedding." : "We couldn't create your wedding. Please try again." };
  const W = (created as { id: string }).id;
  await applyBetaPerks(user.email, W); // invited beta couples and planners get complimentary access
  const wedding = await loadWeddingRow(sb, W);
  if (!wedding) return { error: "We couldn't create your wedding. Please try again." };
  const o = { sb, d: await loadWedding(sb, wedding) };

  try {
    await mutate(o, (d) => {
      const now = new Date().toISOString();
      const events: WeddingEvent[] = input.events.slice(0, 20).map((e, i) => ({
        id: uid("evt"), weddingId: W, type: /^[a-z_]{3,20}$/.test(e.type) ? e.type : "custom", name: clean(e.name) || "Event", date: clean(e.date, 10) || "2027-06-01", startTime: clean(e.startTime, 5) || "18:00", endTime: "22:00",
        venueName: clean(e.venueName, 120), address: clean(e.address, 200), dressCode: "", description: "",
        publicMessage: e.visibility === "public" ? `We would be honored to have you join us for our ${clean(e.name)}.` : "",
        hostSide: (["bride", "groom", "both"] as const).includes(e.hostSide) ? e.hostSide : "both",
        sidePrivate: !!e.sidePrivate && e.hostSide !== "both" && (["bride", "groom"] as const).includes(e.hostSide),
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
        d.tokens.push(newInviteToken(hid, W));
      }

      const starter = ["Set your overall budget", "Book venues", "Finalize guest list", "Send invitations", "Book photographer"];
      for (const t of starter) d.tasks.push({ id: uid("tsk"), weddingId: W, title: t, assignee: user.name, done: false, side: "both" });
      audit(d, W, user.name, "wedding_create", `${input.partner1} & ${input.partner2}`);
    });
  } catch (err) {
    // Don't leave a half-made wedding behind (organizers can't delete weddings themselves), so they can simply try again.
    await adminClient().from("weddings").delete().eq("id", W);
    console.error("[onboarding]", err);
    return { error: "We couldn't finish setting up your wedding. Please try again." };
  }
  redirect("/dashboard?welcome=1");
}
