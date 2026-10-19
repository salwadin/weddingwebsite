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
  { value: "nikkah", label: "Nikkah", blurb: "The Islamic marriage ceremony" },
  { value: "shaadi", label: "Shaadi", blurb: "Wedding celebration & rukhsati" },
  { value: "walima", label: "Walima", blurb: "Reception hosted by the groom's family" },
  { value: "mehndi", label: "Mehndi", blurb: "Henna night" },
  { value: "dholki", label: "Dholki", blurb: "Music & dholak evening" },
  { value: "mayoun", label: "Mayoun", blurb: "Haldi / ubtan ceremony" },
  { value: "baraat", label: "Baraat", blurb: "Groom's procession" },
  { value: "bridal_shower", label: "Bridal shower", blurb: "" },
  { value: "family_dinner", label: "Family dinner", blurb: "" },
  { value: "custom", label: "Custom event", blurb: "" },
];

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
