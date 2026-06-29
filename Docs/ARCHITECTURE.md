# Architecture Reference — Kish Auto Detailing Services

> **Source of truth** for all agents and contributors.
> Update this document whenever a schema, route, folder structure, or architectural decision changes.
> Maintained by the `docs-maintainer` agent.

---

## 1. Project Overview

**Kish Auto Detailing Services** is a web-based booking platform for a 2-person auto detailing business.

- Customers browse services, book appointments, chat with an FAQ bot, and manage their booking via a secure reference link — no account required
- Owners log in to manage bookings, update status, manage availability, and maintain the FAQ knowledge base
- Stack: Next.js App Router · TypeScript · Supabase PostgreSQL · Tailwind CSS · shadcn/ui · nodemailer/Gmail SMTP · Vercel

---

## 2. Architecture Decisions

| Decision      | Choice                                                                               | Rationale                                                                               |
| ------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| App style     | Monolith (Next.js App Router)                                                        | Right-sized for 2-owner operation; single deploy                                        |
| Mutations     | Route Handlers (`/api/dashboard/*`) for owner mutations; Server Actions for FAQ CRUD | Booking/availability mutations use Route Handlers; FAQ uses `actions.ts` Server Actions |
| Customer auth | None — `reference_token` in email link                                               | No account friction; UUID is unguessable                                                |
| Owner auth    | Supabase Auth (email/password)                                                       | Managed, secure, integrates with RLS                                                    |
| Chatbot       | Google Gemini 2.5 Flash + live FAQ grounding context                                 | System prompt includes active FAQ entries; `[ESCALATE]` token triggers owner alert      |
| Maps          | Google Maps deep link (`https://maps.google.com/?q=...`)                             | No API key, no cost, no complexity                                                      |
| Email         | nodemailer via Gmail SMTP, fire-and-forget                                           | Non-blocking; delivery logged in `email_notifications` via service role                 |
| Validation    | Zod at every API and Server Action boundary                                          | Single source of truth for input shapes + TS types                                      |
| DB access     | Service layer only (`lib/services/`)                                                 | Keeps routes thin; logic is isolated and testable                                       |

---

## 3. Project Folder Structure

