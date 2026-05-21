# Architecture Reference — Kish Auto Detailing Services

> **Source of truth** for all agents and contributors.
> Update this document whenever a schema, route, folder structure, or architectural decision changes.
> Maintained by the `docs-maintainer` agent.

---

## 1. Project Overview

**Kish Auto Detailing Services** is a web-based booking platform for a 2-person auto detailing business.

- Customers browse services, book appointments, chat with an FAQ bot, and manage their booking via a secure reference link — no account required
- Owners log in to manage bookings, update status, manage availability, and maintain the FAQ knowledge base
- Stack: Next.js App Router · TypeScript · Supabase PostgreSQL · Tailwind CSS · shadcn/ui · Resend · Vercel

---

## 2. Architecture Decisions

| Decision      | Choice                                                         | Rationale                                                                    |
| ------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| App style     | Monolith (Next.js App Router)                                  | Right-sized for 2-owner operation; single deploy                             |
| Mutations     | Server Actions (forms) + Route Handlers (public URLs, chatbot) | Server Actions for simplicity; Route Handlers for shareable/public endpoints |
| Customer auth | None — `reference_token` in email link                         | No account friction; UUID is unguessable                                     |
| Owner auth    | Supabase Auth (email/password)                                 | Managed, secure, integrates with RLS                                         |
| Chatbot       | FAQ text-search → keyword scoring → optional LLM formatting    | Phase 1: simple and cheap. Phase 2: pgvector RAG                             |
| Maps          | Google Maps deep link (`https://maps.google.com/?q=...`)       | No API key, no cost, no complexity                                           |
| Email         | Resend SDK called server-side, fire-and-forget                 | Non-blocking; delivery logged in `email_notifications`                       |
| Validation    | Zod at every API and Server Action boundary                    | Single source of truth for input shapes + TS types                           |
| DB access     | Service layer only (`lib/services/`)                           | Keeps routes thin; logic is isolated and testable                            |

---

## 3. Project Folder Structure

