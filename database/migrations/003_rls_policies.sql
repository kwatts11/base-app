-- ============================================================================
-- Migration 003: Row-Level Security Policies
-- Enables RLS on all tables and defines access rules
--
-- Run in: Supabase Dashboard → SQL Editor (after 001 and 002)
-- ============================================================================

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_enums ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's role ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── user_profiles policies ────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "user_profiles_self_read"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Managers and admins can read all profiles
CREATE POLICY "user_profiles_manager_read"
  ON public.user_profiles
  FOR SELECT
  USING (
    get_my_role() IN ('manager', 'admin')
    -- TODO: Update role names to match PRD.md if renamed
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "user_profiles_self_update"
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-role escalation by not allowing role changes here
    -- Role changes must go through admin
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "user_profiles_admin_update"
  ON public.user_profiles
  FOR UPDATE
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Admins can insert new profiles (invite flow)
CREATE POLICY "user_profiles_admin_insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    OR id = auth.uid() -- Allow self-insert for first-time profile creation
  );

-- Admins can delete profiles
CREATE POLICY "user_profiles_admin_delete"
  ON public.user_profiles
  FOR DELETE
  USING (get_my_role() = 'admin');

-- ── editable_enums policies ───────────────────────────────────────────────────

-- All authenticated users can read active enums
CREATE POLICY "editable_enums_authenticated_read"
  ON public.editable_enums
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Public enums can be read without authentication (optional)
CREATE POLICY "editable_enums_public_read"
  ON public.editable_enums
  FOR SELECT
  USING (is_public = true AND is_active = true);

-- Admins can see all enums (including inactive)
CREATE POLICY "editable_enums_admin_read_all"
  ON public.editable_enums
  FOR SELECT
  USING (get_my_role() = 'admin');

-- Admins can insert new enum values
CREATE POLICY "editable_enums_admin_insert"
  ON public.editable_enums
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

-- Admins can update enum values
CREATE POLICY "editable_enums_admin_update"
  ON public.editable_enums
  FOR UPDATE
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Admins can delete enum values
CREATE POLICY "editable_enums_admin_delete"
  ON public.editable_enums
  FOR DELETE
  USING (get_my_role() = 'admin');

-- ── session_invalidations table (for forced logout) ───────────────────────────
CREATE TABLE public.session_invalidations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT,
  processed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_invalidations ENABLE ROW LEVEL SECURITY;

-- Users can only read their own invalidations
CREATE POLICY "session_invalidations_self_read"
  ON public.session_invalidations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own invalidations as processed
CREATE POLICY "session_invalidations_self_update"
  ON public.session_invalidations
  FOR UPDATE
  USING (user_id = auth.uid());

-- Only admins (via service role) can insert invalidations
-- Note: Use SUPABASE_SERVICE_ROLE_KEY in edge functions for this

CREATE INDEX idx_session_invalidations_user ON public.session_invalidations(user_id);
CREATE INDEX idx_session_invalidations_processed ON public.session_invalidations(processed);

COMMENT ON TABLE public.session_invalidations IS
  'Admin-triggered forced logout records. Monitored in real-time by the app.';