```
kish/
├── app/
│   ├── (public)/                             # No auth required
│   │   ├── page.tsx                          # Homepage — services listing
│   │   ├── book/page.tsx                     # Booking form
│   │   ├── book/confirmation/page.tsx        # Post-booking confirmation
│   │   ├── booking/[token]/page.tsx          # Customer self-service (view/cancel)
│   │   ├── chat/page.tsx                     # AI chatbot
│   │   ├── location/page.tsx                 # Business location page
│   │   └── layout.tsx                        # Shared public layout (navbar, footer)
│   ├── (dashboard)/                          # Owner — Supabase Auth required
│   │   └── dashboard/
│   │       ├── layout.tsx                    # Auth guard + sidebar nav
│   │       ├── page.tsx                      # Bookings overview
│   │       ├── bookings/[id]/page.tsx        # Booking detail + status controls
│   │       ├── schedule/page.tsx             # Availability slot management
│   │       └── faq/
│   │           ├── page.tsx                  # FAQ CRUD
│   │           └── actions.ts                # Server Actions for FAQ mutations
│   ├── api/
│   │   ├── auth/signout/route.ts             # POST — sign out owner session
│   │   ├── availability/route.ts             # GET (date or range) / POST (create slot, auth)
│   │   ├── availability/[id]/route.ts        # PATCH (block/unblock) / DELETE (auth)
│   │   ├── availability/generate/route.ts    # POST — generate slots from templates (auth)
│   │   ├── availability/templates/route.ts   # GET / POST (auth)
│   │   ├── availability/templates/[id]/route.ts  # DELETE (auth)
│   │   ├── bookings/route.ts                 # POST — create booking (rate-limited)
│   │   ├── bookings/[token]/route.ts         # GET / PATCH (cancel by token)
│   │   ├── chat/route.ts                     # POST — chatbot question (rate-limited)
│   │   ├── dashboard/bookings/[id]/route.ts  # PATCH — status + notes (auth)
│   │   └── services/route.ts                 # GET — active services list
│   ├── login/page.tsx                        # Owner login page
│   └── layout.tsx                            # Root layout (fonts, metadata)
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── ui/                                   # shadcn/ui primitives
│   ├── booking/
│   │   ├── BookingForm.tsx
│   │   └── BookingActions.tsx
│   ├── dashboard/
│   │   ├── BookingFilters.tsx
│   │   ├── BookingStatusActions.tsx
│   │   ├── FaqList.tsx
│   │   ├── FaqModal.tsx
│   │   ├── OwnerNotesForm.tsx
│   │   ├── ScheduleCalendar.tsx
│   │   └── WeeklyTemplatePanel.tsx
│   ├── chat/
│   │   └── ChatWidget.tsx
│   └── shared/
│       ├── DashboardSidebar.tsx
│       ├── Footer.tsx
│       ├── Navbar.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── constants/
│   │   ├── booking.ts                        # BOOKING_STATUS, VALID_STATUS_TRANSITIONS, EMAIL_NOTIFICATION_TYPE
│   │   └── chat.ts                           # CONFIDENCE_THRESHOLD, ESCALATION_MESSAGE
│   ├── rate-limit.ts                         # In-process sliding window rate limiter
│   ├── services/                             # All Supabase access lives here
│   │   ├── availability.service.ts
│   │   ├── booking.service.ts
│   │   ├── chat.service.ts
│   │   ├── email.service.ts
│   │   └── faq.service.ts
│   ├── supabase/
│   │   ├── client.ts                         # Browser client (anon key)
│   │   ├── server.ts                         # Server client (cookies, anon key)
│   │   └── admin.ts                          # Service role client — server-only
│   ├── validations/
│   │   ├── availability.ts                   # Zod: createSlotSchema, createTemplateSchema, generateSlotsSchema
│   │   ├── booking.ts                        # Zod: createBookingSchema, updateBookingStatusSchema
│   │   ├── chat.ts                           # Zod: chatQuestionSchema
│   │   └── faq.ts                            # Zod: createFaqSchema, updateFaqSchema
│   └── utils.ts                              # cn() Tailwind class merge utility
├── scripts/
│   ├── seed-slots.mjs                        # One-time slot seed script (Node.js)
│   └── setup-db.sql                          # One-time RLS/permission remediation (paste into Supabase SQL editor)
├── types/index.ts                            # All TypeScript interfaces
├── middleware.ts                             # Supabase session refresh + /dashboard/* guard
├── next.config.ts                            # Security headers (CSP, X-Frame-Options, etc.)
├── supabase/
│   ├── migrations/                           # SQL migration files (run in order)
│   └── seed.sql                              # Seeds active services
├── .github/instructions/                     # Copilot agent instruction files
└── Docs/                                     # Architecture and planning documentation
```

---

## 4. Database Schema

### `services`

| Column             | Type          | Nullable | Default             | Notes                   |
| ------------------ | ------------- | -------- | ------------------- | ----------------------- |
| `id`               | uuid          | NO       | `gen_random_uuid()` | PK                      |
| `name`             | text          | NO       | —                   |                         |
| `description`      | text          | YES      | —                   |                         |
| `duration_minutes` | integer       | NO       | —                   |                         |
| `price`            | numeric(10,2) | NO       | —                   |                         |
| `is_active`        | boolean       | NO       | `true`              | Filter for public reads |
| `created_at`       | timestamptz   | NO       | `now()`             |                         |

**RLS:** Anonymous: read where `is_active = true`. Authenticated (owner): full access.

---

### `availability_slots`

