-- F2: Credits / billing system
-- Each user has a credit balance; each API call costs 1 credit.

CREATE TABLE IF NOT EXISTS user_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 10,        -- starter credits
  total_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users see their own credits
CREATE POLICY "Users can view own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own credits (decrement after API call)
CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all credits
CREATE POLICY "Admins can view all credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update any credits (top-up)
CREATE POLICY "Admins can update all credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert credits for any user
CREATE POLICY "Admins can insert credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow authenticated users to insert their own credits row
CREATE POLICY "Users can insert own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-provision credits for new users by extending handle_new_user
-- (Using a separate function to avoid altering the original trigger)
CREATE OR REPLACE FUNCTION provision_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, total_used)
  VALUES (NEW.id, 10, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_provision_credits
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION provision_user_credits();
