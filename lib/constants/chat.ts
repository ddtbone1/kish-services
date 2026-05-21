/**
 * Minimum confidence score (0–1) for the chatbot to provide an answer.
 * Below this threshold, the chatbot escalates to the owner.
 */
export const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Default message shown when the chatbot cannot find a confident answer.
 */
export const ESCALATION_MESSAGE =
  "I'm not sure I have the right answer for that. Would you like me to connect you with the team? You can reach us directly at our contact page.";
