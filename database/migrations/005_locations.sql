-- ── Migration 005: areas and locations ────────────────────────────────────────
-- Location-based indexing tables.
-- Run this after 004_feedback.sql.

-- ── areas ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.areas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  color         text NOT NULL DEFAULT '#888888',
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS areas_display_order_idx ON public.areas(display_order);
CREATE INDEX IF NOT EXISTS areas_active_idx ON public.areas(active);

CREATE TRIGGER handle_updated_at_areas
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── locations ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  area_id     uuid NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  notes       text,
  "group"     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_area_id_idx ON public.locations(area_id);
CREATE INDEX IF NOT EXISTS locations_created_idx ON public.locations(created_at DESC);

CREATE TRIGGER handle_updated_at_locations
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Areas: all authenticated users can read; managers/admins can write
CREATE POLICY "Authenticated users can read areas"
  ON public.areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert areas"
  ON public.areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update areas"
  ON public.areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can delete areas"
  ON public.areas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Locations: all authenticated users can read; managers/admins can write
CREATE POLICY "Authenticated users can read locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
