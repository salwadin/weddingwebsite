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

Requirements: Node.js 20+ (built and tested on Node 26), the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and a Docker runtime for it ([Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev) or `brew install colima docker && colima start`).

```bash
npm install
supabase start          # local Postgres, Auth, REST API and a test inbox; applies supabase/migrations
cp .env.example .env.local
```

Fill in `.env.local` from `supabase status`: **API URL** → `NEXT_PUBLIC_SUPABASE_URL`, **anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`. Then load the sample wedding and start the app:

```bash
npm run seed            # Ayesha & Omar's wedding, the demo accounts and the marketplace
npm run dev
```

Open http://localhost:3000. `QUBOOL_DEMO=on` (already in `.env.example`) turns on the demo switcher and the demo accounts on the sign-in page.

- **Emails** (sign-up confirmation, password reset) don't leave your machine: open the local inbox at http://127.0.0.1:54324.
- **Supabase Studio** (tables, auth users, SQL editor) is at http://127.0.0.1:54323.
- **Start over:** `npm run seed` replaces the demo wedding; `npm run db:reset` rebuilds the whole database from the migrations and re-seeds. You can also use **Dashboard → Settings → Reset demo data**.

### Tests

The Playwright suite checks the privacy rules end to end against the local Supabase: what each kind of visitor receives from the server, 404s for guessed event URLs, revoked links, organizer scoping and RLS, plus the main dashboard write paths. It re-seeds the demo wedding before running.

```bash
npx playwright install chromium   # once
npm test                          # starts `npm run dev` if it isn't running
```

`CI=1 npm test` runs against a production build instead (`npm run build` first). The billing tests post signed Stripe webhooks to `/api/stripe/webhook`; they don't need a Stripe account.

### Payments (Stripe test mode)

With `QUBOOL_DEMO=on`, plan and tier changes are instant and free. To try real Checkout locally:

1. In `.env.local`, set `QUBOOL_DEMO=off` (or remove it) and `STRIPE_SECRET_KEY=sk_test_…` from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys).
2. Forward webhooks to the app with the [Stripe CLI](https://docs.stripe.com/stripe-cli) and put the `whsec_…` it prints in `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Restart `npm run dev`. As a couple, **Plan & Billing → Upgrade**; as a vendor, **Promotion → Upgrade**. Pay with card `4242 4242 4242 4242`, any future date and CVC.
4. Cancelling a vendor subscription goes through Stripe's customer portal: enable it once under **Settings → Billing → Customer portal** in test mode.

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

Guest modes use the real invitation-link flow (`/i/<token>`). The demo button looks up that household's current token and redirects through it. Organizer and vendor modes sign in to the seeded Supabase Auth accounts.

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

1. As the **all-events guest**, open the Shaadi from the website and copy its URL. Switch to the **public visitor** and open it: you get the same 404 as a made-up id.
2. As the **Nikkah + Shaadi guest**, RSVP: one attending with a meal, one declining. Then, as admin, find the response under **RSVPs → Shaadi** and in the household's history.
3. As admin, open **Guest List → Dr. Sana Malik → Issue new link**. The old link immediately falls back to the public view.
4. As admin, open **Guest List**, filter by *Shaadi, not Walima* or *Walima: pending*, select households, and bulk-invite them to an event.
5. Open **Invitations → Shaadi**, switch the preview to a specific family (it shows a personalized name and QR code), and click **Download PNG**.
6. Sign up as a new couple (the confirmation email is in the local inbox) and go through onboarding. Pick a tradition (South Asian, Arab, Persian, Turkish, West African, Somali, blended) to preselect events.
7. Open **Outfits**, switch between *By event* and *By person*, tick off pieces, and move a look to the next status.
8. Open **Design Studio → Crescent Ballroom floor plan**, drag tables around, and watch the seat count against expected guests. Changes save automatically.
9. Browse **/marketplace**, filter by *Arab* and *Female team available*, and send an inquiry. Then switch to the **Vendor** demo mode to see it arrive.
10. As admin, open **Plan & Billing** and switch to Essentials to see which features lock, then switch back.

