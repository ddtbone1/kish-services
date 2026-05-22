#!/usr/bin/env node
// scripts/seed-slots.mjs
//
// Populates availability_templates and generates slots for the next 28 days.
// Runs directly against the remote Supabase using SUPABASE_SERVICE_ROLE_KEY.
//
// Usage:
//   node scripts/seed-slots.mjs
//
// Reads credentials from .env.local (falls back to .env).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// ─── Load env ────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv(filename) {
  try {
    const raw = readFileSync(resolve(__dir, "..", filename), "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // File doesn't exist — continue
  }
}

loadEnv(".env.local");
loadEnv(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Configuration ────────────────────────────────────────────────────────────

// Mon(1)–Sat(6), 08:00–17:00, 60-min slots
const DEFAULT_TEMPLATES = [
  {
    day_of_week: 1,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
  {
    day_of_week: 2,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
  {
    day_of_week: 3,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
  {
    day_of_week: 4,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
  {
    day_of_week: 5,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
  {
    day_of_week: 6,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
  },
];

const DAYS_AHEAD = 28;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date) {
  return date.toISOString().split("T")[0];
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Upsert default templates (skip if already exist for that day_of_week+time)
  console.log("Seeding availability templates…");
  const { data: existing } = await supabase
    .from("availability_templates")
    .select("day_of_week");
  const existingDays = new Set((existing ?? []).map((t) => t.day_of_week));

  const toInsert = DEFAULT_TEMPLATES.filter(
    (t) => !existingDays.has(t.day_of_week),
  );

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("availability_templates")
      .insert(toInsert);
    if (error) {
      console.error("Failed to insert templates:", error.message);
      process.exit(1);
    }
    console.log(`  Inserted ${toInsert.length} template(s)`);
  } else {
    console.log("  Templates already exist — skipping");
  }

  // 2. Fetch all active templates
  const { data: templates, error: tErr } = await supabase
    .from("availability_templates")
    .select("*")
    .eq("is_active", true);

  if (tErr || !templates) {
    console.error("Failed to fetch templates:", tErr?.message);
    process.exit(1);
  }

  // 3. Generate slots for today + DAYS_AHEAD
  console.log(`\nGenerating slots for next ${DAYS_AHEAD} days…`);
  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dow = date.getDay(); // 0=Sun … 6=Sat
    const dateStr = toISO(date);

    const matchingTemplates = templates.filter((t) => t.day_of_week === dow);

    for (const tmpl of matchingTemplates) {
      let slotStart = tmpl.start_time.slice(0, 5); // normalise to HH:MM
      const endMins = timeToMinutes(tmpl.end_time.slice(0, 5));

      while (timeToMinutes(slotStart) + tmpl.slot_duration_minutes <= endMins) {
        const slotEnd = addMinutes(slotStart, tmpl.slot_duration_minutes);
        slots.push({
          date: dateStr,
          start_time: slotStart,
          end_time: slotEnd,
          is_blocked: false,
        });
        slotStart = slotEnd;
      }
    }
  }

  if (slots.length === 0) {
    console.log(
      "  No slots to insert (check templates cover any days in the range)",
    );
    return;
  }

  // 4. Upsert in batches of 100 (ON CONFLICT DO NOTHING via ignoreDuplicates)
  let inserted = 0;
  const BATCH = 100;
  for (let i = 0; i < slots.length; i += BATCH) {
    const batch = slots.slice(i, i + BATCH);
    const { error } = await supabase
      .from("availability_slots")
      .upsert(batch, { onConflict: "date,start_time", ignoreDuplicates: true });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ${inserted} slot(s) upserted (duplicates ignored)`);
  console.log("\nDone! The booking form should now show available time slots.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
