-- ============================================================================
-- Migration 002: Editable Enums
-- Creates the editable_enums table for admin-managed categorization values
--
-- Run in: Supabase Dashboard → SQL Editor (after 001_user_profiles.sql)
-- ============================================================================

CREATE TABLE public.editable_enums (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enum_name     TEXT NOT NULL,       -- category name, e.g. 'event_type', 'status'
  enum_value    TEXT NOT NULL,       -- display value, e.g. 'Weekly Event'
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_public     BOOLEAN NOT NULL DEFAULT false,  -- true = visible to unauthenticated users
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (enum_name, enum_value)
);

CREATE TRIGGER editable_enums_updated_at
  BEFORE UPDATE ON public.editable_enums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_editable_enums_name ON public.editable_enums(enum_name);
CREATE INDEX idx_editable_enums_active ON public.editable_enums(is_active);

-- ── Seed data ────────────────────────────────────────────────────────────────
-- TODO: [BASE-APP SETUP NEEDED] Replace with enum categories from PRD.md
-- These are generic examples — AI replaces with your actual categories and values

INSERT INTO public.editable_enums (enum_name, enum_value, display_order, is_active) VALUES
  -- Example category 1 (rename in PRD.md)
  ('category', 'Option A', 1, true),
  ('category', 'Option B', 2, true),
  ('category', 'Option C', 3, true),

  -- Example status enum
  ('status', 'Draft', 1, true),
  ('status', 'Published', 2, true),
  ('status', 'Cancelled', 3, true);

COMMENT ON TABLE public.editable_enums IS
  'Admin-managed enumeration values. Used for dropdowns, tags, and categorization throughout the app.';
