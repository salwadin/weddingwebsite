import { createHash } from "node:crypto";
import { buildBoards, buildInquiries, buildListings, buildOutfits, EVENT_PALETTES } from "./seed-extras";
import { deriveToken } from "./tokens";
import type {
  Database, Expense, Guest, Household, Invitation, PublicRegistration, Rsvp, Side, Task,
  Vendor, Wedding, WeddingEvent,
} from "./types";

// The Ayesha & Omar sample wedding. `npm run seed` loads it into Supabase
// (lib/seed-load.ts); the /demo/* switcher and the privacy tests rely on it.

/** Stable uuid for a readable seed id like "evt_mehndi", so links and tests survive a re-seed. */
export function seedUuid(name: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(name)) return name;
  const h = createHash("sha1").update(`qubool-seed:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Demo password for every seeded account. */
export const DEMO_PASSWORD = "qubool-demo";

/** Fixed household ids used by the "test as…" switcher. */
export const DEMO_HOUSEHOLDS = {
  nikkahOnly: seedUuid("hh_demo_nikkah"),
  nikkahShaadi: seedUuid("hh_demo_shaadi"),
  allEvents: seedUuid("hh_demo_all"),
} as const;

export const DEMO_EVENTS = {
  mehndi: seedUuid("evt_mehndi"),
  nikkah: seedUuid("evt_nikkah"),
  shaadi: seedUuid("evt_shaadi"),
  walima: seedUuid("evt_walima"),
} as const;

export const DEMO_WEDDING_ID = seedUuid("wed_ayesha_omar");
export const DEMO_ADMIN_EMAIL = "ayesha@example.com";
export const DEMO_VENDOR_EMAIL = "vendor@example.com";

/** Seed accounts. Their auth ids come from Supabase when they're created. */
export const SEED_USERS = [
  { id: "usr_ayesha", email: DEMO_ADMIN_EMAIL, name: "Ayesha Siddiqui" },
  { id: "usr_omar", email: "omar@example.com", name: "Omar Farooq" },
  { id: "usr_nasreen", email: "nasreen@example.com", name: "Nasreen Siddiqui" },
  { id: "usr_khalid", email: "khalid@example.com", name: "Khalid Farooq" },
  { id: "usr_zara", email: "zara@example.com", name: "Zara Siddiqui" },
  { id: "usr_hamza", email: "hamza@example.com", name: "Hamza Farooq" },
  { id: "usr_planner", email: "planner@example.com", name: "Rukhsana (Planner)" },
  { id: "usr_vendor_noor", email: DEMO_VENDOR_EMAIL, name: "Mahnoor (Noor Light Studios)", kind: "vendor" as const },
];

// Deterministic PRNG so the sample wedding looks the same after every reset.
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE = ["Imran", "Bilal", "Hamza", "Faisal", "Kamran", "Adnan", "Zeeshan", "Usman", "Salman", "Rizwan", "Asif", "Tariq", "Junaid", "Saad", "Fahad", "Nadeem", "Shahid", "Arif", "Yusuf", "Ibrahim", "Rehan", "Danish", "Rashid", "Waqar", "Zubair", "Anwar", "Mustafa", "Haroon", "Shoaib", "Tanvir", "Rafiq", "Sohail"];
const FEMALE = ["Sana", "Hina", "Fatima", "Mariam", "Ayesha", "Zainab", "Rabia", "Saima", "Nadia", "Amna", "Sadia", "Farah", "Uzma", "Rubina", "Shazia", "Mehwish", "Iqra", "Noor", "Hafsa", "Khadija", "Samina", "Nasreen", "Farzana", "Lubna", "Asma", "Bushra", "Tahira", "Sumaiya", "Nusrat", "Ruksana", "Maliha", "Anam"];
const KIDS = ["Ali", "Zayd", "Eesa", "Musa", "Adam", "Hana", "Inaya", "Aleena", "Zoya", "Rayyan", "Ayaan", "Maryam", "Hoorain", "Shayan", "Eshal", "Ahad"];
const LAST = ["Ahmed", "Khan", "Qureshi", "Malik", "Sheikh", "Chaudhry", "Hussain", "Rahman", "Ali", "Mirza", "Baig", "Syed", "Haider", "Ansari", "Rizvi", "Javed", "Iqbal", "Hashmi", "Akhtar", "Choudhury", "Hossain", "Uddin", "Memon", "Kazi", "Pathan", "Raza", "Abbasi", "Zaidi", "Butt", "Shah"];

const today = () => new Date("2026-10-18T12:00:00Z").toISOString();

export function buildSeed(): Database {
  const rand = mulberry32(20270417);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  let n = 0;
  const id = (p: string) => `${p}_${(++n).toString(36).padStart(4, "0")}${Math.floor(rand() * 1e6).toString(36)}`;
  const now = today();

  const users = SEED_USERS.map((u) => ({ ...u, createdAt: now }));

  const W = DEMO_WEDDING_ID;
  const wedding: Wedding = {
    id: W,
    slug: "ayesha-and-omar",
    partner1: "Ayesha",
    partner2: "Omar",
    partner1Family: "Siddiqui",
    partner2Family: "Farooq",
    tagline: "Two families, one beginning, Insha'Allah.",
    heroImage: "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=2000&q=80",
    story: [
      { title: "How we met", body: "We met at a fundraising dinner for a local masjid in Richardson. Omar was volunteering at the chai table and Ayesha came back for a third cup. Our families like to say the chai did the matchmaking." },
      { title: "The rishta", body: "After a year of friendship, Omar's parents visited the Siddiqui home with mithai and a lot of nervous small talk. Two cups of chai later (of course), both families said yes." },
      { title: "What comes next", body: "We are so grateful to begin this next chapter surrounded by the people who raised us, taught us, and prayed for us. We cannot wait to celebrate with you." },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80",
      "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1200&q=80",
      "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=1200&q=80",
    ],
    faqs: [
      { q: "Is there parking at the venues?", a: "Yes. Complimentary valet is available at every event. For the Nikkah, overflow parking is available at the community center next door." },
      { q: "Will there be space for prayer?", a: "Yes. Every venue has a dedicated, separate prayer space for men and women, with wudu facilities. We will pause the program for Maghrib and Isha." },
      { q: "Is the food halal?", a: "All catering is 100% zabiha halal and alcohol-free." },
      { q: "Can I bring my children?", a: "Children are warmly welcome at the Nikkah. For other events, please refer to the names listed on your personal invitation." },
      { q: "What should I wear?", a: "Each event lists a dress code. In short: modest formal attire, with traditional South Asian outfits encouraged." },
    ],
    travel: {
      intro: "Most events are in the Dallas–Fort Worth area. If you're traveling, we recommend staying in Plano or Frisco.",
      airport: "Fly into DFW International or Dallas Love Field. Both are about 30 minutes from the venues.",
      hotels: [
        { name: "The Westin Stonebriar", note: "Room block under 'Siddiqui–Farooq' until March 15." },
        { name: "Hilton Garden Inn Plano", note: "Five minutes from the masjid, with a free shuttle on Nikkah day." },
      ],
    },
    registry: {
      message: "Your duas and presence are the greatest gift. If you'd like to give something, we would be grateful for a contribution to our first home, or a donation to our chosen charity.",
      links: [
        { label: "Home fund", url: "https://example.com/home-fund" },
        { label: "Donate to Helping Hand", url: "https://example.com/charity" },
      ],
    },
    theme: { id: "noor", heading: "cormorant", pattern: "arch" },
    culture: {
      showBismillah: true,
      verse: {
        enabled: true,
        arabic: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
        translation: "And among His signs is that He created for you mates from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.",
        reference: "Surah Ar-Rum 30:21",
      },
      islamicDates: true,
      urduNames: { partner1: "عائشہ", partner2: "عمر" },
      halalNote: "All food served is zabiha halal.",
      modestyNote: "We kindly ask guests to dress modestly. Head coverings are required for women inside the masjid prayer hall.",
      prayerNote: "Separate prayer areas with wudu facilities are available at every venue.",
    },
    passwordProtected: false,
    published: true,
    mahr: { amount: "To be finalized by both families", notes: "Private. Visible only to administrators." },
    totalBudget: 95000,
    currency: "USD",
    plan: "signature",
    tradition: "south_asian",
    createdAt: now,
  };

  const baseEvent = {
    weddingId: W, waitlist: false, mealOptions: [] as string[], timeline: [],
    genderSeparated: false, womenOnly: false, noPhotography: false, prayerSpace: true, halal: true,
  };
  const events: WeddingEvent[] = [
    {
      ...baseEvent, id: "evt_mehndi", type: "mehndi", name: "Mehndi Night", date: "2027-04-15", startTime: "19:00", endTime: "23:30",
      venueName: "The Siddiqui Residence", address: "4412 Willow Bend Dr, Plano, TX 75093",
      dressCode: "Bright colors. Yellow and green encouraged.", description: "An intimate evening of henna, dholki songs, and family games, with just our closest family.",
      publicMessage: "", hostSide: "bride", visibility: "private", rsvpMode: "required", rsvpDeadline: "2027-03-20",
      womenOnly: false, timeline: [{ time: "19:00", label: "Henna begins" }, { time: "20:30", label: "Dholki and songs" }, { time: "21:15", label: "Isha prayer" }, { time: "21:45", label: "Dinner" }],
      mealOptions: [], budget: 6000, sortOrder: 1,
    },
    {
      ...baseEvent, id: "evt_nikkah", type: "nikkah", name: "Nikkah", date: "2027-04-16", startTime: "17:30", endTime: "20:00",
      venueName: "Masjid Al-Noor", address: "1200 Crescent Ave, Plano, TX 75074",
      dressCode: "Modest formal attire. Women, please bring a head covering for the prayer hall.",
      description: "Join us as we begin our marriage with the Nikkah ceremony, followed by Maghrib prayer and light refreshments.",
      publicMessage: "We would be honored to have you join us for our Nikkah. Everyone from our community is welcome.",
      hostSide: "both", visibility: "public", rsvpMode: "optional", capacity: 600, waitlist: true,
      genderSeparated: true,
      timeline: [{ time: "17:30", label: "Guest arrival" }, { time: "18:00", label: "Quran recitation" }, { time: "18:15", label: "Khutbah & Nikkah" }, { time: "19:52", label: "Maghrib prayer" }, { time: "20:10", label: "Chai & mithai" }],
      budget: 8000, sortOrder: 2,
    },
    {
      ...baseEvent, id: "evt_shaadi", type: "shaadi", name: "Shaadi", date: "2027-04-17", startTime: "18:30", endTime: "23:59",
      venueName: "The Crescent Ballroom", address: "2200 Ross Ave, Dallas, TX 75201",
      dressCode: "Formal South Asian or black tie.", description: "A grand evening celebration hosted by the Siddiqui family, with the baraat arrival, rukhsati, and dinner.",
      publicMessage: "", hostSide: "bride", visibility: "invite", rsvpMode: "required", rsvpDeadline: "2027-03-15",
      mealOptions: ["Chicken karahi menu", "Mutton biryani menu", "Vegetarian menu"],
      timeline: [{ time: "18:30", label: "Guest arrival & appetizers" }, { time: "19:15", label: "Baraat arrival" }, { time: "20:00", label: "Family entrances" }, { time: "20:15", label: "Maghrib break" }, { time: "20:45", label: "Dinner" }, { time: "22:30", label: "Rukhsati" }],
      budget: 42000, sortOrder: 3,
    },
    {
      ...baseEvent, id: "evt_walima", type: "walima", name: "Walima", date: "2027-04-18", startTime: "18:00", endTime: "22:30",
      venueName: "Magnolia Estate", address: "8900 Legacy Dr, Frisco, TX 75034",
      dressCode: "Formal. Pastels encouraged.", description: "The Farooq family warmly invites you to the Walima reception celebrating the newlyweds.",
      publicMessage: "", hostSide: "groom", visibility: "invite", rsvpMode: "required", rsvpDeadline: "2027-03-15",
      mealOptions: ["Classic menu", "Vegetarian menu", "Kids menu"], genderSeparated: false, noPhotography: false,
      timeline: [{ time: "18:00", label: "Guest arrival" }, { time: "18:45", label: "Couple's entrance" }, { time: "19:55", label: "Maghrib break" }, { time: "20:15", label: "Dinner" }, { time: "21:30", label: "Family speeches" }],
      budget: 30000, sortOrder: 4,
    },
  ];

  // ---------- households & guests ----------
  const households: Household[] = [];
  const guests: Guest[] = [];
  const invitations: Invitation[] = [];
  const rsvps: Rsvp[] = [];

  const mkHousehold = (h: Partial<Household> & { name: string; side: Side }, members: Omit<Guest, "id" | "householdId">[], hid?: string) => {
    const household: Household = {
      id: hid ?? id("hh"), weddingId: W, relationship: "", tags: [], deliveryStatus: "sent", createdAt: now, ...h,
    };
    households.push(household);
    const gs = members.map((m) => ({ ...m, id: id("g"), householdId: household.id }));
    guests.push(...gs);
    return { household, guests: gs };
  };

  const invite = (hhId: string, eventId: string, guestIds: string[]) =>
    invitations.push({ id: id("inv"), householdId: hhId, eventId, guestIds, createdAt: now });

  // Demo households (always pending so testers can RSVP themselves)
  const d1 = mkHousehold(
    { name: "Mr. Imran Qureshi & Family", side: "groom", relationship: "Omar's colleague", tags: ["friends"], email: "imran.q@example.com", phone: "+1 214 555 0101" },
    [
      { firstName: "Imran", lastName: "Qureshi", isChild: false, isPrimary: true, isPlusOne: false },
      { firstName: "Saima", lastName: "Qureshi", isChild: false, isPrimary: false, isPlusOne: false },
      { firstName: "Eesa", lastName: "Qureshi", isChild: true, isPrimary: false, isPlusOne: false },
    ], DEMO_HOUSEHOLDS.nikkahOnly);
  invite(d1.household.id, "evt_nikkah", d1.guests.map((g) => g.id));

  const d2 = mkHousehold(
    { name: "Dr. Sana Malik & Mr. Faisal Malik", side: "bride", relationship: "Ayesha's university friend", tags: ["friends"], email: "sana.malik@example.com", phone: "+1 469 555 0144" },
    [
      { firstName: "Sana", lastName: "Malik", isChild: false, isPrimary: true, isPlusOne: false, dietary: "No shellfish" },
      { firstName: "Faisal", lastName: "Malik", isChild: false, isPrimary: false, isPlusOne: false },
    ], DEMO_HOUSEHOLDS.nikkahShaadi);
  invite(d2.household.id, "evt_nikkah", d2.guests.map((g) => g.id));
  invite(d2.household.id, "evt_shaadi", d2.guests.map((g) => g.id));

  const d3 = mkHousehold(
    { name: "Mr. and Mrs. Tariq Siddiqui & Family", side: "bride", relationship: "Ayesha's uncle (Chacha)", tags: ["immediate_family", "vip"], email: "tariq.siddiqui@example.com", phone: "+1 972 555 0177" },
    [
      { firstName: "Tariq", lastName: "Siddiqui", isChild: false, isPrimary: true, isPlusOne: false },
      { firstName: "Rubina", lastName: "Siddiqui", isChild: false, isPrimary: false, isPlusOne: false },
      { firstName: "Hamid", lastName: "Siddiqui", isChild: false, isPrimary: false, isPlusOne: false },
      { firstName: "Inaya", lastName: "Siddiqui", isChild: true, isPrimary: false, isPlusOne: false },
    ], DEMO_HOUSEHOLDS.allEvents);
  for (const e of events) invite(d3.household.id, e.id, d3.guests.map((g) => g.id));

  // Generated households. Targets: Shaadi 300 guests, Walima 250 guests, different lists.
  const counts = { evt_shaadi: 6, evt_walima: 4, evt_mehndi: 4 } as Record<string, number>;
  const TARGET = { evt_shaadi: 300, evt_walima: 250, evt_mehndi: 42 } as Record<string, number>;

  const genHousehold = (side: Side) => {
    const last = pick(LAST);
    const kind = rand();
    const relPool = side === "bride"
      ? ["Ayesha's cousin", "Family friend of the Siddiquis", "Ayesha's colleague", "Ayesha's school friend", "Nasreen Aunty's friend", "Neighbor", "Ayesha's khala's family", "Ayesha's phupho's family"]
      : ["Omar's cousin", "Family friend of the Farooqs", "Omar's colleague", "Omar's college friend", "Khalid Uncle's business partner", "Masjid community", "Omar's mamu's family", "Omar's chacha's family"];
    const relationship = pick(relPool);
    const tags: string[] = [];
    if (/cousin|khala|phupho|mamu|chacha/.test(relationship)) tags.push("extended_family");
    if (/friend|colleague/.test(relationship)) tags.push("friends");
    if (/community|Neighbor|business/.test(relationship)) tags.push("community");
    if (rand() < 0.06) tags.push("vip");
    const he = pick(MALE), she = pick(FEMALE);
    let name: string; let members: Omit<Guest, "id" | "householdId">[];
    const m = (first: string, child = false, primary = false, plus = false) =>
      ({ firstName: first, lastName: plus ? "" : last, isChild: child, isPrimary: primary, isPlusOne: plus, dietary: rand() < 0.07 ? pick(["Vegetarian", "Nut allergy", "Gluten-free", "No dairy"]) : undefined });
    if (kind < 0.42) {
      const kids = 1 + Math.floor(rand() * 3);
      name = `Mr. and Mrs. ${he} ${last} & Family`;
      members = [m(he, false, true), m(she)];
      const used = new Set<string>();
      for (let k = 0; k < kids; k++) { let c = pick(KIDS); while (used.has(c)) c = pick(KIDS); used.add(c); members.push(m(c, true)); }
    } else if (kind < 0.72) {
      name = `Mr. and Mrs. ${he} ${last}`;
      members = [m(he, false, true), m(she)];
    } else if (kind < 0.86) {
      const single = rand() < 0.5 ? he : she;
      name = `${single === he ? "Mr." : "Ms."} ${single} ${last} & Guest`;
      members = [m(single, false, true), m("Guest", false, false, true)];
    } else {
      const single = rand() < 0.5 ? he : she;
      name = `${single === he ? "Mr." : "Ms."} ${single} ${last}`;
      members = [m(single, false, true)];
    }
    const slugName = (members[0].firstName + "." + last).toLowerCase();
    return mkHousehold({
      name, side, relationship, tags,
      email: rand() < 0.9 ? `${slugName}${Math.floor(rand() * 90 + 10)}@example.com` : undefined,
      phone: rand() < 0.85 ? `+1 ${pick(["214", "469", "972", "817"])} 555 ${String(Math.floor(rand() * 9000 + 1000))}` : undefined,
      deliveryStatus: rand() < 0.08 ? "not_sent" : rand() < 0.04 ? "bounced" : rand() < 0.6 ? "opened" : "sent",
    }, members);
  };

  const add = (evt: string, hh: { household: Household; guests: Guest[] }) => {
    const remaining = TARGET[evt] - counts[evt];
    if (remaining <= 0) return false;
    const gs = hh.guests.slice(0, remaining);
    invite(hh.household.id, evt, gs.map((g) => g.id));
    counts[evt] += gs.length;
    return true;
  };

  // Bride-side close family: Mehndi + Nikkah + Shaadi + Walima
  // Shared friends/family: Nikkah + Shaadi + Walima
  // Bride-side others: Nikkah + Shaadi; Groom-side others: Nikkah + Walima
  // Remaining community: Nikkah only
  let guard = 0;
  while ((counts.evt_shaadi < 300 || counts.evt_walima < 250) && guard++ < 400) {
    const r = rand();
    if (counts.evt_mehndi < 42 && r < 0.18) {
      const hh = genHousehold("bride"); hh.household.tags = [...new Set(["extended_family", ...hh.household.tags.filter((t) => t !== "friends" && t !== "community")])];
      invite(hh.household.id, "evt_nikkah", hh.guests.map((g) => g.id));
      add("evt_mehndi", hh); add("evt_shaadi", hh); add("evt_walima", hh);
    } else if (r < 0.45) {
      const hh = genHousehold(rand() < 0.5 ? "bride" : "groom");
      invite(hh.household.id, "evt_nikkah", hh.guests.map((g) => g.id));
      add("evt_shaadi", hh); add("evt_walima", hh);
    } else if (r < 0.72) {
      const hh = genHousehold("bride");
      invite(hh.household.id, "evt_nikkah", hh.guests.map((g) => g.id));
      if (!add("evt_shaadi", hh)) add("evt_walima", hh);
    } else {
      const hh = genHousehold("groom");
      invite(hh.household.id, "evt_nikkah", hh.guests.map((g) => g.id));
      if (!add("evt_walima", hh)) add("evt_shaadi", hh);
    }
  }
  // Nikkah-only community households
  for (let i = 0; i < 26; i++) {
    const hh = genHousehold(rand() < 0.5 ? "bride" : "groom");
    hh.household.tags = [...new Set([...hh.household.tags, "community"])];
    invite(hh.household.id, "evt_nikkah", hh.guests.map((g) => g.id));
  }

  // ---------- RSVPs for generated households ----------
  const demoIds = new Set<string>(Object.values(DEMO_HOUSEHOLDS));
  const events2meals = Object.fromEntries(events.map((e) => [e.id, e.mealOptions]));
  for (const inv of invitations) {
    if (demoIds.has(inv.householdId)) continue;
    const responded = rand() < (inv.eventId === "evt_nikkah" ? 0.5 : 0.68);
    if (!responded) continue;
    const declinedAll = rand() < 0.12;
    for (const gid of inv.guestIds) {
      const declined = declinedAll || rand() < 0.05;
      const meals = events2meals[inv.eventId];
      const g = guests.find((x) => x.id === gid)!;
      rsvps.push({
        id: id("rsvp"), eventId: inv.eventId, guestId: gid, householdId: inv.householdId,
        status: declined ? "declined" : "attending",
        meal: !declined && meals.length ? (g.isChild && meals.includes("Kids menu") ? "Kids menu" : pick(meals.filter((x) => x !== "Kids menu"))) : undefined,
        updatedAt: new Date(Date.parse("2026-09-01") + rand() * 40 * 864e5).toISOString(), updatedVia: "guest_link",
      });
    }
  }

  // Seat a portion of confirmed Shaadi guests
  let table = 1, seated = 0;
  for (const r of rsvps.filter((r) => r.eventId === "evt_shaadi" && r.status === "attending").slice(0, 120)) {
    const g = guests.find((x) => x.id === r.guestId)!;
    g.table = `Table ${table}`; if (++seated % 10 === 0) table++;
  }

  // ---------- public Nikkah registrations ----------
  const registrations: PublicRegistration[] = [];
  for (let i = 0; i < 64; i++) {
    const first = rand() < 0.5 ? pick(MALE) : pick(FEMALE); const last = pick(LAST);
    registrations.push({
      id: id("reg"), eventId: "evt_nikkah", name: `${first} ${last}`, email: `${first}.${last}${i}@example.com`.toLowerCase(),
      adults: 1 + Math.floor(rand() * 3), children: Math.floor(rand() * 3), status: "confirmed",
      createdAt: new Date(Date.parse("2026-09-10") + rand() * 30 * 864e5).toISOString(),
    });
  }
  // Same person registering twice under a different email: flagged by name.
  const dupSrc = registrations[3];
  registrations.push({ ...dupSrc, id: id("reg"), name: dupSrc.name.toUpperCase(), email: `${dupSrc.email.split("@")[0]}.personal@example.com`, duplicateOf: dupSrc.id, createdAt: now });

  // ---------- tokens ----------
  const tokens = households.map((h) => {
    const tid = seedUuid(`tok:${h.id}`);
    return { id: tid, token: deriveToken(tid), householdId: h.id, weddingId: W, createdAt: now, useCount: 0 };
  });

  // ---------- planning ----------
  const vendor = (category: string, name: string, contact: string, eventIds: string[], status: Vendor["status"], notes?: string): Vendor =>
    ({ id: id("ven"), weddingId: W, category, name, contact, eventIds, status, notes, phone: "+1 214 555 0" + Math.floor(rand() * 900 + 100), email: `hello@${name.toLowerCase().replace(/[^a-z]/g, "")}.example.com` });
  const vendors: Vendor[] = [
    vendor("Venue", "The Crescent Ballroom", "Leila Haddad", ["evt_shaadi"], "booked", "Holds 350 seated. Separate prayer room on the 2nd floor."),
    vendor("Venue", "Magnolia Estate", "James Ortiz", ["evt_walima"], "booked"),
    vendor("Catering", "Zaiqa Halal Catering", "Chef Azhar", ["evt_shaadi", "evt_walima"], "booked", "Zabiha certified. Tasting on Jan 12."),
    vendor("Catering", "Chai & Mithai Co.", "Rehana", ["evt_nikkah", "evt_mehndi"], "contacted"),
    vendor("Decor", "Gulzar Events & Decor", "Sameer", ["evt_mehndi", "evt_shaadi"], "booked"),
    vendor("Photography", "Noor Light Studios", "Mahnoor", ["evt_nikkah", "evt_shaadi", "evt_walima"], "booked", "Female photographer for the women's section."),
    vendor("Videography", "Reel Rishta Films", "Adeel", ["evt_shaadi", "evt_walima"], "contacted"),
    vendor("Makeup", "Glow by Hira", "Hira", ["evt_nikkah", "evt_shaadi", "evt_walima"], "booked"),
    vendor("Henna", "Henna by Saba", "Saba", ["evt_mehndi"], "booked"),
    vendor("Florist", "Petal & Palm", "Grace", ["evt_shaadi", "evt_walima"], "researching"),
    vendor("Invitations", "Kaghaz Studio", "Faraz", [], "paid"),
    vendor("Transportation", "Royal Baraat Rides", "Danny", ["evt_shaadi"], "researching", "Vintage car for rukhsati."),
  ];
  const v = (name: string) => vendors.find((x) => x.name === name)!.id;
  const exp = (category: string, description: string, estimated: number, actual: number, paid: number, responsibility: Side, eventId?: string, vendorId?: string, dueDate?: string): Expense =>
    ({ id: id("exp"), weddingId: W, category, description, estimated, actual, paid, responsibility, eventId, vendorId, dueDate });
  const expenses: Expense[] = [
    exp("Venue", "Ballroom rental", 18000, 17500, 5000, "bride", "evt_shaadi", v("The Crescent Ballroom"), "2027-03-01"),
    exp("Catering", "Shaadi dinner (300)", 16500, 16200, 4000, "bride", "evt_shaadi", v("Zaiqa Halal Catering"), "2027-04-01"),
    exp("Decor", "Stage & floral", 6000, 6400, 2000, "bride", "evt_shaadi", v("Gulzar Events & Decor"), "2027-03-15"),
    exp("Venue", "Estate rental", 12000, 12000, 4000, "groom", "evt_walima", v("Magnolia Estate"), "2027-03-01"),
    exp("Catering", "Walima dinner (250)", 13000, 12750, 3000, "groom", "evt_walima", v("Zaiqa Halal Catering"), "2027-04-01"),
    exp("Venue", "Masjid donation & hall", 2500, 2500, 2500, "both", "evt_nikkah"),
    exp("Catering", "Chai & mithai for 600", 3500, 0, 0, "both", "evt_nikkah", v("Chai & Mithai Co.")),
    exp("Decor", "Mehndi decor & lights", 2500, 2200, 1000, "bride", "evt_mehndi", v("Gulzar Events & Decor")),
    exp("Henna", "Bridal + guest henna", 1200, 1200, 300, "bride", "evt_mehndi", v("Henna by Saba")),
    exp("Photography", "3-event coverage", 9000, 9000, 3000, "both", undefined, v("Noor Light Studios"), "2027-02-01"),
    exp("Videography", "Highlight film", 5000, 0, 0, "groom", undefined, v("Reel Rishta Films")),
    exp("Attire", "Bridal lehenga", 4500, 4800, 4800, "bride"),
    exp("Attire", "Groom sherwani", 1800, 1650, 1650, "groom"),
    exp("Makeup", "Bridal makeup (3 looks)", 2400, 2400, 600, "bride", undefined, v("Glow by Hira")),
    exp("Invitations", "Printed cards for elders", 1200, 1150, 1150, "both", undefined, v("Kaghaz Studio")),
    exp("Transportation", "Rukhsati car", 900, 0, 0, "groom", "evt_shaadi", v("Royal Baraat Rides")),
  ];

  const task = (title: string, assignee: string, side: Side, eventId?: string, dueDate?: string, done = false): Task =>
    ({ id: id("tsk"), weddingId: W, title, assignee, side, eventId, dueDate, done });
  const tasks: Task[] = [
    task("Confirm Nikkah date with the masjid imam", "Khalid Farooq", "groom", "evt_nikkah", "2026-08-01", true),
    task("Finalize Mahr with both families", "Ayesha & Omar", "both", "evt_nikkah", "2026-11-15"),
    task("Arrange witnesses (gawah) and wakeel", "Khalid Farooq", "both", "evt_nikkah", "2027-03-01"),
    task("Order mithai boxes for Nikkah", "Nasreen Siddiqui", "bride", "evt_nikkah", "2027-04-01"),
    task("Book separate seating layout with masjid", "Omar Farooq", "groom", "evt_nikkah", "2027-02-15"),
    task("Book Shaadi venue", "Nasreen Siddiqui", "bride", "evt_shaadi", "2026-07-01", true),
    task("Menu tasting with Zaiqa", "Ayesha Siddiqui", "bride", "evt_shaadi", "2027-01-12"),
    task("Finalize Shaadi guest list", "Nasreen Siddiqui", "bride", "evt_shaadi", "2026-12-01"),
    task("Plan baraat entrance music", "Hamza Farooq", "groom", "evt_shaadi", "2027-03-20"),
    task("Seating chart for 300", "Zara Siddiqui", "bride", "evt_shaadi", "2027-04-05"),
    task("Book Walima venue", "Khalid Farooq", "groom", "evt_walima", "2026-07-15", true),
    task("Finalize Walima guest list", "Khalid Farooq", "groom", "evt_walima", "2026-12-01"),
    task("Order Walima favors", "Omar Farooq", "groom", "evt_walima", "2027-03-15"),
    task("Book henna artist", "Zara Siddiqui", "bride", "evt_mehndi", "2026-10-01", true),
    task("Dholki song practice schedule", "Zara Siddiqui", "bride", "evt_mehndi", "2027-03-01"),
    task("Buy bridal lehenga", "Ayesha Siddiqui", "bride", undefined, "2026-09-30", true),
    task("Sherwani fitting", "Omar Farooq", "groom", undefined, "2027-02-20"),
    task("Send save-the-dates", "Ayesha Siddiqui", "both", undefined, "2026-10-30"),
    task("Send digital invitations", "Ayesha Siddiqui", "both", undefined, "2027-01-15"),
    task("Book hotel room block", "Hamza Farooq", "groom", undefined, "2026-12-15", true),
    task("Arrange airport pickups for family from Karachi", "Hamza Farooq", "groom", undefined, "2027-04-01"),
  ];

  const collaborators = [
    { id: "col_1", userId: "usr_ayesha", role: "admin", relationship: "Bride" },
    { id: "col_2", userId: "usr_omar", role: "admin", relationship: "Groom" },
    { id: "col_3", userId: "usr_nasreen", role: "bride_organizer", relationship: "Bride's mother" },
    { id: "col_4", userId: "usr_khalid", role: "groom_organizer", relationship: "Groom's father" },
    { id: "col_5", userId: "usr_zara", role: "event_organizer", relationship: "Bride's sister", eventIds: ["evt_mehndi"] },
    { id: "col_6", userId: "usr_hamza", role: "budget_manager", relationship: "Groom's brother" },
    { id: "col_7", userId: "usr_planner", role: "viewer", relationship: "Wedding planner" },
  ].map((c) => ({ ...c, weddingId: W, invitedAt: now })) as Database["collaborators"];

  for (const e of events) e.palette = EVENT_PALETTES[e.id];
  const listings = buildListings("usr_vendor_noor");
  for (const v of vendors) v.listingId = listings.find((l) => l.name === v.name)?.id;

  return withUuids({
    users, invites: [], weddings: [wedding], collaborators, events, households, guests, invitations, rsvps, tokens, registrations,
    vendors, expenses, tasks, outbox: [],
    outfits: buildOutfits(W, (name) => vendors.find((v) => v.name === name)?.id),
    boards: buildBoards(W),
    listings,
    inquiries: buildInquiries(),
    audit: [
      { id: id("aud"), weddingId: W, at: now, actor: "System", action: "seed", detail: "Sample wedding created" },
    ],
    designs: [
      { id: "des_nikkah", weddingId: W, eventId: "evt_nikkah", template: "arch", englishText: "Together with their families, Ayesha Siddiqui & Omar Farooq invite you to celebrate their Nikkah", urduText: "آپ کی شرکت ہمارے لیے باعثِ مسرت ہوگی", arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", showQr: true },
      { id: "des_shaadi", weddingId: W, eventId: "evt_shaadi", template: "jali", englishText: "Mr. and Mrs. Javed Siddiqui request the pleasure of your company at the Shaadi of their daughter Ayesha with Omar Farooq", urduText: "شادی کی تقریب میں آپ کی شرکت باعثِ عزت ہوگی", arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", showQr: true },
      { id: "des_walima", weddingId: W, eventId: "evt_walima", template: "minimal", englishText: "Mr. and Mrs. Khalid Farooq request the honour of your presence at the Walima of their son Omar with Ayesha", urduText: "ولیمہ کی تقریب میں تشریف لائیں", arabicText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", showQr: true },
    ],
  });
}

const ID_FIELDS = ["id", "weddingId", "eventId", "householdId", "guestId", "vendorId", "listingId", "duplicateOf"];

/** Swap the readable seed ids ("evt_nikkah") for the uuids the database uses. User ids are mapped at load time. */
function withUuids(d: Database): Database {
  for (const [key, rows] of Object.entries(d)) {
    if (key === "users") continue;
    for (const row of rows as Record<string, unknown>[]) {
      for (const f of ID_FIELDS) if (typeof row[f] === "string") row[f] = seedUuid(row[f] as string);
      for (const f of ["eventIds", "guestIds"]) if (Array.isArray(row[f])) row[f] = (row[f] as string[]).map(seedUuid);
    }
  }
  return d;
}