| Column       | Type        | Nullable | Default             | Notes      |
| ------------ | ----------- | -------- | ------------------- | ---------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK         |
| `date`       | date        | NO       | —                   | YYYY-MM-DD |
| `start_time` | time        | NO       | —                   |            |
| `end_time`   | time        | NO       | —                   |            |
| `is_blocked` | boolean     | NO       | `false`             |            |
| `created_at` | timestamptz | NO       | `now()`             |            |

**Constraint:** `UNIQUE(date, start_time)`
**RLS:** Anonymous: read where `is_blocked = false`. Authenticated (owner): full access.

---

### `availability_templates`

| Column                  | Type        | Nullable | Default             | Notes                |
| ----------------------- | ----------- | -------- | ------------------- | -------------------- |
| `id`                    | uuid        | NO       | `gen_random_uuid()` | PK                   |
| `day_of_week`           | integer     | NO       | —                   | 0=Sunday, 6=Saturday |
| `start_time`            | time        | NO       | —                   |                      |
| `end_time`              | time        | NO       | —                   |                      |
| `slot_duration_minutes` | integer     | NO       | —                   |                      |
| `is_active`             | boolean     | NO       | `true`              |                      |
| `created_at`            | timestamptz | NO       | `now()`             |                      |

**RLS:** Authenticated (owner): full access. No anonymous access.

---

### `bookings`

| Column            | Type        | Nullable | Default             | Notes                                     |
| ----------------- | ----------- | -------- | ------------------- | ----------------------------------------- |
| `id`              | uuid        | NO       | `gen_random_uuid()` | PK                                        |
| `reference_token` | text        | NO       | —                   | UNIQUE; `crypto.randomUUID()`             |
| `slot_id`         | uuid        | NO       | —                   | FK → `availability_slots(id)`             |
| `customer_name`   | text        | NO       | —                   |                                           |
| `customer_email`  | text        | NO       | —                   |                                           |
| `customer_phone`  | text        | YES      | —                   |                                           |
| `address_line1`   | text        | NO       | —                   |                                           |
| `address_line2`   | text        | YES      | —                   |                                           |
| `city`            | text        | NO       | —                   |                                           |
| `notes`           | text        | YES      | —                   | Customer-visible notes                    |
| `owner_notes`     | text        | YES      | —                   | **PRIVATE — never return in public APIs** |
| `status`          | text        | NO       | `'pending'`         | See status machine below                  |
| `completed_at`    | timestamptz | YES      | —                   | Set when → `completed`                    |
| `cancelled_at`    | timestamptz | YES      | —                   | Set when → `cancelled`                    |
| `declined_at`     | timestamptz | YES      | —                   | Set when → `declined`                     |
| `created_at`      | timestamptz | NO       | `now()`             |                                           |
| `updated_at`      | timestamptz | NO       | `now()`             |                                           |

**RLS:** Anon key has no direct access to `bookings` — all public reads/writes go through `createAdminClient()` (service role). Authenticated (owner): full access.

---

### `faq_entries`

| Column       | Type        | Nullable | Default             | Notes                 |
| ------------ | ----------- | -------- | ------------------- | --------------------- |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                    |
| `question`   | text        | NO       | —                   |                       |
| `answer`     | text        | NO       | —                   |                       |
| `tags`       | text[]      | YES      | —                   | Optional keyword tags |
| `is_active`  | boolean     | NO       | `true`              |                       |
| `created_at` | timestamptz | NO       | `now()`             |                       |
| `updated_at` | timestamptz | NO       | `now()`             |                       |

**RLS:** Anonymous: read where `is_active = true`. Authenticated (owner): full access.

---

### `chat_sessions`

| Column             | Type         | Nullable | Default             | Notes                       |
| ------------------ | ------------ | -------- | ------------------- | --------------------------- |
| `id`               | uuid         | NO       | `gen_random_uuid()` | PK                          |
| `session_id`       | text         | NO       | —                   | Client-generated; untrusted |
| `question`         | text         | NO       | —                   |                             |
| `answer`           | text         | NO       | —                   |                             |
| `matched_faq_id`   | uuid         | YES      | —                   | FK → `faq_entries(id)`      |
| `confidence_score` | numeric(4,3) | YES      | —                   | 0.000–1.000                 |
| `was_escalated`    | boolean      | NO       | `false`             |                             |
| `created_at`       | timestamptz  | NO       | `now()`             |                             |

