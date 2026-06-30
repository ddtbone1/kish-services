// Feature: Compliance & Policy
// Purpose: Single source of truth for policy versions, customer-facing policy
//          copy, on-site/environmental requirements, and communication
//          categories. Phase 1 of the compliance roadmap — constants only, no
//          DB or behavior change. Later phases store these version stamps on a
//          booking and surface the copy in the booking form, confirmation
//          email, and dashboard.

/**
 * Version stamps recorded against a booking when the customer accepts the
 * corresponding policy. Bump the value when the policy text materially changes
 * so historical bookings retain the version the customer actually agreed to.
 * Date-based (effective date) for self-documenting, sortable versions.
 */
export const PRIVACY_NOTICE_VERSION = "2026-06-30" as const;
export const BOOKING_TERMS_VERSION = "2026-06-30" as const;
export const ENVIRONMENTAL_ACK_VERSION = "2026-06-30" as const;

/**
 * Communication categories. Transactional messages (booking lifecycle: received,
 * confirmed, on the way, completed, cancelled) are required to deliver the
 * service and are not opt-out. Marketing is intentionally NOT collected yet —
 * add it only if/when a marketing program actually exists.
 */
export const COMMUNICATION_CATEGORY = {
  /** Booking lifecycle emails — required, not marketing. */
  TRANSACTIONAL: "transactional",
  /** Promotional messages — reserved; not collected until marketing is planned. */
  MARKETING: "marketing",
} as const;

export type CommunicationCategory =
  (typeof COMMUNICATION_CATEGORY)[keyof typeof COMMUNICATION_CATEGORY];

/**
 * Cancellation policy. `cutoffHours` is the window before the scheduled slot in
 * which a customer may still cancel without contacting the owner. Currently
 * informational/copy; enforcement (a real cutoff check) is a later phase and
 * must live in the shared booking action-policy, not be duplicated here.
 */
export const CANCELLATION_POLICY = {
  /** Policy version stamped on a booking when it is cancelled. Bump on change. */
  version: "2026-06-30",
  /** Hours before the slot start that self-service cancellation is allowed. */
  cutoffHours: 12,
  text: "You may cancel up to 12 hours before your scheduled appointment at no charge. For changes inside that window, please message us so we can help.",
} as const;

export const RESCHEDULE_POLICY = {
  text: "Reschedule requests are handled through chat so we can check route, weather, and slot availability.",
} as const;

export const WEATHER_POLICY = {
  text: "Mobile detailing may be rescheduled for unsafe weather, flooding, or poor working conditions at the service location.",
} as const;

export const NO_SHOW_POLICY = {
  text: "If the vehicle or location is unavailable when the team arrives, the booking may be cancelled or marked no-show after reasonable contact attempts.",
} as const;

/**
 * On-site and environmental requirements. The customer acknowledges these and
 * the owner relies on them to decide whether a site can be serviced safely
 * (mobile detailing happens at the customer's location). Copy only in Phase 1;
 * later phases turn these into an acknowledgment field + an owner "decline if
 * unsuitable" path, and surface them in the confirmation email and dashboard.
 */
export const SITE_REQUIREMENTS = {
  safeWorkArea:
    "A safe, legal place to park and work around the vehicle (flat, accessible, not obstructing traffic).",
  waterAccess:
    "Access to a water source may be required for some services; let us know if none is available.",
  electricAccess:
    "A power outlet may be required for some services; let us know if none is available.",
  runoffResponsibility:
    "Washing produces runoff/wastewater. By booking, you confirm the work area is suitable for this and that drainage at the location is your responsibility to disclose.",
} as const;

export type SiteRequirementKey = keyof typeof SITE_REQUIREMENTS;
