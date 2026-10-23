// Core domain model. Mirrors supabase/migrations one-to-one; lib/rows.ts maps
// between these shapes and database rows.

export type Side = "bride" | "groom" | "both";

export type EventType =
  // Ceremonies
  | "nikkah" | "aqd" | "katb_kitab" | "civil"
  // Celebrations & receptions
  | "shaadi" | "walima" | "reception" | "aroosi" | "zaffa"
  // Pre-wedding
  | "engagement" | "henna" | "mehndi" | "kina" | "dholki" | "mayoun" | "baraat" | "bridal_shower" | "welcome_dinner"
  // Post-wedding
  | "shaash_saar" | "family_dinner" | "brunch"
  // Other traditions
  | "ceremony" | "rehearsal_dinner" | "sangeet" | "haldi" | "tea_ceremony" | "after_party"
  | "custom";

/** Couple subscription tier. */
export type Plan = "free" | "plus" | "signature";
/** Vendor promotion tier in the marketplace. */
export type ListingTier = "basic" | "featured" | "spotlight";

/**
 * public  — shown to every visitor of the wedding website.
 * invite  — exists only for households holding an invitation to it.
 * private — family-only; same rule as invite, labelled as an intimate gathering.
 */
export type Visibility = "public" | "invite" | "private";

/** RSVP rules are independent from visibility. */
export type RsvpMode = "required" | "optional" | "none";

export type RsvpStatus = "pending" | "attending" | "declined";

export type Role =
  | "admin" | "bride_organizer" | "groom_organizer" | "event_organizer"
  | "guest_manager" | "budget_manager" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  kind?: "couple" | "vendor";
  createdAt: string;
}

export interface Collaborator {
  id: string;
  weddingId: string;
  userId: string;
  role: Role;
  relationship: string; // "Bride's mother"
  eventIds?: string[]; // for event_organizer
  invitedAt: string;
}

export interface ThemeSettings {
  id: "noor" | "gulab" | "zaitoon" | "mehtab";
  heading: "cormorant" | "playfair" | "marcellus";
  accent?: string; // optional hex override
  pattern: "jali" | "arch" | "none";
}

export interface CultureSettings {
  showBismillah: boolean;
  verse: { enabled: boolean; arabic: string; translation: string; reference: string };
  islamicDates: boolean;
  urduNames: { partner1: string; partner2: string };
  halalNote: string;
  modestyNote: string;
  prayerNote: string;
}

export interface FaqItem { q: string; a: string }
export interface Hotel { name: string; note: string; url?: string }

export interface Wedding {
  id: string;
  slug: string;
  partner1: string; // bride
  partner2: string; // groom
  partner1Family: string;
  partner2Family: string;
  tagline: string;
  heroImage: string;
  story: { title: string; body: string; image?: string }[];
  gallery: string[];
  faqs: FaqItem[];
  travel: { intro: string; airport: string; hotels: Hotel[] };
  registry: { message: string; links: { label: string; url: string }[] };
  theme: ThemeSettings;
  culture: CultureSettings;
  passwordProtected: boolean;
  sitePassword?: string; // write-only: set to change the password; stored as a bcrypt hash, never read back
  published: boolean;
  mahr?: { amount: string; notes: string }; // private planning item, never rendered publicly
  totalBudget: number;
  currency: string;
  plan: Plan;
  trialEndsAt?: string; // full access until this date, then `plan` applies
  tradition?: string; // preset chosen at onboarding, e.g. "south_asian"
  customDomain?: string;
  createdAt: string;
}

export interface TimelineItem { time: string; label: string }

export interface WeddingEvent {
  id: string;
  weddingId: string;
  type: EventType;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  venueName: string;
  address: string;
  dressCode: string;
  description: string;
  publicMessage: string;
  hostSide: Side;
  /** Hidden from the other side's organizers (with all its costs): a Mehndi, a girls-only night… Only for one-side events. */
  sidePrivate: boolean;
  visibility: Visibility;
  rsvpMode: RsvpMode;
  rsvpDeadline?: string;
  capacity?: number; // public events: cap on registrations
  waitlist: boolean;
  mealOptions: string[];
  timeline: TimelineItem[];
  genderSeparated: boolean;
  womenOnly: boolean;
  noPhotography: boolean;
  prayerSpace: boolean;
  halal: boolean;
  budget: number;
  sortOrder: number;
  palette?: string[]; // suggested guest colors, shown with the dress code
}

export interface Household {
  id: string;
  weddingId: string;
  name: string; // "Mr. and Mrs. Ahmed & Family"
  side: Side;
  relationship: string;
  tags: string[]; // extended_family, friends, community, vip, ...
  email?: string;
  phone?: string;
  notes?: string;
  deliveryStatus: "not_sent" | "sent" | "opened" | "bounced";
  createdAt: string;
}

export interface Guest {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  isChild: boolean;
  isPrimary: boolean;
  isPlusOne: boolean;
  email?: string;
  phone?: string;
  dietary?: string;
  table?: string;
}

/** A household's invitation to one event, naming exactly which members are invited. */
export interface Invitation {
  id: string;
  householdId: string;
  eventId: string;
  guestIds: string[];
  createdAt: string;
}

export interface Rsvp {
  id: string;
  eventId: string;
  guestId: string;
  householdId: string;
  status: RsvpStatus;
  meal?: string;
  updatedAt: string;
  updatedVia: "guest_link" | "organizer";
}

