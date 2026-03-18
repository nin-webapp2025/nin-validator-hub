-- API docs access control: admins grant users access to /docs/api

CREATE TABLE IF NOT EXISTS api_docs_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE api_docs_access ENABLE ROW LEVEL SECURITY;

-- Users can check their own access
DROP POLICY IF EXISTS "Users can view own api_docs_access" ON api_docs_access;
CREATE POLICY "Users can view own api_docs_access"
  ON api_docs_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all access records
DROP POLICY IF EXISTS "Admins can manage api_docs_access" ON api_docs_access;
CREATE POLICY "Admins can manage api_docs_access"
  ON api_docs_access FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_api_docs_access_user ON api_docs_access (user_id);
