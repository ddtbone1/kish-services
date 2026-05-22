// Feature: Availability
// Purpose: Zod validation schemas for availability slots and weekly templates
// Added: 2026-05-21

import { z } from "zod";

// ─── Time helper ─────────────────────────────────────────────────────────────

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
const timeSchema = z.string().regex(timeRegex, "Must be HH:MM or HH:MM:SS");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format");

// ─── Slots ───────────────────────────────────────────────────────────────────

export const createSlotSchema = z.object({
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;

export const updateSlotSchema = z.object({
  is_blocked: z.boolean(),
});

export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;

// ─── Templates ───────────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  /** 0 = Sunday, 1 = Monday … 6 = Saturday (PostgreSQL DOW convention) */
  day_of_week: z.number().int().min(0).max(6),
  start_time: timeSchema,
  end_time: timeSchema,
  /** How long each generated slot is, in minutes (e.g. 60) */
  slot_duration_minutes: z.number().int().min(15).max(480),
  is_active: z.boolean().optional().default(true),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ─── Generate ────────────────────────────────────────────────────────────────

export const generateSlotsSchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>;
