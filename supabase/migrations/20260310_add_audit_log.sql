-- F5: Audit log for admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,       -- e.g. 'user_role', 'modification_request', 'account'
  target_id text,                  -- id of the affected resource
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY "Admins can view audit_log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Any authenticated user can insert (the app logs on their behalf)
CREATE POLICY "Authenticated users can insert audit_log"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_id);
CREATE INDEX idx_audit_log_target ON audit_log (target_type, target_id);
