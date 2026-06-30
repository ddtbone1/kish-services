# Compliance Roadmap — Phase 2 & 3 Implementation Plan (for review)

**Status:** proposed — no code written yet. Phase 1 (policy constants,
[lib/constants/policy.ts](../lib/constants/policy.ts)) is already done.

**Scope:** Phase 2 (booking consent & terms) + Phase 3 (on-site safety fields). Both touch the
booking-creation path, so they're planned together to make one coherent migration + RPC change.

**Guiding constraints:** additive & backward-compatible (existing bookings stay valid); server
stamps policy versions (never trust the client for them); the customer UI stays concise while the
owner dashboard shows everything; no scheduling/status-machine changes.

---

## New booking columns (all nullable / defaulted — additive)

| Column | Type | Source | Notes |
|---|---|---|---|
| `privacy_notice_version` | `text` | **server** constant | `PRIVACY_NOTICE_VERSION` at creation time |
| `terms_version` | `text` | **server** constant | `BOOKING_TERMS_VERSION` |
| `customer_consent_at` | `timestamptz` | **server** `now()` | set when the single consent checkbox is true |
| `transactional_contact_consent` | `boolean default false` | **server** (implied) | booking implies lifecycle emails — set `true` automatically, shown as a one-line disclosure, **not** a checkbox; **no marketing column** |
| `vehicle_type` | `text` | client | Zod enum: sedan/suv/pickup/van/motorcycle/other (**required**) |
| `vehicle_details` | `text` | client (optional) | free-text, shown only when `vehicle_type = other` |
| `parking_available` | `boolean` | client (**required**) | "is there a safe place to park & work?" — the one mandatory site field |
| `water_available` | `boolean` | client (optional) | **tri-state**: Yes/No/Not sure → `true`/`false`/`NULL` |
| `electric_available` | `boolean` | client (optional) | **tri-state**: Yes/No/Not sure → `true`/`false`/`NULL` |
| `access_instructions` | `text` | client (optional) | gate codes, unit, where to park |
| `site_safety_notes` | `text` | client (optional) | hazards, pets, slope, etc. |

Marketing consent is intentionally omitted (no marketing program exists) — per the roadmap.

---

## Files & changes

### 1. DB migration — `supabase/migrations/20260630000000_booking_consent_and_site.sql`
- `ALTER TABLE bookings ADD COLUMN ...` for all 10 columns above (nullable / defaulted) — existing
  rows remain valid.
- **Update `create_booking` RPC** ([20260624000000_booking_integrity.sql:51-147](../supabase/migrations/20260624000000_booking_integrity.sql#L51-L147)):
  - ⚠️ **Critical:** changing the arg count creates a *new overload* rather than replacing, which
    causes "function is not unique" at call time. The migration must
    **`DROP FUNCTION create_booking(uuid, uuid[], uuid[], text, text, text, text, text, text, text)`**
    (the exact current 10-arg signature) **first**, then `CREATE` the new function.
  - Append the new params (with `DEFAULT NULL`) after `p_notes`, keep `SECURITY DEFINER` +
    `search_path=public`, and add the columns to the `INSERT`. `customer_consent_at` is set inside
    the function as `now()` when `p_transactional_contact_consent IS TRUE`.
  - Re-`GRANT EXECUTE` to anon/authenticated/service_role (grants are dropped with the function).

### 2. Validation — [lib/validations/booking.ts](../lib/validations/booking.ts)
Extend `createBookingSchema`:
- `accept_privacy: z.literal(true)` and `accept_terms: z.literal(true)` — must be checked.
- `transactional_contact_consent: z.literal(true)` (booking implies transactional contact).
- `vehicle_type: z.enum([...])`; `parking_available: z.boolean()`;
  `water_available`/`electric_available`: `z.boolean().optional()`;
  `access_instructions`/`site_safety_notes`: `z.string().max(500).optional()`.
- The version strings + `customer_consent_at` are **not** in the schema — the server supplies them.

### 3. Service — [lib/services/booking.service.ts](../lib/services/booking.service.ts#L58-L69)
`createBooking` passes the new RPC params, stamping versions from
[lib/constants/policy.ts](../lib/constants/policy.ts):
`p_privacy_notice_version: PRIVACY_NOTICE_VERSION`, `p_terms_version: BOOKING_TERMS_VERSION`,
`p_transactional_contact_consent`, and the six site fields. Update `CreateBookingInput` usage.

### 4. Types — [types/index.ts](../types/index.ts)
Add the 10 columns to `Booking` (and they flow into `PublicBooking`/`BookingWithItems`/
`OwnerBookingDetail`). Consent/site fields are safe to expose; none are private like `owner_notes`.

### 5. Customer UI — [components/booking/BookingForm.tsx](../components/booking/BookingForm.tsx)
- A compact **site** section: vehicle type (select), "safe place to park & work?" (toggle), optional
  water/electric toggles, access instructions + safety notes (short textareas).
- A **consent** section near submit: two checkboxes linking to Privacy/Terms; submit disabled until
  both checked. Reuse copy/versions from `policy.ts`.

### 6. Owner dashboard — [app/(dashboard)/dashboard/bookings/[id]/page.tsx](../app/(dashboard)/dashboard/bookings/[id]/page.tsx)
Add a "Consent & Site" card: consent status + accepted versions + `customer_consent_at`; vehicle
type, parking/water/electric, access instructions, safety notes. (Confirmation-email surfacing and
the owner "decline if unsuitable" path are **Phase 4** — not here.)

### 7. Tests
- [lib/validations/booking.test.ts](../lib/validations/booking.test.ts) — accept/reject consent +
  site fields.
- [lib/services/booking.service.test.ts](../lib/services/booking.service.test.ts) and
  [app/api/bookings/route.test.ts](../app/api/bookings/route.test.ts) — extend the valid input
  fixture with the new fields; assert the RPC receives stamped versions.
- Manual: apply migration to a local/staging DB, create a booking end-to-end, confirm columns
  populate and existing bookings still read.

---

## Risk register
1. **RPC overload collision** — mitigated by `DROP FUNCTION` of the exact 10-arg signature before
   `CREATE`. Verify no other code calls the old arity.
2. **Backward compatibility** — all columns nullable/defaulted; old rows unaffected; `getBookingByToken`
   and dashboard reads keep working.
3. **Don't trust client versions** — server injects `PRIVACY_NOTICE_VERSION`/`BOOKING_TERMS_VERSION`
   and `now()`; client only sends acceptance booleans.
4. **Idempotency** — the new fields are part of the request body, so the existing body-hash check
   continues to dedupe correctly.
5. **Migration ordering** — must run before deploying the new app code that passes the extra params.

## Out of scope (later phases)
Phase 4 environmental acknowledgment in email + owner decline; Phase 5 risk flags; Phase 6
cancellation/reschedule/weather/no-show controls; Phase 7 audit/event table; Phase 8 dashboard
rollup. The action-policy already added in `lib/constants/booking.ts` is where any cancellation
cutoff enforcement (Phase 6) will live.
