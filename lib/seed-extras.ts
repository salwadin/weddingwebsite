// Sample outfits, design boards, marketplace listings and inquiries for the demo.
import type { Board, BoardItem, Inquiry, Listing, Outfit } from "./types";

const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;
export const PHOTOS = {
  ballroom: "1587271407850-8d438ca9fdf2",
  rings: "1606800052052-a08af7148866",
  hands: "1465495976277-4387d4b0b4c6",
  bouquet: "1519741497674-611481863552",
  chairs: "1522673607200-164d1b6ce486",
  walk: "1532712938310-34cb3982ef74",
  arch: "1511285560929-80b456fea0bc",
  pool: "1600011689032-8b628b8a8747",
};

export const EVENT_PALETTES: Record<string, string[]> = {
  evt_mehndi: ["#E3B23C", "#7A9A3A", "#E97451", "#F2D16B"],
  evt_nikkah: ["#F4EEE3", "#C9B48A", "#8A9A82", "#FFFFFF"],
  evt_shaadi: ["#7A1F2B", "#B08D57", "#1F2A44", "#2F4F3E"],
  evt_walima: ["#D8C3D9", "#BFD3C1", "#E8D9BC", "#C7D3E3"],
};

let n = 0;
const sid = (p: string) => `${p}_x${(++n).toString(36).padStart(3, "0")}`;

export function buildOutfits(W: string, vendorId: (name: string) => string | undefined): Outfit[] {
  n = 0;
  const pieces = (...names: string[]) => names.map((name, i) => ({ id: sid("pc"), name, done: i < Math.floor(names.length / 2) }));
  const o = (x: Omit<Outfit, "id" | "weddingId">): Outfit => ({ id: sid("out"), weddingId: W, ...x });
  return [
    o({ eventId: "evt_mehndi", wearer: "Ayesha", role: "bride", side: "bride", title: "Mustard & green gota lehenga", designer: "Family tailor, Karachi", status: "ready", colors: ["#E3B23C", "#7A9A3A"], cost: 900, paid: 900,
      pieces: pieces("Lehenga", "Dupatta", "Floral jewelry", "Khussay"), fittings: [{ id: sid("ft"), date: "2026-09-12", note: "Final fitting", done: true }], image: img(PHOTOS.bouquet, 600) }),
    o({ eventId: "evt_nikkah", wearer: "Ayesha", role: "bride", side: "bride", title: "Ivory sharara with gold zari", designer: "Zari Atelier", status: "alterations", colors: ["#F4EEE3", "#C9B48A"], cost: 1800, paid: 900, dueDate: "2027-03-20",
      pieces: pieces("Kurta & sharara", "Dupatta / hijab", "Jhumkay", "Heels"), fittings: [{ id: sid("ft"), date: "2026-11-08", note: "First fitting: take in waist", done: false }, { id: sid("ft"), date: "2027-02-14", note: "Final fitting", done: false }], image: img(PHOTOS.hands, 600) }),
    o({ eventId: "evt_shaadi", wearer: "Ayesha", role: "bride", side: "bride", title: "Red bridal lehenga", designer: "Lahore couture house", vendorId: undefined, status: "ordered", colors: ["#7A1F2B", "#B08D57"], cost: 4800, paid: 2400, dueDate: "2027-02-28",
      pieces: pieces("Lehenga", "Double dupatta", "Nath, tikka & jhumkay", "Bangles", "Khussay"), fittings: [{ id: sid("ft"), date: "2027-03-05", note: "Fitting after shipment arrives", done: false }], notes: "Ship by Feb 28 to allow alterations. Ask about customs paperwork.", image: img(PHOTOS.ballroom, 600) }),
    o({ eventId: "evt_walima", wearer: "Ayesha", role: "bride", side: "bride", title: "Pastel lilac gown", designer: "Undecided", status: "sourcing", colors: ["#D8C3D9"], cost: 2000, paid: 0, dueDate: "2027-03-15",
      pieces: pieces("Gown", "Hijab / dupatta", "Jewelry set"), fittings: [] }),
    o({ eventId: "evt_nikkah", wearer: "Omar", role: "groom", side: "groom", title: "Ivory sherwani", designer: "Royal Menswear", status: "ready", colors: ["#F4EEE3"], cost: 650, paid: 650,
      pieces: pieces("Sherwani", "Churidar", "Khussa"), fittings: [{ id: sid("ft"), date: "2026-10-02", note: "Done", done: true }] }),
    o({ eventId: "evt_shaadi", wearer: "Omar", role: "groom", side: "groom", title: "Gold sherwani with safa", designer: "Royal Menswear", status: "alterations", colors: ["#B08D57", "#7A1F2B"], cost: 1650, paid: 800, dueDate: "2027-03-01",
      pieces: pieces("Sherwani", "Safa / kulla", "Stole", "Khussa", "Sehra"), fittings: [{ id: sid("ft"), date: "2027-02-20", note: "Sleeve length", done: false }] }),
    o({ eventId: "evt_walima", wearer: "Omar", role: "groom", side: "groom", title: "Navy three-piece suit", designer: "Off the rack + tailoring", status: "idea", colors: ["#1F2A44"], cost: 900, paid: 0, pieces: pieces("Suit", "Shirt", "Shoes"), fittings: [] }),
    o({ eventId: "evt_shaadi", wearer: "Nasreen Siddiqui (mother of the bride)", role: "family", side: "bride", title: "Maroon & gold sharara", designer: "Zari Atelier", status: "ordered", colors: ["#7A1F2B", "#B08D57"], cost: 700, paid: 350, pieces: pieces("Sharara", "Dupatta", "Jewelry"), fittings: [] }),
    o({ eventId: "evt_walima", wearer: "Khalid Farooq (father of the groom)", role: "family", side: "groom", title: "Charcoal prince coat", designer: "Royal Menswear", status: "sourcing", colors: ["#3A3A3A"], cost: 450, paid: 0, pieces: pieces("Prince coat", "Trousers"), fittings: [] }),
    o({ eventId: "evt_mehndi", wearer: "Bridesmaids (6)", role: "party", side: "bride", title: "Matching mustard kurtas", designer: "Group order", status: "ordered", colors: ["#E3B23C"], cost: 720, paid: 720, dueDate: "2027-03-01",
      pieces: pieces("Sizes collected", "Order placed", "Delivered", "Distributed"), fittings: [], notes: "Zara is collecting sizes in the family group chat." }),
  ];
}

