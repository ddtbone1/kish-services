-- ============================================================
-- Migration: Chat Escalation Inbox
-- Project:   Kish Auto Detailing Services
-- Created:   2026-07-02
-- ============================================================
-- Adds owner workflow fields to escalated chat sessions.

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS escalation_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS owner_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID;

ALTER TABLE public.chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_escalation_status_check;

ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_escalation_status_check
  CHECK (escalation_status IN ('open', 'resolved'));

CREATE INDEX IF NOT EXISTS idx_chat_sessions_escalated_status_created
  ON public.chat_sessions (was_escalated, escalation_status, created_at DESC);

-- Owners (authenticated) must be able to resolve/reopen and edit notes.
-- Base schema only granted anon INSERT + authenticated SELECT on chat_sessions,
-- so without this the escalation inbox's update actions are denied by RLS.
DROP POLICY IF EXISTS "Owners can update chat sessions" ON public.chat_sessions;
CREATE POLICY "Owners can update chat sessions"
  ON public.chat_sessions FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Table-level GRANTs: public tables are not auto-exposed on this project, so the
-- authenticated (dashboard) role needs an explicit grant for the RLS policies
-- above to take effect. chat_sessions previously had only anon-INSERT usage
-- (customer chat logs via the service role), so authenticated had no privilege
-- at all — hence "permission denied for table chat_sessions" in the inbox.
GRANT SELECT, UPDATE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;

-- Refresh PostgREST's schema cache so the new columns are queryable immediately.
NOTIFY pgrst, 'reload schema';
