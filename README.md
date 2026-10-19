# Qubool: planning for Muslim & multicultural weddings

**One wedding. Every celebration. Every guest, their own invitation.**

Qubool plans weddings that span many days and many layers: a Nikah, henna night, reception and Walima; or a katb al-kitab, zaffa and reception; or an aghd and aroosi. Every event has its own guest list, visibility, and RSVP rules. The same website automatically shows each family only the events they're invited to. Uninvited events never appear: there are no locked cards and no "you're not invited" messages, and their data never reaches the browser.

Around that core, Qubool includes:

- **Outfit manager:** every look for every event (couple, parents, bridal party), with designers, pieces, fittings, deadlines, payments, and a color palette shared with guests.
- **Design studio:** moodboards and drag-and-drop floor plans (stages, prayer rooms, separate sections, tables), with seat counts checked against RSVPs.
- **Vendor marketplace:** a public directory filtered by tradition and needs (halal certified, female team, alcohol-free, separate sections), free inquiries for couples, and a vendor portal with paid promotion tiers.
- **Plans:** Essentials (free), Plus, and Signature for couples, with a 14-day trial. Vendors get Basic (free), Featured, and Spotlight.

---

## Run it locally

Requirements: Node.js 20+ (built and tested on Node 26).

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first run, the sample wedding for **Ayesha & Omar** is generated into `data/db.json`.

To start over with fresh sample data, stop the server, then run:

```bash
npm run seed
```

You can also use **Dashboard → Settings → Reset demo data**.

### Test modes

On the landing page, choose an identity under **Live demo**, or use the floating **Demo** switcher at the bottom of any page:

| Mode | Who | Sees on the website |
|---|---|---|
| Public visitor | No invitation | Nikkah only (open invitation), with optional head-count RSVP |
| Nikkah-only guest | Mr. Imran Qureshi & Family | Nikkah; household RSVP for 3 people |
| Nikkah + Shaadi guest | Dr. Sana Malik & Mr. Faisal Malik | Nikkah, Shaadi (with meal choice) |
| All-events guest | Mr. and Mrs. Tariq Siddiqui & Family | Mehndi (family only), Nikkah, Shaadi, Walima |
| Wedding administrator | Ayesha (bride) | Full dashboard |
| Vendor | Noor Light Studios | Vendor portal: listing, inquiries, promotion tier |

Guest modes use the real invitation-link flow (`/i/<token>`). The demo button looks up that household's current token and redirects through it.

Organizer accounts (password `qubool-demo`) show how permissions work:

| Email | Role | What they can do |
|---|---|---|
| ayesha@example.com | Full administrator | Everything |
| nasreen@example.com | Bride-side organizer | Only bride-side and shared households; no settings |
| khalid@example.com | Groom-side organizer | Only groom-side and shared households |
| zara@example.com | Event organizer (Mehndi) | Only the Mehndi and its guests |
| hamza@example.com | Budget manager | Budget and vendors only |
| planner@example.com | Read-only | Views everything, edits nothing |
| vendor@example.com | Vendor | The Noor Light Studios portal |

### Things to try

1. As the **public visitor**, open `/w/ayesha-and-omar/events/evt_shaadi`. You get the same 404 as a made-up id.
2. As the **Nikkah + Shaadi guest**, RSVP: one attending with a meal, one declining. Then, as admin, find the response under **RSVPs → Shaadi** and in the household's history.
3. As admin, open **Guest List → Dr. Sana Malik → Issue new link**. The old link immediately falls back to the public view.
4. As admin, open **Guest List**, filter by *Shaadi, not Walima* or *Walima: pending*, select households, and bulk-invite them to an event.
5. Open **Invitations → Shaadi**, switch the preview to a specific family (it shows a personalized name and QR code), and click **Download PNG**.
6. Sign up as a new couple and go through onboarding. Pick a tradition (South Asian, Arab, Persian, Turkish, West African, Somali, blended) to preselect events.
7. Open **Outfits**, switch between *By event* and *By person*, tick off pieces, and move a look to the next status.
8. Open **Design Studio → Crescent Ballroom floor plan**, drag tables around, and watch the seat count against expected guests. Changes save automatically.
9. Browse **/marketplace**, filter by *Arab* and *Female team available*, and send an inquiry. Then switch to the **Vendor** demo mode to see it arrive.
10. As admin, open **Plan & Billing** and switch to Essentials to see which features lock, then switch back.

---

## Deploy a demo to Vercel