export function buildBoards(W: string): Board[] {
  n = 0;
  const it = (type: BoardItem["type"], x: number, y: number, w: number, h: number, extra: Partial<BoardItem> = {}): BoardItem => ({ id: sid("bi"), type, x, y, w, h, ...extra });
  const mood: BoardItem[] = [
    it("text", 40, 30, 520, 60, { text: "Shaadi: deep red, antique gold, candlelight" }),
    it("image", 40, 110, 360, 260, { src: img(PHOTOS.ballroom, 800) }),
    it("image", 420, 110, 240, 300, { src: img(PHOTOS.bouquet, 600) }),
    it("image", 680, 110, 300, 200, { src: img(PHOTOS.rings, 600) }),
    it("swatch", 40, 400, 110, 110, { color: "#7A1F2B", text: "Maroon" }),
    it("swatch", 165, 400, 110, 110, { color: "#B08D57", text: "Antique gold" }),
    it("swatch", 290, 400, 110, 110, { color: "#1F2A44", text: "Midnight" }),
    it("swatch", 415, 400, 110, 110, { color: "#F4EEE3", text: "Ivory" }),
    it("note", 680, 330, 300, 180, { text: "Stage: arched floral backdrop, marigold + red roses. Low centerpieces so elders can see across tables.", color: "#FFF4C2" }),
    it("note", 1000, 110, 240, 160, { text: "Ask Gulzar about brass lanterns for the entrance aisle.", color: "#E3F0DB" }),
  ];
  const plan: BoardItem[] = [
    it("stage", 520, 30, 360, 110, { text: "Stage", color: "#E8D9BC" }),
    it("zone", 40, 30, 220, 160, { text: "Prayer room", color: "#E3E8DE" }),
    it("zone", 1140, 30, 220, 160, { text: "Buffet", color: "#F3E1DD" }),
    it("zone", 600, 820, 200, 70, { text: "Entrance", color: "#EEE7DA" }),
  ];
  let t = 1;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
    plan.push(it("table_round", 150 + col * 190, 230 + row * 115, 90, 90, { text: `T${t++}`, seats: 10 }));
  }
  plan.push(it("table_rect", 560, 160, 280, 50, { text: "Family table", seats: 12 }));
  return [
    { id: "brd_mood_shaadi", weddingId: W, name: "Shaadi look & feel", kind: "moodboard", eventId: "evt_shaadi", items: mood, updatedAt: "2026-10-10T12:00:00Z" },
    { id: "brd_plan_shaadi", weddingId: W, name: "Crescent Ballroom floor plan", kind: "floorplan", eventId: "evt_shaadi", items: plan, updatedAt: "2026-10-12T12:00:00Z" },
  ];
}

