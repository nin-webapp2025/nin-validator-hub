-- Wallet-based payment system (replaces old credit system)
-- Users top up via Paystack, each operation deducts from wallet balance.

-- =========================================================
-- 1. wallet_balances — one row per user
-- =========================================================
CREATE TABLE IF NOT EXISTS wallet_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0,          -- current balance in Naira
  total_deposited numeric(12,2) NOT NULL DEFAULT 0,  -- lifetime deposits
  total_spent numeric(12,2) NOT NULL DEFAULT 0,      -- lifetime spend
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- Users see their own wallet
CREATE POLICY "Users can view own wallet"
  ON wallet_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own wallet (for deductions)
CREATE POLICY "Users can update own wallet"
  ON wallet_balances FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own wallet row (auto-provisioned)
CREATE POLICY "Users can insert own wallet"
  ON wallet_balances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage all wallets"
  ON wallet_balances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. wallet_transactions — every top-up and deduction
-- =========================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('top_up', 'deduction')),
  amount numeric(12,2) NOT NULL,
  description text,
  reference text,                    -- Paystack payment reference (for top-ups)
  operation text,                    -- e.g. 'nin_validation', 'bvn_verification' (for deductions)
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users see their own transactions
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert own transactions
CREATE POLICY "Users can insert own transactions"
  ON wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage all transactions"
  ON wallet_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON wallet_transactions (reference);

-- =========================================================
-- 3. Auto-provision wallet for new users
-- =========================================================
CREATE OR REPLACE FUNCTION provision_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallet_balances (user_id, balance, total_deposited, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_provision_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION provision_user_wallet();
