-- Create clearance_history table
CREATE TABLE IF NOT EXISTS clearance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nin TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clearance_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own clearance history
CREATE POLICY "Users can read own clearance history"
  ON clearance_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own clearance history
CREATE POLICY "Users can insert own clearance history"
  ON clearance_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clearance_history_user_id ON clearance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_clearance_history_created_at ON clearance_history(created_at DESC);