**RLS:** Anonymous: INSERT only. Authenticated (owner): SELECT.

---

### `email_notifications`

| Column                | Type        | Nullable | Default             | Notes                         |
| --------------------- | ----------- | -------- | ------------------- | ----------------------------- |
| `id`                  | uuid        | NO       | `gen_random_uuid()` | PK                            |
| `booking_id`          | uuid        | NO       | —                   | FK → `bookings(id)`           |
| `recipient_email`     | text        | NO       | —                   |                               |
| `type`                | text        | NO       | —                   | See `EMAIL_NOTIFICATION_TYPE` |
| `provider_message_id` | text        | YES      | —                   | SMTP message ID; may be null  |
| `status`              | text        | NO       | `'sent'`            | `sent` / `failed` / `bounced` |
| `error_message`       | text        | YES      | —                   |                               |
| `sent_at`             | timestamptz | NO       | `now()`             |                               |

**RLS:** No anonymous access. Authenticated (owner): SELECT. INSERT via service role (admin client).

---

### `add_ons`

Historical compatibility table. Add-ons are no longer offered in the
customer-facing booking flow; migration `20260629000000_service_catalog_and_future_slots.sql`
deactivates existing rows.

| Column        | Type          | Nullable | Default             | Notes                   |
| ------------- | ------------- | -------- | ------------------- | ----------------------- |
| `id`          | uuid          | NO       | `gen_random_uuid()` | PK                      |
| `name`        | text          | NO       | —                   |                         |
| `description` | text          | YES      | —                   |                         |
| `price`       | numeric(10,2) | NO       | —                   |                         |
| `is_active`   | boolean       | NO       | `true`              | Filter for public reads |
| `created_at`  | timestamptz   | NO       | `now()`             |                         |
| `updated_at`  | timestamptz   | NO       | `now()`             |                         |

**RLS:** Anonymous: read where `is_active = true`. Authenticated (owner): full access.

---

### `booking_items`

One row per service package selected in a booking. Price is snapshotted at booking time.

| Column             | Type          | Nullable | Default             | Notes                                        |
| ------------------ | ------------- | -------- | ------------------- | -------------------------------------------- |
| `id`               | uuid          | NO       | `gen_random_uuid()` | PK                                           |
| `booking_id`       | uuid          | NO       | —                   | FK → `bookings(id)` ON DELETE CASCADE        |
| `service_id`       | uuid          | NO       | —                   | FK → `services(id)`                          |
| `price_at_booking` | numeric(10,2) | NO       | —                   | Snapshot of service price at time of booking |

**RLS:** Anonymous: SELECT (service layer filters by booking). Authenticated (owner): full access.

---

### `booking_add_ons`

Historical compatibility table for bookings created before add-ons were removed.
New customer-facing bookings no longer create rows here.

| Column             | Type          | Nullable | Default             | Notes                                       |
| ------------------ | ------------- | -------- | ------------------- | ------------------------------------------- |
| `id`               | uuid          | NO       | `gen_random_uuid()` | PK                                          |
| `booking_id`       | uuid          | NO       | —                   | FK → `bookings(id)` ON DELETE CASCADE       |
| `add_on_id`        | uuid          | NO       | —                   | FK → `add_ons(id)`                          |
| `price_at_booking` | numeric(10,2) | NO       | —                   | Snapshot of add-on price at time of booking |

**RLS:** Anonymous: SELECT (service layer filters by booking). Authenticated (owner): full access.

---

## 5. Booking Status State Machine

```
          ┌─────────┐
          │ pending │
          └────┬────┘
        ┌──────┼──────┐
        ▼      ▼      ▼
  confirmed  declined  cancelled
     │
     ▼
  on_the_way
     │
     ▼
  completed
     │
  (also: cancelled from confirmed)
```