---

## Deploy to Vercel

GitHub Pages can't run this app because it needs a server. Vercel can, and it's free for personal projects. You'll need a hosted Supabase project first (see [Moving to Supabase](#moving-to-supabase)).

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, and choose **Add New → Project**.
2. Import `salwadin/weddingwebsite`, and leave the framework preset as **Next.js**.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL), `INVITE_TOKEN_SECRET` (a long random value), `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (and optionally the `STRIPE_PRICE_*` ids, see `.env.example`). Add `QUBOOL_DEMO=on` only for a demo deployment.
4. In Stripe, **Developers → Webhooks → Add endpoint**: `https://<your-domain>/api/stripe/webhook`, with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`. Its signing secret is `STRIPE_WEBHOOK_SECRET`. Turn on the customer portal (**Settings → Billing → Customer portal**) so vendors can cancel.
5. Click **Deploy**. Every push to `main` redeploys automatically.

## The sample wedding

| Event | Visibility | RSVP | Guests |
|---|---|---|---|
| Mehndi Night | Private, family only | Required | 42 close family (bride's side) |
| Nikkah, Masjid Al-Noor | **Public, open invitation** | Optional; capacity 600 with waitlist | 477 from invited households + public registrations |
| Shaadi, The Crescent Ballroom | Invitation only | Required, with meal choice | **300** |
| Walima, Magnolia Estate | Invitation only | Required, with meal choice | **250**, a different list from the Shaadi |

That's 163 households (477 people) with realistic RSVPs, a seating sample, 12 vendors, 16 expenses split by family, 21 tasks, 7 collaborators, and a public registration that is a deliberate duplicate. `lib/seed.ts` builds it with readable ids (`evt_shaadi`), which `npm run seed` turns into stable uuids, so links and tests survive a re-seed.

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

Payments go through **Stripe Checkout**: plans are a one-time payment per wedding (upgrading from Plus to Signature costs the $200 difference), vendor tiers are monthly subscriptions that vendors switch in place (prorated) and cancel in Stripe's customer portal. Organizers and vendors can't write `plan`, `trial_ends_at` or `tier` themselves (column-level grants): the webhook (`app/api/stripe/webhook`) sets them with the service role once Stripe confirms payment, and returns a listing to Basic when its subscription ends. It records every event id in `stripe_events`, so redeliveries are ignored. The `payments` and `subscriptions` tables are readable by the wedding's administrators and the listing's owner. When a buyer returns from Checkout, the billing page also confirms the session directly, so the new plan shows even if the webhook is a few seconds behind.

When `QUBOOL_DEMO=on`, plan and tier changes are **simulated** instead: instant, and nothing is charged.

## Project structure

```
app/
  page.tsx                     Landing page + demo launcher
  demo/[mode]/route.ts         One-click test identities (only with QUBOOL_DEMO=on)
  i/[token]/route.ts           Personal invitation link → httpOnly cookie → clean redirect
  auth/confirm/route.ts        Landing page for sign-up confirmation and password-reset emails
  w/[slug]/                    The wedding website (server-rendered, per-visitor)
    layout.tsx                 Theme, nav (only non-empty sections), password gate
    page.tsx                   Home: hero, countdown, verse, the visitor's events
    events/, events/[eventId]/ Event details, maps, timeline, cultural notes
    rsvp/                      Household RSVP / public registration / "find my invitation"
    story/, travel/, gallery/, faq/
  login/, signup/, onboarding/ Auth + 8-step setup wizard
  forgot-password/, reset-password/
  marketplace/, marketplace/[id]/   Public vendor directory and profiles
  for-vendors/                 Vendor sign-up and promotion tiers
  vendor/                      Vendor portal (listing, inquiries, promotion)
  pricing/                     Couple plans
  api/stripe/webhook/          Stripe webhook: sets plans and vendor tiers
  dashboard/                   Organizer app
    page.tsx                   Per-event stats, discrepancies, budget, tasks, activity
    website/  events/  guests/  invitations/  rsvps/  outfits/  studio/  checklist/  budget/  vendors/  settings/  billing/
components/
  ui.tsx                       shadcn-style primitives (Button, Card, Field, Badge…)
  site/                        Wedding-website components (RSVP forms, event cards)
  dash/                        Dashboard components (guest table, invitation designer, outfit cards, studio canvas)
  market/                      Marketplace components
lib/
  types.ts                     Domain model (mirrors supabase/migrations)
  access.ts                    ★ Organizer permission matrix (the guest rule lives in guest_site())
  site.ts                      The per-visitor website payload, from the guest_site() RPC
  auth.ts                      Supabase Auth user + organizer context, guest token cookie, site password cookie
  db.ts                        Loads an organizer's wedding through their own Supabase session; writes changes back
  rows.ts                      Domain type ↔ database row mapping
  tokens.ts                    Invitation links: derived from the token id with a secret, stored as sha256
  supabase/                    Server, anon and service-role clients; env settings
  dashboard.ts                 requireOrg() gate, plan checks, RSVP stats, discrepancy checks
  plans.ts                     Couple plans, vendor tiers, feature gates, trial logic
  stripe.ts                    Stripe client, Checkout line items, price ids
  payments.ts                  Applies Checkout and subscription results (webhook + return page)
  marketplace.ts               Vendor categories, tags, traditions
  studio-templates.ts          Floor plan & moodboard templates
  actions/                     Server actions (site, dashboard, auth, onboarding)
  seed.ts, seed-extras.ts      Deterministic sample wedding, outfits, boards, vendors
  seed-load.ts                 Loads the sample into Supabase (npm run seed, demo reset, tests)
proxy.ts                       Refreshes the Supabase Auth session cookie before rendering
supabase/
  migrations/                  Schema, Row Level Security, guest + organizer RPCs (applied by supabase start / db reset)
  templates/                   Auth email templates (confirmation, password reset)
  config.toml                  Local Supabase settings (email confirmation on, 8-character passwords)
scripts/seed.mts               npm run seed
tests/                         Playwright: privacy rules, dashboard write paths, Stripe webhook
```

## How privacy is enforced

The rule lives in the database, in the `guest_site()` function (`supabase/migrations/…_app.sql`):

> A visitor sees an event only if it is **public**, or their household holds an **invitation** to it.

- **Guests have no table access.** The `anon` role can't read or write any table (`permission denied`). The wedding website reaches data only through SECURITY DEFINER functions: `guest_site(slug, token, site_key)` returns the visible events and the household's own members, invitations and RSVPs; `guest_submit_rsvp`, `public_register`, `resolve_invitation` and `site_unlock` do the rest. Each one applies the rule itself, so even someone calling the API directly with the public anon key gets nothing more than the website shows.
- **Server-side only.** Website pages are React Server Components. `getSite()` calls `guest_site()` and passes its sanitized result to client components. Hidden events are never serialized into HTML, the RSC payload, `<head>` metadata, or the date range in the hero (computed from visible events only). All data modules import `server-only`.
- **No existence oracle.** `/w/<slug>/events/<id>` returns an identical 404 for "doesn't exist" and "not invited".
- **Revocable tokens, stored as hashes.** The database keeps only `sha256(token)`. The token itself is derived from the token row's id with `INVITE_TOKEN_SECRET` (`lib/tokens.ts`), so organizers can still copy or re-send a family's link, but a leaked database opens nothing. Every request re-checks that the token isn't revoked, so revoking takes effect immediately and the visitor falls back to the public view. The token moves into an httpOnly cookie and the URL is cleaned. Use counts and last-used times are tracked.
- **Visibility and RSVP are separate checks.** `guest_submit_rsvp()` takes the household from the token, never the form, and accepts answers only for (event, guest) pairs in that household's invitation, before the deadline, with a meal from the allowed list.
- **Site passwords** are stored as bcrypt hashes. Entering the right one gives the browser a key derived from that hash (`site_unlock()`), which `guest_site()` checks. Changing the password invalidates old keys.
- **Organizers go through Row Level Security.** Each dashboard request loads the wedding with the signed-in organizer's own Supabase session (`lib/db.ts`), so Postgres decides which rows arrive: a bride-side organizer never receives groom-side households, an event organizer only their events and those guests, and only administrators can read the Mahr (`wedding_private`). Writes go back through the same session and are checked by the same policies. On top of that, `requireOrg(area, level)` applies the role matrix in `lib/access.ts` to every page and action, and out-of-scope households 404.
- **Server-only privileges are narrow.** The service-role key is used only for the seed, the demo switcher, demo billing, and "find my invitation" (matching a contact means reading households, and nothing it reads is returned).
- **Auditing.** RSVPs, organizer overrides, invitation changes, and link revocations all go to the append-only audit log.
- **Guest-PII protection.** "Find my invitation" always gives the same reply and sends the link only to the contact on file (no enumeration).

## Database design

The same model is used in TypeScript (`lib/types.ts`) and in Postgres (`supabase/migrations/`):

```
auth.users ── profiles
   │
   ├─< wedding_collaborators >── weddings ──< events ──< invitation_designs
   │        (role, event_ids)        │           │
   │                                 │           ├──< event_invitations >── households ──< guests
   │                                 │           │       (guest_ids[])           │
   │                                 │           ├──< rsvp_responses (per guest per event)
   │                                 │           └──< public_registrations (open events)
   │                                 ├──< invitation_tokens (sha256, revoked_at) ─┘
   │                                 ├──< vendors, expenses (responsibility: bride|groom|both), budgets, tasks
   │                                 ├── wedding_private (mahr: admin-only RLS)
   │                                 ├──< outfits, boards, collaborator_invites
   │                                 └──< outbox, audit_log
   └─< listings ──< inquiries (vendor marketplace)
```

Key choices:
- **Households are the unit of invitation.** `event_invitations.guest_ids` names exactly which members are invited to each event, so a family can be invited to the Nikkah with children and to the Shaadi without them.
- **RSVPs are per guest per event.** One family representative answers for everyone.
- **Open-invitation head-counts** (`public_registrations`) are separate from invited guests. They have cap/waitlist and duplicate detection by email/phone.

## Moving to Supabase

Qubool runs on Supabase: Postgres with Row Level Security for data, Supabase Auth for organizer and vendor accounts (email + password, verified email, password reset). Locally that's `supabase start` (see [Run it locally](#run-it-locally)). To go live on a hosted project:

1. Create a project at [supabase.com](https://supabase.com), then link and push the schema:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
2. In **Authentication → URL Configuration**, set the Site URL to your domain and add `https://<your-domain>/**` to the redirect URLs.
3. In **Authentication → Emails**, paste the templates from `supabase/templates/` (they link to `/auth/confirm`), keep **Confirm email** on, and set up custom SMTP (for example Resend) so emails come from your domain.
4. Set the environment variables listed in [Deploy to Vercel](#deploy-to-vercel), including the live Stripe keys and the webhook endpoint described there. Generate a fresh `INVITE_TOKEN_SECRET`; keep it stable, because it derives every invitation link.
5. Leave `QUBOOL_DEMO` unset in production, and only run `npm run seed` against a demo project.

Still to do before a public launch: real email/WhatsApp delivery from the outbox (Resend), rate limiting on the guest RPCs at the edge, and more targeted queries in `lib/db.ts` (each dashboard page currently loads the whole wedding the organizer may see, which is fine at a few thousand guests).

## Phases

- **Phase 1 (MVP) is done:** auth, wedding creation, multi-event management, visibility and access controls, website builder with 4 themes, household guest management, personal links, per-event RSVPs, dashboard.
- **Phase 2 is mostly done:** invitation designer (EN/UR/AR, QR, PNG, personalized), budget planner, checklist with suggested tasks, vendors, family collaboration with 7 roles, advanced guest filters, CSV import/export.
- **Phase 3 is started:** WhatsApp share links, Islamic dates, seating field, guest analytics on the dashboard. **Next:** real email/WhatsApp delivery, a drag-and-drop seating chart, QR check-in at the door, full Urdu/Arabic UI localization, and image uploads instead of URLs.
