-- ============================================================================
-- Migration 001: User Profiles
-- Creates the user_profiles table, UserRole type, and profile trigger
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- User role type
-- TODO: [BASE-APP SETUP NEEDED] Rename values to match PRD.md role names
--   e.g. 'employee' → 'staff', 'manager' → 'supervisor'
--   Also update the CHECK constraint below and src/types/database.ts
CREATE TYPE public.user_role AS ENUM (
  'employee',   -- lowest access level
  'manager',    -- mid-level access
  'admin'       -- full access
);

-- User profiles table (one row per Supabase auth user)
CREATE TABLE public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'employee',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for faster role lookups
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_active ON public.user_profiles(active);

-- Helper RPC: check if a user account exists and is active
-- Used by resetPassword to validate before sending reset email
CREATE OR REPLACE FUNCTION public.check_user_exists(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT up.active
  INTO user_record
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE au.email = lower(email_address)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'false';
  END IF;

  IF NOT user_record.active THEN
    RETURN 'inactive';
  END IF;

  RETURN 'true';
END;
$$;

COMMENT ON TABLE public.user_profiles IS
  'Application-level user profiles. One row per Supabase auth user. Role controls access throughout the app.';