### Valid Transitions (from `lib/constants/booking.ts`)

| Current Status | Allowed Next Statuses                |
| -------------- | ------------------------------------ |
| `pending`      | `confirmed`, `declined`, `cancelled` |
| `confirmed`    | `on_the_way`, `cancelled`            |
| `on_the_way`   | `completed`                          |
| `completed`    | _(terminal)_                         |
| `cancelled`    | _(terminal)_                         |
| `declined`     | _(terminal)_                         |

**Rules:**

- `declined` — only from `pending` (before any work begins)
- `cancelled` — from `pending` or `confirmed` (customer or owner initiated)
- Timestamp fields are set automatically on transition: `completed_at`, `cancelled_at`, `declined_at`

---

## 6. API Contract

### Response Shape Convention

```
Success: { data: T }
Error:   { error: string, details?: ZodError | string }
```

### Public Routes (no auth)

| Method  | Path                                | Body / Params          | Description                                          |
| ------- | ----------------------------------- | ---------------------- | ---------------------------------------------------- |
| `GET`   | `/api/services`                     | —                      | List active services                                 |
| `GET`   | `/api/availability?date=YYYY-MM-DD` | query: `date`          | Available (unblocked) slots for a single date        |
| `POST`  | `/api/bookings`                     | `createBookingSchema`  | Create a new booking — rate-limited 5/hr per IP      |
| `GET`   | `/api/bookings/[token]`             | —                      | Get booking by reference token                       |
| `PATCH` | `/api/bookings/[token]`             | `{ action: "cancel" }` | Cancel booking by token                              |
| `POST`  | `/api/chat`                         | `chatQuestionSchema`   | Submit chatbot question — rate-limited 30/min per IP |

### Owner Routes (Supabase Auth session required)

Booking and availability mutations are handled via **Route Handlers** (`/api/dashboard/*`, `/api/availability/*`). FAQ mutations use **Server Actions** in `app/(dashboard)/dashboard/faq/actions.ts`.