```
kish/
├── app/
│   ├── (public)/                        # No auth required
│   │   ├── page.tsx                     # Homepage — services listing
│   │   ├── book/page.tsx                # Booking form
│   │   ├── book/confirmation/page.tsx   # Post-booking confirmation
│   │   ├── booking/[token]/page.tsx     # Customer self-service (view/cancel/reschedule)
│   │   ├── chat/page.tsx                # FAQ chatbot
│   │   └── layout.tsx                   # Shared public layout (navbar, footer)
│   ├── (dashboard)/                     # Owner — Supabase Auth required
│   │   └── dashboard/
│   │       ├── layout.tsx               # Auth guard + sidebar nav
│   │       ├── page.tsx                 # Bookings overview
│   │       ├── bookings/[id]/page.tsx   # Booking detail + status controls
│   │       ├── schedule/page.tsx        # Availability slot management
│   │       └── faq/page.tsx             # FAQ CRUD
│   ├── api/
│   │   ├── bookings/route.ts            # POST — create booking
│   │   ├── bookings/[token]/route.ts    # GET/PATCH — public token-based access
│   │   ├── availability/route.ts        # GET — available slots by date
│   │   ├── services/route.ts            # GET — active services list
│   │   └── chat/route.ts                # POST — chatbot question
│   ├── login/page.tsx                   # Owner login page
│   └── layout.tsx                       # Root layout (fonts, metadata)
├── components/
│   ├── ui/                              # shadcn/ui primitives
│   ├── booking/                         # BookingForm, BookingCard, StatusBadge
│   ├── dashboard/                       # DashboardTable, BookingActions
│   ├── chat/                            # ChatWidget, ChatMessage
│   └── shared/                          # Navbar, Footer
├── lib/
│   ├── constants/
│   │   ├── booking.ts                   # BOOKING_STATUS, VALID_STATUS_TRANSITIONS, EMAIL_NOTIFICATION_TYPE
│   │   └── chat.ts                      # CONFIDENCE_THRESHOLD, ESCALATION_MESSAGE
│   ├── services/                        # All Supabase access lives here
│   │   ├── booking.service.ts
│   │   ├── availability.service.ts
│   │   ├── email.service.ts
│   │   ├── faq.service.ts
│   │   └── chat.service.ts
│   ├── supabase/
│   │   ├── client.ts                    # Browser client (anon key)
│   │   ├── server.ts                    # Server client (cookies, anon key)
│   │   └── admin.ts                     # Service role client — server-only
│   ├── validations/
│   │   ├── booking.ts                   # Zod: createBookingSchema, updateBookingStatusSchema
│   │   ├── availability.ts              # Zod: createSlotSchema, updateSlotSchema
│   │   ├── faq.ts                       # Zod: createFaqSchema, updateFaqSchema
│   │   └── chat.ts                      # Zod: chatQuestionSchema
│   └── utils.ts                         # cn() Tailwind class merge utility
├── types/index.ts                       # All TypeScript interfaces
├── middleware.ts                        # Supabase session refresh + /dashboard/* guard
├── supabase/migrations/                 # SQL migration files
├── .github/instructions/               # Copilot agent instruction files
└── Docs/                               # Architecture and planning documentation
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

### `availability_templates` `[RESERVED — Phase 2]`

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
| `service_id`      | uuid        | NO       | —                   | FK → `services(id)`                       |
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

**RLS:** Anonymous: SELECT only (service layer always filters by `reference_token`; `owner_notes` excluded in query). Authenticated (owner): full access.

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
| `provider_message_id` | text        | YES      | —                   | Resend message ID             |
| `status`              | text        | NO       | `'sent'`            | `sent` / `failed` / `bounced` |
| `error_message`       | text        | YES      | —                   |                               |
| `sent_at`             | timestamptz | NO       | `now()`             |                               |

**RLS:** No anonymous access. Authenticated (owner): SELECT. INSERT via service role (admin client).

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

| Method  | Path                                | Body / Params          | Description                    |
| ------- | ----------------------------------- | ---------------------- | ------------------------------ |
| `GET`   | `/api/services`                     | —                      | List active services           |
| `GET`   | `/api/availability?date=YYYY-MM-DD` | query: `date`          | Available slots for a date     |
| `POST`  | `/api/bookings`                     | `createBookingSchema`  | Create a new booking           |
| `GET`   | `/api/bookings/[token]`             | —                      | Get booking by reference token |
| `PATCH` | `/api/bookings/[token]`             | `{ action: "cancel" }` | Cancel booking by token        |
| `POST`  | `/api/chat`                         | `chatQuestionSchema`   | Submit chatbot question        |

### Owner Routes (Supabase Auth session required)

Owner mutations are handled via **Server Actions** in dashboard pages:

| Action                             | Description                                    |
| ---------------------------------- | ---------------------------------------------- |
| `updateBookingStatus(id, status)`  | Transition status; sets timestamp fields       |
| `updateOwnerNotes(id, notes)`      | Update private notes — never returned publicly |
| `createFaqEntry(input)`            | Add FAQ entry                                  |
| `updateFaqEntry(id, input)`        | Update FAQ entry                               |
| `deleteFaqEntry(id)`               | Delete FAQ entry                               |
| `createSlot(input)`                | Add availability slot                          |
| `updateSlotBlocked(id, isBlocked)` | Block/unblock a slot                           |

---

## 7. Constants Reference

### `lib/constants/booking.ts`

```typescript
BOOKING_STATUS; // { PENDING, CONFIRMED, ON_THE_WAY, COMPLETED, CANCELLED, DECLINED }
BOOKING_STATUS_VALUES; // tuple of all values — used in Zod enums
VALID_STATUS_TRANSITIONS; // Record<BookingStatus, BookingStatus[]>
EMAIL_NOTIFICATION_TYPE; // { BOOKING_CONFIRMATION, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_DECLINED, BOOKING_REMINDER }
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

| Variable                        | Scope           | Required | Description                               |
| ------------------------------- | --------------- | -------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + Server | YES      | Supabase project URL                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | YES      | Supabase publishable key                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only     | YES      | Service role key — never expose to client |
| `RESEND_API_KEY`                | Server only     | YES      | Resend email API key                      |
| `NEXT_PUBLIC_APP_URL`           | Client + Server | YES      | Base URL (`http://localhost:3000` in dev) |

---

## 9. Auth & Security Model

- `/dashboard/*` protected by `middleware.ts` (redirects to `/login` if no session) AND layout-level `supabase.auth.getUser()` (defence in depth)
- `middleware.ts` uses `getUser()` — never `getSession()` (session is client-unverified)
- `lib/supabase/admin.ts` (service role) — imported only in server files; never in client components
- `owner_notes` — stored on bookings but explicitly excluded from all public SELECT statements; no RLS workaround needed
- `reference_token` — always `crypto.randomUUID()`, never sequential or predictable IDs
- All API inputs parsed with Zod `safeParse()` before any service call

---

## 10. Deferred / Phase 2

These are intentionally not built yet. Do not implement until explicitly planned:

| Feature                                          | Reason deferred                                            |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `availability_templates` (slot generation)       | Schema defined; cron/generation logic is Phase 2           |
| pgvector RAG for chatbot                         | Phase 1 keyword matching is sufficient; add when FAQ grows |
| Embedded Google Maps                             | Deep link is sufficient for now                            |
| Email domain verification (Resend)               | Dev sends to own email; configure for production           |
| Booking reschedule (slot swap)                   | Cancellation is Phase 1; reschedule is Phase 2             |
| Rate limiting on `/api/bookings` and `/api/chat` | Add before public launch                                   |
