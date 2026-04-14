-- ── Migration 004: bug_reports and feature_requests ──────────────────────────
-- In-app feedback tables used by the report-bug and request-feature modals.
-- Run this after 003_rls_policies.sql.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE bug_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_priority AS ENUM ('nice_to_have', 'important', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── bug_reports ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  description      text NOT NULL,
  steps_to_reproduce text,
  expected_behavior  text,
  actual_behavior    text,
  severity         bug_severity NOT NULL DEFAULT 'medium',
  status           feedback_status NOT NULL DEFAULT 'open',
  page_id          text,
  page_url         text,
  reporter_id      uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reporter_role    text,
  device_info      jsonb,
  resolution_notes text,
  resolved_by      uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS bug_reports_severity_idx ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS bug_reports_reporter_idx ON public.bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS bug_reports_created_idx ON public.bug_reports(created_at DESC);

CREATE TRIGGER handle_updated_at_bug_reports
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── feature_requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text NOT NULL,
  use_case       text,
  priority       feature_priority NOT NULL DEFAULT 'important',
  status         feedback_status NOT NULL DEFAULT 'open',
  requester_id   uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  requester_role text,
  upvotes        integer NOT NULL DEFAULT 0,
  admin_notes    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_requests_status_idx ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS feature_requests_priority_idx ON public.feature_requests(priority);
CREATE INDEX IF NOT EXISTS feature_requests_created_idx ON public.feature_requests(created_at DESC);

CREATE TRIGGER handle_updated_at_feature_requests
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Bug reports: authenticated users can insert; managers/admins can read all; reporters read own
CREATE POLICY "Users can submit bug reports"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

CREATE POLICY "Reporters can read their own bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Managers and admins can read all bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Feature requests: authenticated users can insert; managers/admins can read all; requesters read own
CREATE POLICY "Users can submit feature requests"
  ON public.feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid() OR requester_id IS NULL);

CREATE POLICY "Requesters can read their own feature requests"
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Managers and admins can read all feature requests"
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can update feature requests"
  ON public.feature_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