export function buildListings(vendorUserId: string): Listing[] {
  n = 0;
  const L = (x: Omit<Listing, "id" | "published" | "views" | "createdAt"> & { id?: string }): Listing =>
    ({ published: true, views: Math.floor(200 + ((x.name.length * 97) % 1800)), createdAt: "2026-06-01T00:00:00Z", ...x, id: x.id ?? sid("lst") });
  return [
    L({ id: "lst_noor_light", ownerUserId: vendorUserId, name: "Noor Light Studios", category: "Photography", city: "Dallas", serves: ["Texas", "Travels nationwide"], tagline: "Documentary wedding photography with an all-female team available.",
      description: "We photograph multi-day weddings: Mehndi, Nikah, Walima and everything in between. Female photographers for women-only events and modest-friendly posing on request.",
      images: [img(PHOTOS.hands), img(PHOTOS.rings), img(PHOTOS.walk)], priceRange: 3, tags: ["female_team", "multi_day", "modest_friendly"], traditions: ["south_asian", "arab", "somali"],
      email: "hello@noorlight.example.com", phone: "+1 214 555 0110", website: "https://example.com/noorlight", tier: "spotlight", rating: 4.9, reviewCount: 86 }),
    L({ name: "Zaiqa Halal Catering", category: "Catering", city: "Dallas", serves: ["Dallas–Fort Worth"], tagline: "Zabiha-certified catering for 50 to 1,500 guests.", description: "Pakistani, Hyderabadi and Arabic menus, live BBQ stations, and chai service. Tastings every second Saturday.",
      images: [img(PHOTOS.ballroom)], priceRange: 2, tags: ["halal_certified", "large_events"], traditions: ["south_asian", "arab"], email: "events@zaiqa.example.com", tier: "featured", rating: 4.7, reviewCount: 132 }),
    L({ name: "Zari Atelier", category: "Bridal wear", city: "Houston", serves: ["Ships worldwide"], tagline: "Made-to-measure bridal and family outfits.", description: "Hand-embellished lehengas, shararas and modest gowns. Virtual consultations and fittings with your local tailor.",
      images: [img(PHOTOS.bouquet)], priceRange: 4, tags: ["modest_fashion", "custom_made", "virtual_consults"], traditions: ["south_asian", "arab", "persian"], email: "studio@zari.example.com", tier: "spotlight", rating: 4.8, reviewCount: 54 }),
    L({ name: "Royal Menswear", category: "Menswear", city: "Chicago", serves: ["Ships to US & Canada"], tagline: "Sherwanis, thobes, and suits for the groom and his family.", description: "Ready-to-wear and bespoke sherwanis, bishts and three-piece suits. Group discounts for groomsmen.",
      images: [img(PHOTOS.walk)], priceRange: 2, tags: ["custom_made", "group_orders"], traditions: ["south_asian", "arab", "west_african"], email: "orders@royalmenswear.example.com", tier: "featured", rating: 4.6, reviewCount: 41 }),
    L({ name: "Henna by Saba", category: "Henna", city: "Dallas", serves: ["Texas"], tagline: "Bridal and guest henna with organic paste.", description: "Bridal designs with hidden initials, plus guest artists for parties of 20 to 200.",
      images: [img(PHOTOS.hands)], priceRange: 2, tags: ["female_team", "organic"], traditions: ["south_asian", "arab", "somali", "west_african"], email: "saba@henna.example.com", tier: "basic", rating: 5.0, reviewCount: 77 }),
    L({ name: "Imam Yusuf Khalil · Nikah officiant", category: "Officiant", city: "Atlanta", serves: ["Georgia", "Travels nationwide"], tagline: "Nikah ceremonies in English and Arabic, with premarital sessions.", description: "Bilingual khutbah, help with the marriage contract and witnesses, and coordination with civil registration.",
      images: [img(PHOTOS.chairs)], priceRange: 1, tags: ["multilingual", "premarital"], traditions: ["arab", "south_asian", "west_african", "somali"], email: "imam.yusuf@example.com", tier: "basic", rating: 4.9, reviewCount: 29 }),
    L({ name: "Gulzar Events & Decor", category: "Decor", city: "Dallas", serves: ["Texas", "Oklahoma"], tagline: "Stages, florals and lighting for every event of the week.", description: "From marigold Mehndi swings to all-white Nikah stages. Floor plans and setup included.",
      images: [img(PHOTOS.ballroom), img(PHOTOS.arch)], priceRange: 3, tags: ["multi_day", "floor_plans"], traditions: ["south_asian", "arab", "persian"], email: "design@gulzar.example.com", tier: "featured", rating: 4.8, reviewCount: 64 }),
    L({ name: "Al-Andalus Ballroom", category: "Venue", city: "New York", serves: ["New York metro"], tagline: "Alcohol-free ballroom with separate prayer rooms and partitions.", description: "Seats up to 600, with a movable partition for separate men's and women's sections and on-site wudu facilities.",
      images: [img(PHOTOS.ballroom)], priceRange: 4, tags: ["alcohol_free", "prayer_room", "gender_partitions"], traditions: ["arab", "south_asian", "turkish", "west_african"], email: "events@alandalus.example.com", tier: "spotlight", rating: 4.7, reviewCount: 58 }),
    L({ name: "Shirin Sofreh Aghd", category: "Decor", city: "Los Angeles", serves: ["California"], tagline: "Hand-styled sofreh aghd spreads.", description: "Traditional and modern sofreh designs with mirrors, candelabras, sweets and calligraphy.",
      images: [img(PHOTOS.rings)], priceRange: 3, tags: ["custom_made"], traditions: ["persian"], email: "hello@shirin.example.com", tier: "basic", rating: 4.9, reviewCount: 23 }),
    L({ name: "Zaffa Royale", category: "Entertainment", city: "Dearborn", serves: ["Michigan", "Ohio", "Travels nationwide"], tagline: "Traditional zaffa troupe with drums and bagpipes.", description: "Lebanese and Egyptian zaffa entrances, with a female-only option for women's halls.",
      images: [img(PHOTOS.arch)], priceRange: 2, tags: ["female_team"], traditions: ["arab"], email: "book@zafa.example.com", tier: "featured", rating: 4.8, reviewCount: 37 }),
    L({ name: "Daf & Nasheed Collective", category: "Entertainment", city: "Toronto", serves: ["Ontario", "Travels nationwide"], tagline: "Live nasheeds and daf, with vocal-only sets available.", description: "Vocal-only and daf performances for Nikah, Walima and family nights in English, Arabic, Urdu and Turkish.",
      images: [img(PHOTOS.chairs)], priceRange: 2, tags: ["multilingual"], traditions: ["arab", "south_asian", "turkish"], email: "hello@daf.example.com", tier: "basic", rating: 4.6, reviewCount: 18 }),
    L({ name: "Kına Gecesi Co.", category: "Planner", city: "London", serves: ["UK", "Istanbul"], tagline: "Turkish henna nights, planned start to finish.", description: "Bindallı dresses, red veils, candles and kına trays, plus coordination with your henna artist.",
      images: [img(PHOTOS.hands)], priceRange: 3, tags: ["multi_day"], traditions: ["turkish"], email: "merhaba@kina.example.com", tier: "basic", rating: 4.9, reviewCount: 15 }),
    L({ name: "Aso Ebi Studio", category: "Bridal wear", city: "Houston", serves: ["Ships worldwide"], tagline: "Coordinated family fabrics and modest bridal looks.", description: "Group fabric orders for the whole family, matched to your event colors, plus modest bridal gowns and gele styling.",
      images: [img(PHOTOS.bouquet)], priceRange: 2, tags: ["group_orders", "modest_fashion"], traditions: ["west_african"], email: "hello@asoebi.example.com", tier: "featured", rating: 4.7, reviewCount: 46 }),
    L({ name: "Hooyo's Kitchen", category: "Catering", city: "Minneapolis", serves: ["Minnesota"], tagline: "Somali wedding feasts: bariis, hilib ari and more.", description: "Halal catering for weddings and shaash saar gatherings, with family-style service.",
      images: [img(PHOTOS.chairs)], priceRange: 1, tags: ["halal_certified", "large_events"], traditions: ["somali", "east_african"], email: "orders@hooyo.example.com", tier: "basic", rating: 4.8, reviewCount: 61 }),
    L({ name: "Glow by Hira", category: "Makeup", city: "Dallas", serves: ["Texas"], tagline: "Bridal makeup and hijab styling for every event.", description: "Three-look bridal packages, with hijab and dupatta setting included. Female-only studio.",
      images: [img(PHOTOS.hands)], priceRange: 2, tags: ["female_team", "hijab_styling"], traditions: ["south_asian", "arab", "somali"], email: "book@glowbyhira.example.com", tier: "basic", rating: 4.9, reviewCount: 102 }),
    L({ name: "Mirage Desserts", category: "Desserts", city: "Chicago", serves: ["Illinois", "Wisconsin"], tagline: "Mithai, baklava and dessert tables.", description: "Custom mithai boxes, kunafa stations and wedding cakes, all with halal gelatin-free ingredients.",
      images: [img(PHOTOS.rings)], priceRange: 2, tags: ["halal_certified"], traditions: ["south_asian", "arab", "turkish", "persian"], email: "sweet@mirage.example.com", tier: "basic", rating: 4.7, reviewCount: 33 }),
  ];
}

export function buildInquiries(): Inquiry[] {
  n = 0;
  const q = (x: Omit<Inquiry, "id">): Inquiry => ({ id: sid("inq"), ...x });
  return [
    q({ listingId: "lst_noor_light", weddingId: "wed_ayesha_omar", fromName: "Ayesha Siddiqui", fromEmail: "ayesha@example.com", eventDate: "2027-04-16", guests: 600, message: "Hi! Do you have a female photographer available for the women's side of our Nikah on April 16, plus coverage for the Shaadi and Walima?", status: "booked", createdAt: "2026-05-02T15:00:00Z" }),
    q({ listingId: "lst_noor_light", fromName: "Layla Haddad", fromEmail: "layla@example.com", eventDate: "2027-06-05", guests: 250, message: "Looking for coverage of our katb al-kitab and reception in Houston. Do you travel?", status: "new", createdAt: "2026-10-15T09:30:00Z" }),
    q({ listingId: "lst_noor_light", fromName: "Hodan Warsame", fromEmail: "hodan@example.com", eventDate: "2027-08-21", guests: 400, message: "Salaam! We need photos for the nikah, aroos and shaash saar. Could you send packages?", status: "replied", createdAt: "2026-10-09T18:10:00Z" }),
  ];
}
