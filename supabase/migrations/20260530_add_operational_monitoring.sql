-- Operational monitoring: unified event stream + deduplicated alerts

CREATE TABLE IF NOT EXISTS public.operational_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  component text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text,
  action text,
  status_code integer,
  duration_ms integer,
  request_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.background_jobs(id) ON DELETE SET NULL,
  provider text,
  state text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view operational events" ON public.operational_events;
CREATE POLICY "Admins can view operational events"
  ON public.operational_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_operational_events_created_at
  ON public.operational_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_severity_created
  ON public.operational_events (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_component_created
  ON public.operational_events (component, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_request_id
  ON public.operational_events (request_id)
  WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL,
  source text NOT NULL,
  component text NOT NULL,
  alert_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  dedupe_key text,
  event_id uuid REFERENCES public.operational_events(id) ON DELETE SET NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view operational alerts" ON public.operational_alerts;
CREATE POLICY "Admins can view operational alerts"
  ON public.operational_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update operational alerts" ON public.operational_alerts;
CREATE POLICY "Admins can update operational alerts"
  ON public.operational_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_operational_alerts_status_seen
  ON public.operational_alerts (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_component_status
  ON public.operational_alerts (component, status, last_seen_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_alerts_open_dedupe
  ON public.operational_alerts (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('open', 'acknowledged');

CREATE OR REPLACE FUNCTION public.record_operational_event(
  p_source text,
  p_component text,
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_message text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_status_code integer DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_api_key_id uuid DEFAULT NULL,
  p_job_id uuid DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_create_alert boolean DEFAULT false,
  p_alert_type text DEFAULT NULL,
  p_alert_title text DEFAULT NULL,
  p_alert_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_alert_id uuid;
  v_should_alert boolean := COALESCE(p_create_alert, false) OR COALESCE(p_severity, 'info') IN ('error', 'critical');
  v_alert_type text := COALESCE(NULLIF(trim(p_alert_type), ''), p_event_type);
  v_alert_title text := COALESCE(NULLIF(trim(p_alert_title), ''), initcap(replace(COALESCE(v_alert_type, 'system_alert'), '_', ' ')));
  v_alert_message text := COALESCE(NULLIF(trim(p_message), ''), 'Operational alert raised.');
  v_dedupe_key text := NULLIF(trim(COALESCE(p_alert_dedupe_key, '')), '');
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins or service role can record operational events';
  END IF;

  INSERT INTO public.operational_events (
    source,
    component,
    event_type,
    severity,
    message,
    action,
    status_code,
    duration_ms,
    request_id,
    user_id,
    api_key_id,
    job_id,
    provider,
    state,
    metadata
  )
  VALUES (
    p_source,
    p_component,
    p_event_type,
    COALESCE(NULLIF(trim(p_severity), ''), 'info'),
    p_message,
    p_action,
    p_status_code,
    p_duration_ms,
    p_request_id,
    p_user_id,
    p_api_key_id,
    p_job_id,
    p_provider,
    p_state,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  IF v_should_alert THEN
    IF v_dedupe_key IS NOT NULL THEN
      UPDATE public.operational_alerts
      SET
        updated_at = now(),
        last_seen_at = now(),
        occurrence_count = occurrence_count + 1,
        severity = COALESCE(NULLIF(trim(p_severity), ''), severity),
        message = v_alert_message,
        event_id = v_event_id,
        metadata = COALESCE(p_metadata, '{}'::jsonb)
      WHERE dedupe_key = v_dedupe_key
        AND status IN ('open', 'acknowledged')
      RETURNING id INTO v_alert_id;
    END IF;

    IF v_alert_id IS NULL THEN
      INSERT INTO public.operational_alerts (
        severity,
        source,
        component,
        alert_type,
        title,
        message,
        dedupe_key,
        event_id,
        metadata
      )
      VALUES (
        COALESCE(NULLIF(trim(p_severity), ''), 'error'),
        p_source,
        p_component,
        v_alert_type,
        v_alert_title,
        v_alert_message,
        v_dedupe_key,
        v_event_id,
        COALESCE(p_metadata, '{}'::jsonb)
      )
      RETURNING id INTO v_alert_id;

      INSERT INTO public.notifications (user_id, title, message, type, link)
      SELECT
        p.user_id,
        v_alert_title,
        v_alert_message,
        CASE
          WHEN COALESCE(NULLIF(trim(p_severity), ''), 'error') = 'critical' THEN 'error'
          WHEN COALESCE(NULLIF(trim(p_severity), ''), 'error') = 'error' THEN 'error'
          ELSE 'warning'
        END,
        '/dashboard/admin'
      FROM public.user_roles p
      WHERE p.role = 'admin';
    END IF;
  END IF;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_operational_event(
  text, text, text, text, text, text, integer, integer, text, uuid, uuid, uuid, text, text, jsonb, boolean, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_operational_event(
  text, text, text, text, text, text, integer, integer, text, uuid, uuid, uuid, text, text, jsonb, boolean, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_operational_alert_status(
  p_alert_id uuid,
  p_status text
)
RETURNS public.operational_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.operational_alerts%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins or service role can update operational alerts';
  END IF;

  UPDATE public.operational_alerts
  SET
    status = p_status,
    updated_at = now(),
    last_seen_at = CASE WHEN p_status = 'resolved' THEN last_seen_at ELSE now() END
  WHERE id = p_alert_id
  RETURNING * INTO v_alert;

  RETURN v_alert;
END;
$$;

REVOKE ALL ON FUNCTION public.update_operational_alert_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_operational_alert_status(uuid, text) TO authenticated;