export interface InviteToken {
  id: string;
  token: string; // derived from id on the server (lib/tokens.ts); only its sha256 is stored
  householdId: string;
  weddingId: string;
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  useCount: number;
}

/** Optional head-count registration for open-invitation events. */
export interface PublicRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  adults: number;
  children: number;
  status: "confirmed" | "waitlist" | "cancelled";
  duplicateOf?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  weddingId: string;
  category: string;
  name: string;
  contact: string;
  phone?: string;
  email?: string;
  eventIds: string[];
  status: "researching" | "contacted" | "booked" | "paid";
  notes?: string;
  listingId?: string; // saved from the marketplace
}

export interface Expense {
  id: string;
  weddingId: string;
  eventId?: string;
  vendorId?: string;
  category: string;
  description: string;
  estimated: number;
  actual: number;
  paid: number;
  responsibility: Side;
  dueDate?: string;
}

export interface Task {
  id: string;
  weddingId: string;
  eventId?: string;
  title: string;
  assignee: string;
  dueDate?: string;
  done: boolean;
  side: Side;
}

export interface OutboxMessage {
  id: string;
  weddingId: string;
  channel: "email" | "whatsapp" | "sms";
  to: string;
  householdId?: string;
  subject: string;
  body: string;
  kind: "invitation" | "reminder" | "save_the_date" | "verification" | "collaborator_invite" | "inquiry";
  /** Reminders: the event they're about. */
  eventId?: string;
  createdAt: string;
  /** Set by delivery (lib/email/deliver.ts), never by the app's writes. */
  status?: "pending" | "sending" | "sent" | "delivered" | "failed" | "bounced" | "complained" | "skipped";
  sentAt?: string;
  error?: string;
}

export interface AuditEntry {
  id: string;
  weddingId: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface InvitationDesign {
  id: string;
  weddingId: string;
  eventId: string;
  template: "arch" | "jali" | "minimal" | "custom"; // custom: the couple's uploaded artwork (imagePath)
  englishText: string;
  urduText: string;
  arabicText: string;
  showQr: boolean;
  /** Uploaded artwork in the private invitation-art bucket (lib/invitation-art.ts). */
  imagePath?: string;
}

// ---------------- Outfits ----------------
export type OutfitStatus = "idea" | "sourcing" | "ordered" | "alterations" | "ready" | "worn";

export interface Outfit {
  id: string;
  weddingId: string;
  eventId?: string;
  wearer: string; // "Ayesha", "Omar's mother", "Bridesmaids"
  role: "bride" | "groom" | "family" | "party" | "other";
  side: Side;
  title: string; // "Red bridal lehenga"
  designer: string;
  vendorId?: string;
  status: OutfitStatus;
  colors: string[];
  image?: string;
  cost: number;
  paid: number;
  dueDate?: string;
  pieces: { id: string; name: string; done: boolean }[]; // dupatta, jewelry, shoes…
  fittings: { id: string; date: string; note: string; done: boolean }[];
  notes?: string;
}

// ---------------- Design studio ----------------
export type BoardItemType = "image" | "note" | "swatch" | "text" | "table_round" | "table_rect" | "zone" | "stage";

export interface BoardItem {
  id: string;
  type: BoardItemType;
  x: number; y: number; w: number; h: number;
  text?: string;
  color?: string;
  src?: string;
  seats?: number;
}

export interface Board {
  id: string;
  weddingId: string;
  name: string;
  kind: "moodboard" | "floorplan";
  eventId?: string;
  items: BoardItem[];
  updatedAt: string;
}

// ---------------- Marketplace ----------------
export interface Listing {
  id: string;
  ownerUserId?: string;
  name: string;
  category: string;
  city: string;
  serves: string[]; // regions / "Travels nationwide"
  tagline: string;
  description: string;
  images: string[];
  priceRange: 1 | 2 | 3 | 4;
  tags: string[]; // halal_certified, female_team, modest_fashion, multilingual…
  traditions: string[]; // south_asian, arab, persian, turkish, west_african, somali
  email: string;
  phone?: string;
  website?: string;
  tier: ListingTier;
  rating: number;
  reviewCount: number;
  published: boolean;
  views: number;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  listingId: string;
  weddingId?: string;
  fromName: string;
  fromEmail: string;
  eventDate?: string;
  guests?: number;
  message: string;
  status: "new" | "replied" | "booked" | "closed";
  createdAt: string;
}

/** Someone invited by email who hasn't created an account yet. */
export interface PendingInvite {
  id: string;
  weddingId: string;
  email: string;
  name?: string;
  role: Role;
  relationship: string;
  createdAt: string;
}

/**
 * One organizer's view of their wedding, loaded per request through their own
 * Supabase session (lib/db.ts), so it only ever holds rows RLS lets them read.
 */
export interface Database {
  users: User[]; // profiles of the wedding's collaborators
  invites: PendingInvite[];
  weddings: Wedding[];
  collaborators: Collaborator[];
  events: WeddingEvent[];
  households: Household[];
  guests: Guest[];
  invitations: Invitation[];
  rsvps: Rsvp[];
  tokens: InviteToken[];
  registrations: PublicRegistration[];
  vendors: Vendor[];
  expenses: Expense[];
  tasks: Task[];
  outbox: OutboxMessage[];
  audit: AuditEntry[];
  designs: InvitationDesign[];
  outfits: Outfit[];
  boards: Board[];
  listings: Listing[];
  inquiries: Inquiry[];
}
