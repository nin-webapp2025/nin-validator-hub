-- ─── Extend api_keys for gateway usage ───────────────────────
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rate_limit integer NOT NULL DEFAULT 100,  -- requests per minute
  ADD COLUMN IF NOT EXISTS total_requests bigint NOT NULL DEFAULT 0;

-- Index for active key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_active_hash ON api_keys (key_hash) WHERE is_active = true;

-- ─── API gateway request log ─────────────────────────────────
CREATE TABLE IF NOT EXISTS api_gateway_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  status_code integer NOT NULL DEFAULT 200,
  response_time_ms integer,
  ip_address text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_gateway_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own gateway logs
DROP POLICY IF EXISTS "Users can view own gateway logs" ON api_gateway_logs;
CREATE POLICY "Users can view own gateway logs"
  ON api_gateway_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all gateway logs
DROP POLICY IF EXISTS "Admins can view all gateway logs" ON api_gateway_logs;
CREATE POLICY "Admins can view all gateway logs"
  ON api_gateway_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_gateway_logs_user ON api_gateway_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_logs_key ON api_gateway_logs (api_key_id, created_at DESC);

-- Function: count requests in last minute for rate limiting (called from edge function via service role)
CREATE OR REPLACE FUNCTION count_recent_requests(p_api_key_id uuid, p_window_seconds integer DEFAULT 60)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT count(*)
  FROM api_gateway_logs
  WHERE api_key_id = p_api_key_id
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;
$$;
