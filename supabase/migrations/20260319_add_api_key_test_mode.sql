-- Add test mode flag to api_keys.
-- Test keys (prefix sk_test_) bypass wallet deduction and return mock responses.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Index for fast lookups (optional but useful if table grows)
CREATE INDEX IF NOT EXISTS api_keys_is_test_idx ON api_keys (is_test);
