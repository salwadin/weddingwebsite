import type { EventType, RsvpMode, Side, Visibility } from "./types";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const d = (iso: string) => new Date(`${iso}T12:00:00`);

export function longDate(iso: string) {
  return d(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
export function shortDate(iso: string) {
  return d(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function dayMonth(iso: string) {
  return d(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function islamicDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(d(iso));
  } catch {
    return "";
  }
}
export function time12(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}
export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export const EVENT_TYPES: { value: EventType; label: string; blurb: string }[] = [
  { value: "ceremony", label: "Wedding ceremony", blurb: "Vows, in any tradition" },
  { value: "nikkah", label: "Nikah", blurb: "The Islamic marriage ceremony" },
  { value: "katb_kitab", label: "Katb al-Kitab", blurb: "Signing of the marriage contract" },
  { value: "aqd", label: "Aghd", blurb: "Persian ceremony at the sofreh" },
  { value: "tea_ceremony", label: "Tea ceremony", blurb: "Honoring elders with tea" },
  { value: "civil", label: "Civil ceremony", blurb: "Legal registration" },
  { value: "engagement", label: "Engagement", blurb: "Mangni, khutbah, or engagement party" },
  { value: "welcome_dinner", label: "Welcome dinner", blurb: "For out-of-town guests" },
  { value: "rehearsal_dinner", label: "Rehearsal dinner", blurb: "The night before" },
  { value: "bridal_shower", label: "Bridal shower", blurb: "" },
  { value: "henna", label: "Henna night", blurb: "Laylat al-henna" },
  { value: "mehndi", label: "Mehndi", blurb: "Henna night with music" },
  { value: "kina", label: "Kına gecesi", blurb: "Turkish henna night" },
  { value: "haldi", label: "Haldi", blurb: "Turmeric blessing" },
  { value: "sangeet", label: "Sangeet", blurb: "Music & dance night" },
  { value: "dholki", label: "Dholki", blurb: "Music & dholak evening" },
  { value: "mayoun", label: "Mayoun", blurb: "Ubtan ceremony" },
  { value: "baraat", label: "Baraat", blurb: "Groom's procession" },
  { value: "zaffa", label: "Zaffa", blurb: "Procession with drums & dancing" },
  { value: "shaadi", label: "Shaadi", blurb: "Wedding celebration & rukhsati" },
  { value: "aroosi", label: "Aroosi", blurb: "Persian wedding reception" },
  { value: "reception", label: "Reception", blurb: "Dinner & dancing" },
  { value: "walima", label: "Walima", blurb: "Feast hosted by the groom's family" },
  { value: "after_party", label: "After-party", blurb: "" },
  { value: "shaash_saar", label: "Shaash saar", blurb: "Somali post-wedding gathering" },
  { value: "family_dinner", label: "Family dinner", blurb: "" },
  { value: "brunch", label: "Farewell brunch", blurb: "" },
  { value: "custom", label: "Custom event", blurb: "" },
];

/**
 * Starting points for onboarding. Every couple can add, remove, or rename events.
 * `islamic` presets turn on the optional Islamic touches (Bismillah, a Quranic verse,
 * Hijri dates, halal & prayer notes) for new weddings; couples can change them later.
 */
export const TRADITIONS: { value: string; label: string; events: EventType[]; islamic?: boolean }[] = [
  { value: "modern", label: "Modern / Western", events: ["rehearsal_dinner", "ceremony", "reception", "brunch"] },
  { value: "south_asian", label: "South Asian Muslim", events: ["mehndi", "nikkah", "shaadi", "walima"], islamic: true },
  { value: "hindu_sikh", label: "Hindu & Sikh", events: ["haldi", "mehndi", "sangeet", "ceremony", "reception"] },
  { value: "arab", label: "Arab", events: ["katb_kitab", "henna", "zaffa", "reception"], islamic: true },
  { value: "persian", label: "Persian", events: ["aqd", "aroosi"] },
  { value: "turkish", label: "Turkish", events: ["engagement", "kina", "nikkah", "reception"], islamic: true },
  { value: "west_african", label: "West African", events: ["engagement", "ceremony", "reception"] },
  { value: "somali", label: "Somali & East African", events: ["nikkah", "reception", "shaash_saar"], islamic: true },
  { value: "chinese", label: "Chinese", events: ["tea_ceremony", "ceremony", "reception"] },
  { value: "jewish", label: "Jewish", events: ["rehearsal_dinner", "ceremony", "reception"] },
  { value: "blended", label: "Blended / interfaith", events: ["welcome_dinner", "ceremony", "civil", "reception"] },
  { value: "custom", label: "Start from scratch", events: ["ceremony", "reception"] },
];

export const eventLabel = (t: EventType) => EVENT_TYPES.find((x) => x.value === t)?.label ?? "Event";

export const VISIBILITY: Record<Visibility, { label: string; help: string }> = {
  public: { label: "Public · open invitation", help: "Shown to everyone who visits your website." },
  invite: { label: "Invitation only", help: "Only invited households can see it. Nobody else will know it exists." },
  private: { label: "Private · family only", help: "For intimate gatherings. Only the family you select can see it." },
};

export const RSVP_MODES: Record<RsvpMode, string> = {
  required: "RSVP required",
  optional: "RSVP optional",
  none: "No RSVP",
};

export const SIDES: Record<Side, string> = { bride: "Bride's side", groom: "Groom's side", both: "Both sides" };

export const TAGS: Record<string, string> = {
  immediate_family: "Immediate family",
  extended_family: "Extended family",
  friends: "Friends",
  community: "Community",
  colleagues: "Colleagues",
  vip: "VIP",
};
