-- Background job framework for async provider polling and future retries.

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  unique_key text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 12,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  last_result jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT background_jobs_type_unique UNIQUE (type, unique_key)
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view background jobs" ON public.background_jobs;
CREATE POLICY "Admins can view background jobs"
  ON public.background_jobs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage background jobs" ON public.background_jobs;
CREATE POLICY "Admins can manage background jobs"
  ON public.background_jobs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_run_at
  ON public.background_jobs (status, run_at);

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_run_at
  ON public.background_jobs (type, run_at);

CREATE OR REPLACE FUNCTION public.enqueue_background_job(
  p_type text,
  p_payload jsonb,
  p_run_at timestamptz DEFAULT now(),
  p_unique_key text DEFAULT NULL,
  p_max_attempts integer DEFAULT 12
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_job_id uuid;
BEGIN
  IF COALESCE(trim(p_type), '') = '' THEN
    RAISE EXCEPTION 'Job type is required.';
  END IF;

  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'Job payload is required.';
  END IF;

  v_user_id := NULLIF(trim(COALESCE(p_payload->>'user_id', '')), '')::uuid;

  IF auth.role() <> 'service_role'
    AND NOT has_role(auth.uid(), 'admin')
    AND (v_user_id IS NULL OR auth.uid() <> v_user_id)
  THEN
    RAISE EXCEPTION 'You are not allowed to enqueue this background job.';
  END IF;

  INSERT INTO public.background_jobs (
    type,
    payload,
    run_at,
    unique_key,
    max_attempts,
    status,
    attempt_count,
    locked_at,
    locked_by,
    last_error,
    last_result,
    completed_at,
    updated_at
  )
  VALUES (
    p_type,
    p_payload,
    COALESCE(p_run_at, now()),
    NULLIF(trim(p_unique_key), ''),
    GREATEST(COALESCE(p_max_attempts, 12), 1),
    'pending',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (type, unique_key)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    run_at = LEAST(public.background_jobs.run_at, EXCLUDED.run_at),
    max_attempts = GREATEST(public.background_jobs.max_attempts, EXCLUDED.max_attempts),
    updated_at = now()
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_background_jobs(
  p_worker text,
  p_limit integer DEFAULT 10,
  p_types text[] DEFAULT NULL
)
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(trim(p_worker), '') = '' THEN
    RAISE EXCEPTION 'Worker name is required.';
  END IF;

  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only trusted server flows may claim background jobs.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.background_jobs
    WHERE status = 'pending'
      AND run_at <= now()
      AND (p_types IS NULL OR type = ANY (p_types))
    ORDER BY run_at ASC, created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 10), 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.background_jobs j
  SET
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker,
    attempt_count = j.attempt_count + 1,
    updated_at = now()
  FROM candidates
  WHERE j.id = candidates.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_background_job(
  p_job_id uuid,
  p_result jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only trusted server flows may complete background jobs.';
  END IF;

  UPDATE public.background_jobs
  SET
    status = 'completed',
    last_result = COALESCE(p_result, last_result),
    last_error = NULL,
    locked_at = NULL,
    locked_by = NULL,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_background_job(
  p_job_id uuid,
  p_delay_seconds integer DEFAULT 300,
  p_result jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only trusted server flows may reschedule background jobs.';
  END IF;

  UPDATE public.background_jobs
  SET
    status = 'pending',
    run_at = now() + make_interval(secs => GREATEST(COALESCE(p_delay_seconds, 300), 5)),
    last_result = COALESCE(p_result, last_result),
    last_error = NULL,
    locked_at = NULL,
    locked_by = NULL,
    updated_at = now()
  WHERE id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_background_job(
  p_job_id uuid,
  p_error text,
  p_result jsonb DEFAULT NULL,
  p_retry_delay_seconds integer DEFAULT 300,
  p_force_terminal boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count integer;
  v_max_attempts integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only trusted server flows may fail background jobs.';
  END IF;

  SELECT attempt_count, max_attempts
  INTO v_attempt_count, v_max_attempts
  FROM public.background_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_force_terminal OR v_attempt_count >= v_max_attempts THEN
    UPDATE public.background_jobs
    SET
      status = 'failed',
      last_error = p_error,
      last_result = COALESCE(p_result, last_result),
      locked_at = NULL,
      locked_by = NULL,
      completed_at = now(),
      updated_at = now()
    WHERE id = p_job_id;
  ELSE
    UPDATE public.background_jobs
    SET
      status = 'pending',
      run_at = now() + make_interval(secs => GREATEST(COALESCE(p_retry_delay_seconds, 300), 5)),
      last_error = p_error,
      last_result = COALESCE(p_result, last_result),
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
    WHERE id = p_job_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_background_job(text, jsonb, timestamptz, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_background_jobs(text, integer, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_background_job(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reschedule_background_job(uuid, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_background_job(uuid, text, jsonb, integer, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.enqueue_background_job(text, jsonb, timestamptz, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_background_jobs(text, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_background_job(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_background_job(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_background_job(uuid, text, jsonb, integer, boolean) TO authenticated;
