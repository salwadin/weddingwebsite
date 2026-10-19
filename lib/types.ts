// Core domain model. Mirrors supabase/schema.sql one-to-one so the local JSON
// store can be swapped for Postgres without touching pages or access rules.

export type Side = "bride" | "groom" | "both";

export type EventType =
  | "nikkah" | "shaadi" | "walima" | "mehndi" | "dholki" | "mayoun"
  | "baraat" | "bridal_shower" | "family_dinner" | "custom";

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
  passwordHash: string; // scrypt "salt:hash"
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
  sitePassword?: string;
  published: boolean;
  mahr?: { amount: string; notes: string }; // private planning item, never rendered publicly
  totalBudget: number;
  currency: string;
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
  token: string;
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
  channel: "email" | "whatsapp";
  to: string;
  householdId?: string;
  subject: string;
  body: string;
  kind: "invitation" | "reminder" | "save_the_date" | "verification";
  createdAt: string;
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
  template: "arch" | "jali" | "minimal";
  englishText: string;
  urduText: string;
  arabicText: string;
  showQr: boolean;
}

export interface Database {
  users: User[];
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
}