GitHub Pages can't run this app because it needs a server. Vercel can, and it's free for personal projects.

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, and choose **Add New → Project**.
2. Import `salwadin/weddingwebsite`, and leave the framework preset as **Next.js**.
3. Under **Environment Variables**, add `SESSION_SECRET` with a long random value. It signs organizer sessions and determines the sample invitation links.
4. Click **Deploy**. Every push to `main` redeploys automatically.

**Demo limitation:** on Vercel the data file lives in temporary storage (`/tmp`). RSVPs and edits last while the server is warm, then the sample wedding is rebuilt. If Vercel runs several copies at once, each copy keeps its own changes. That's fine for showing the app. For a real wedding, connect Supabase first (see [Moving to Supabase](#moving-to-supabase)).

## The sample wedding

| Event | Visibility | RSVP | Guests |
|---|---|---|---|
| Mehndi Night | Private, family only | Required | 42 close family (bride's side) |
| Nikkah, Masjid Al-Noor | **Public, open invitation** | Optional; capacity 600 with waitlist | 477 from invited households + public registrations |
| Shaadi, The Crescent Ballroom | Invitation only | Required, with meal choice | **300** |
| Walima, Magnolia Estate | Invitation only | Required, with meal choice | **250**, a different list from the Shaadi |

That's 163 households (477 people) with realistic RSVPs, a seating sample, 12 vendors, 16 expenses split by family, 21 tasks, 7 collaborators, and a public registration that is a deliberate duplicate.

---

## Plans and monetization

| | Essentials | Plus | Signature |
|---|---|---|---|
| Price | Free | $149 once per wedding | $349 once per wedding |
| Events / guests | 2 / 150 | 8 / 1,000 | Unlimited |
| Website, private events, RSVPs, checklist, budget | ✓ | ✓ | ✓ |
| Browse & message vendors | ✓ | ✓ | ✓ |
| Invitation designer, collaborators, CSV import, outfits | | ✓ | ✓ |
| Design studio, custom domain, no Qubool branding | | | ✓ |

New weddings get every Signature feature for 14 days. Limits only block *adding* events or guests, so nothing is ever removed. Features are checked on the server (`lib/plans.ts` → `assertFeature`) as well as in the UI.

Vendors list for free. **Featured** ($49/mo) and **Spotlight** ($149/mo) rank higher in search, add a badge, and appear as "Recommended" inside couples' dashboards (labelled as sponsored).

Plan and tier changes are **simulated** in this demo: nothing is charged. A live version would use Stripe Checkout and set the plan from the payment webhook.

## Project structure

```
app/
  page.tsx                     Landing page + demo launcher
  demo/[mode]/route.ts         One-click test identities (disable with QUBOOL_DEMO=off)
  i/[token]/route.ts           Personal invitation link → httpOnly cookie → clean redirect
  w/[slug]/                    The wedding website (server-rendered, per-visitor)
    layout.tsx                 Theme, nav (only non-empty sections), password gate
    page.tsx                   Home: hero, countdown, verse, the visitor's events
    events/, events/[eventId]/ Event details, maps, timeline, cultural notes
    rsvp/                      Household RSVP / public registration / "find my invitation"
    story/, travel/, gallery/, faq/
  login/, signup/, onboarding/ Auth + 8-step setup wizard
  marketplace/, marketplace/[id]/   Public vendor directory and profiles
  for-vendors/                 Vendor sign-up and promotion tiers
  vendor/                      Vendor portal (listing, inquiries, promotion)
  pricing/                     Couple plans
  dashboard/                   Organizer app
    page.tsx                   Per-event stats, discrepancies, budget, tasks, activity
    website/  events/  guests/  invitations/  rsvps/  outfits/  studio/  checklist/  budget/  vendors/  settings/  billing/
components/
  ui.tsx                       shadcn-style primitives (Button, Card, Field, Badge…)
  site/                        Wedding-website components (RSVP forms, event cards)
  dash/                        Dashboard components (guest table, invitation designer, outfit cards, studio canvas)
  market/                      Marketplace components
lib/
  types.ts                     Domain model (mirrors supabase/schema.sql)
  access.ts                    ★ Guest visibility rule + organizer permission matrix
  site.ts                      Builds the per-visitor website payload (sanitized DTOs)
  auth.ts                      Organizer sessions (HMAC-signed), guest tokens, site password
  dashboard.ts                 requireOrg() gate, plan checks, RSVP stats, discrepancy checks
  plans.ts                     Couple plans, vendor tiers, feature gates, trial logic
  marketplace.ts               Vendor categories, tags, traditions
  studio-templates.ts          Floor plan & moodboard templates
  actions/                     Server actions (site, dashboard, auth, onboarding)
  db.ts                        Local JSON persistence (server-only)
  seed.ts, seed-extras.ts      Deterministic sample wedding, outfits, boards, vendors
supabase/schema.sql            Production Postgres schema + Row Level Security + guest RPCs
```

## How privacy is enforced

The rule lives in one function, `visibleEvents()` in `lib/access.ts`:

> A visitor sees an event only if it is **public**, or their household holds an **invitation** to it.

- **Server-side only.** Website pages are React Server Components. `getSite()` calls `visibleEvents()` and passes only sanitized DTOs to client components. Hidden events are never serialized into HTML, the RSC payload, `<head>` metadata, or the date range in the hero (computed from visible events only). All data modules import `server-only`.
- **No existence oracle.** `/w/<slug>/events/<id>` returns an identical 404 for "doesn't exist" and "not invited".
- **Revocable tokens.** `/i/<token>` (24 random bytes) is validated on every request against a non-revoked token row, so revoking takes effect immediately. The token moves into an httpOnly cookie and the URL is cleaned. Issuing a new link revokes the old one. Use counts and last-used times are tracked.
- **Visibility and RSVP are separate checks.** `rsvpEligibility()` decides whether someone may respond. Server actions re-derive the household from the cookie and accept answers only for (event, guest) pairs in that household's invitation, before the deadline, with a meal from the allowed list.
- **Sharing a public link grants nothing else.** Public event links carry no token.
- **Organizer scoping.** `requireOrg(area, level)` guards every dashboard page and action, using a role matrix plus side and event scope. Out-of-scope households 404. Mahr is admin-only and never rendered publicly.
- **Auditing.** RSVPs, organizer overrides, invitation changes, and link revocations all go to the audit log.
- **Guest-PII protection.** "Find my invitation" always gives the same reply and sends the link only to the contact on file (no enumeration).

## Database design

The same model is used locally (`lib/types.ts`) and in Postgres (`supabase/schema.sql`):

```
users ─┬─< wedding_collaborators >── weddings ──< events ──< invitation_designs
       │        (role, event_ids)        │           │
       │                                 │           ├──< event_invitations >── households ──< guests
       │                                 │           │       (guest_ids[])           │
       │                                 │           ├──< rsvp_responses (per guest per event)
       │                                 │           └──< public_registrations (open events)
       │                                 ├──< invitation_tokens (sha256, revoked_at) ─┘
       │                                 ├──< vendors, expenses (responsibility: bride|groom|both), budgets, tasks
       │                                 ├── wedding_private (mahr: admin-only RLS)
       │                                 └──< outbox, audit_log
```

Key choices:
- **Households are the unit of invitation.** `event_invitations.guest_ids` names exactly which members are invited to each event, so a family can be invited to the Nikkah with children and to the Shaadi without them.
- **RSVPs are per guest per event.** One family representative answers for everyone.
- **Open-invitation head-counts** (`public_registrations`) are separate from invited guests. They have cap/waitlist and duplicate detection by email/phone.

## Moving to Supabase

The app was designed so you can swap the storage layer:

1. Create a Supabase project and run `supabase/schema.sql`.
2. Replace `lib/db.ts` with Supabase queries. Organizer pages use the user's session client, so RLS applies.
3. Wedding-website pages call the `guest_site(slug, token)` RPC, and RSVPs call `guest_submit_rsvp(token, responses)`. The `anon` role has **no** table access. Guests can only reach data through these SECURITY DEFINER functions, which apply the same visibility rule inside Postgres.
4. Replace `lib/auth.ts` organizer sessions with Supabase Auth, and store invitation tokens as `sha256` hashes, as in the schema.
5. Connect the outbox to an email provider (for example Resend) and the WhatsApp Business API.

## Phases

- **Phase 1 (MVP) is done:** auth, wedding creation, multi-event management, visibility and access controls, website builder with 4 themes, household guest management, personal links, per-event RSVPs, dashboard.
- **Phase 2 is mostly done:** invitation designer (EN/UR/AR, QR, PNG, personalized), budget planner, checklist with suggested tasks, vendors, family collaboration with 7 roles, advanced guest filters, CSV import/export.
- **Phase 3 is started:** WhatsApp share links, Islamic dates, seating field, guest analytics on the dashboard. **Next:** real email/WhatsApp delivery, a drag-and-drop seating chart, QR check-in at the door, full Urdu/Arabic UI localization, and image uploads instead of URLs.