| Method   | Path                                       | Body / Params                                                                      | Description                                 |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET`    | `/api/availability?from=YYYY-MM-DD&to=...` | query: `from`, `to`                                                                | All slots for a date range (owner calendar) |
| `POST`   | `/api/availability`                        | `createSlotSchema`                                                                 | Create a new availability slot              |
| `PATCH`  | `/api/availability/[id]`                   | `{ is_blocked: boolean }`                                                          | Block or unblock a slot                     |
| `DELETE` | `/api/availability/[id]`                   | —                                                                                  | Delete a slot                               |
| `GET`    | `/api/availability/templates`              | —                                                                                  | List weekly availability templates          |
| `POST`   | `/api/availability/templates`              | `createTemplateSchema`                                                             | Create a weekly template                    |
| `DELETE` | `/api/availability/templates/[id]`         | —                                                                                  | Delete a template                           |
| `POST`   | `/api/availability/generate`               | `generateSlotsSchema`                                                              | Generate slots from templates for a range   |
| `PATCH`  | `/api/dashboard/bookings/[id]`             | `{ action: "update_status", status }` or `{ action: "update_notes", owner_notes }` | Update booking status or owner notes        |
| `POST`   | `/api/auth/signout`                        | —                                                                                  | Sign out owner session                      |

---

## 7. Constants Reference

### `lib/constants/booking.ts`

```typescript
BOOKING_STATUS; // { PENDING, CONFIRMED, ON_THE_WAY, COMPLETED, CANCELLED, DECLINED }
BOOKING_STATUS_VALUES; // tuple of all values — used in Zod enums
VALID_STATUS_TRANSITIONS; // Record<BookingStatus, BookingStatus[]>
EMAIL_NOTIFICATION_TYPE; // { BOOKING_CONFIRMATION, BOOKING_CONFIRMED, BOOKING_ON_THE_WAY, BOOKING_COMPLETED, BOOKING_CANCELLED, BOOKING_DECLINED, BOOKING_REMINDER, ADMIN_BOOKING_ALERT }
EMAIL_STATUS; // { SENT, FAILED, BOUNCED }
```

### `lib/constants/chat.ts`

```typescript
CONFIDENCE_THRESHOLD; // 0.5 — minimum score to return an answer
ESCALATION_MESSAGE; // Default fallback message when confidence is too low
```

> **Rule:** All status values used in code, Zod schemas, and DB writes MUST reference these constants. Raw strings like `"pending"` are forbidden outside the constants files themselves.

---

## 8. Environment Variables

| Variable                            | Scope           | Required | Description                                                              |
| ----------------------------------- | --------------- | -------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`          | Client + Server | YES      | Supabase project URL                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Client + Server | YES      | Supabase publishable key                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server only     | YES      | Service role key — never expose to client                                |
| `GEMINI_API_KEY`                    | Server only     | YES      | Google Gemini API key for chatbot (`lib/services/chat.service.ts`)       |
| `SMTP_HOST`                         | Server only     | NO       | SMTP host — defaults to `smtp.gmail.com`                                 |
| `SMTP_PORT`                         | Server only     | NO       | SMTP port — defaults to `587` (STARTTLS)                                 |
| `SMTP_USER`                         | Server only     | YES      | Gmail address used as FROM and auth username                             |
| `SMTP_PASS`                         | Server only     | YES      | Gmail App Password — **not** your regular Gmail password                 |
| `ADMIN_EMAIL`                       | Server only     | YES      | Owner email — receives new booking alert and chatbot escalation          |
| `NEXT_PUBLIC_APP_URL`               | Client + Server | NO       | Deployed app URL; defaults to `http://localhost:3000`                    |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL` | Client          | NO       | Google Maps embed URL for the Location page; leave blank to hide the map |

---

## 9. Auth & Security Model

- `/dashboard/*` protected by `middleware.ts` (redirects to `/login` if no session) AND layout-level `supabase.auth.getUser()` (defence in depth)
- `middleware.ts` uses `getUser()` — never `getSession()` (session is client-unverified)
- `lib/supabase/admin.ts` (service role) — imported only in server files; never in client components
- `owner_notes` — stored on bookings but explicitly excluded from all public SELECT statements; no RLS workaround needed
- `reference_token` — always `crypto.randomUUID()`, never sequential or predictable IDs
- All API inputs parsed with Zod `safeParse()` before any service call
- **RLS hardening** (`20260522000000_security_hardening.sql`): anon RLS policies on `bookings` were dropped — all public booking reads/writes go through `createAdminClient()` (service role), so the anon key can no longer read booking rows directly via the Supabase REST API
- **Security response headers** set in `next.config.ts` for all routes: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a Content Security Policy. Note: CSP includes `unsafe-inline` and `unsafe-eval` — required by Next.js client hydration
- **Rate limiting** (`lib/rate-limit.ts`): in-process sliding window applied to `POST /api/bookings` (5 req / 60 min per IP) and `POST /api/chat` (30 req / 60 sec per IP). Returns `429` with `Retry-After` header when exceeded. **Caveat:** in-process Map is per-lambda — limits are not shared across concurrent Vercel instances; upgrade to `@upstash/ratelimit` before high-traffic production use

---

## 10. Deferred / Phase 2

These are intentionally not built yet. Do not implement until explicitly planned:

| Feature                                          | Reason deferred                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| pgvector RAG for chatbot                         | Gemini + FAQ grounding is sufficient now; add when FAQ grows large            |
| Embedded Google Maps                             | Deep link is sufficient for now                                               |
| SPF/DKIM configuration for Gmail SMTP sender     | Dev sends to own email; configure DNS records before public launch            |
| Booking reschedule (slot swap)                   | Cancellation is Phase 1; reschedule is Phase 2                                |
| Distributed rate limiting (`@upstash/ratelimit`) | In-process limiter is sufficient for single-instance; required before scaling |
