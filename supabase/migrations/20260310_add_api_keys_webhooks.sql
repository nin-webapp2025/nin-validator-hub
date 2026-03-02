-- F8: API keys and webhook endpoints for integrators

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,                -- SHA-256 of the actual key (never store plaintext)
  key_prefix text NOT NULL,              -- first 8 chars for display, e.g. "sk_live_Ab"
  permissions text[] NOT NULL DEFAULT '{"read"}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own api_keys" ON api_keys;
CREATE POLICY "Users can manage own api_keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all api_keys" ON api_keys;
CREATE POLICY "Admins can view all api_keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);

-- Webhook endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  description text,
  events text[] NOT NULL DEFAULT '{"verification.completed"}',
  secret text NOT NULL,                  -- HMAC secret for signature verification
  active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own webhook_endpoints" ON webhook_endpoints;
CREATE POLICY "Users can manage own webhook_endpoints"
  ON webhook_endpoints FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints (user_id);
