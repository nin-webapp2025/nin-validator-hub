-- Harden wallet mutations by removing direct client write access and
-- centralizing balance changes inside security-definer database functions.

DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

CREATE OR REPLACE FUNCTION public.wallet_operation_price(p_operation text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_operation
    WHEN 'nin_validation' THEN 5000
    WHEN 'bvn_verification' THEN 800
    WHEN 'nin_verification' THEN 800
    WHEN 'print_nin_slip_premium' THEN 600
    WHEN 'print_nin_slip_long' THEN 400
    WHEN 'clearance' THEN 3000
    WHEN 'personalization' THEN 1500
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_operation_label(p_operation text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_operation
    WHEN 'nin_validation' THEN 'NIN Validation'
    WHEN 'bvn_verification' THEN 'BVN Verification'
    WHEN 'nin_verification' THEN 'NIN Verification'
    WHEN 'print_nin_slip_premium' THEN 'Print Premium NIN Slip'
    WHEN 'print_nin_slip_long' THEN 'Print Long NIN Slip (NINS)'
    WHEN 'clearance' THEN 'Clearance'
    WHEN 'personalization' THEN 'Personalization'
    ELSE p_operation
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_wallet_balance_row(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, balance, total_deposited, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_get_balance(p_user_id uuid DEFAULT auth.uid())
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(12,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF auth.role() <> 'service_role'
    AND NOT has_role(auth.uid(), 'admin')
    AND auth.uid() <> p_user_id
  THEN
    RAISE EXCEPTION 'You are not allowed to read this wallet.';
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);

  SELECT balance
  INTO v_balance
  FROM public.wallet_balances
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_charge_operation(
  p_user_id uuid,
  p_operation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric(12,2);
  v_label text;
  v_balance numeric(12,2);
  v_total_spent numeric(12,2);
  v_new_balance numeric(12,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF auth.role() <> 'service_role'
    AND NOT has_role(auth.uid(), 'admin')
    AND auth.uid() <> p_user_id
  THEN
    RAISE EXCEPTION 'You are not allowed to charge this wallet.';
  END IF;

  v_price := public.wallet_operation_price(p_operation);
  v_label := public.wallet_operation_label(p_operation);

  IF v_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'balance', 0,
      'message', 'Unknown operation.'
    );
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);

  SELECT balance, total_spent
  INTO v_balance, v_total_spent
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_spent := COALESCE(v_total_spent, 0);

  IF v_balance < v_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'balance', v_balance,
      'message', format(
        'Insufficient balance. This operation costs ₦%s but your wallet has ₦%s.',
        to_char(v_price, 'FM9999999990.00'),
        to_char(v_balance, 'FM9999999990.00')
      )
    );
  END IF;

  v_new_balance := v_balance - v_price;

  UPDATE public.wallet_balances
  SET
    balance = v_new_balance,
    total_spent = v_total_spent + v_price,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    operation,
    status
  )
  VALUES (
    p_user_id,
    'deduction',
    v_price,
    format('%s - ₦%s', v_label, trim(to_char(v_price, 'FM9999999990.00'))),
    p_operation,
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_refund_operation(
  p_user_id uuid,
  p_operation text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric(12,2);
  v_label text;
  v_balance numeric(12,2);
  v_total_spent numeric(12,2);
  v_new_balance numeric(12,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF auth.role() <> 'service_role'
    AND NOT has_role(auth.uid(), 'admin')
  THEN
    RAISE EXCEPTION 'Only trusted server flows may refund this wallet.';
  END IF;

  v_price := public.wallet_operation_price(p_operation);
  v_label := public.wallet_operation_label(p_operation);

  IF v_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'balance', 0,
      'message', 'Unknown operation.'
    );
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);

  SELECT balance, total_spent
  INTO v_balance, v_total_spent
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_spent := COALESCE(v_total_spent, 0);
  v_new_balance := v_balance + v_price;

  UPDATE public.wallet_balances
  SET
    balance = v_new_balance,
    total_spent = GREATEST(v_total_spent - v_price, 0),
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    operation,
    status
  )
  VALUES (
    p_user_id,
    'top_up',
    v_price,
    CASE
      WHEN COALESCE(trim(p_reason), '') <> '' THEN format('Refund - %s (%s)', v_label, p_reason)
      ELSE format('Refund - %s', v_label)
    END,
    p_operation,
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_price
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_apply_top_up(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT 'Wallet top-up'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(12,2);
  v_total_deposited numeric(12,2);
  v_new_balance numeric(12,2);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Top-up amount must be greater than zero.';
  END IF;

  IF COALESCE(trim(p_reference), '') = '' THEN
    RAISE EXCEPTION 'Payment reference is required.';
  END IF;

  IF auth.role() <> 'service_role'
    AND NOT has_role(auth.uid(), 'admin')
  THEN
    RAISE EXCEPTION 'Only trusted server flows may credit this wallet.';
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE reference = p_reference
      AND type = 'top_up'
  ) THEN
    SELECT balance
    INTO v_balance
    FROM public.wallet_balances
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'balance', COALESCE(v_balance, 0),
      'already_processed', true
    );
  END IF;

  SELECT balance, total_deposited
  INTO v_balance, v_total_deposited
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_deposited := COALESCE(v_total_deposited, 0);
  v_new_balance := v_balance + p_amount;

  UPDATE public.wallet_balances
  SET
    balance = v_new_balance,
    total_deposited = v_total_deposited + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    reference,
    status
  )
  VALUES (
    p_user_id,
    'top_up',
    p_amount,
    COALESCE(NULLIF(trim(p_description), ''), 'Wallet top-up'),
    p_reference,
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'already_processed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_wallet_balance_row(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_get_balance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_charge_operation(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_refund_operation(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_apply_top_up(uuid, numeric, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.wallet_get_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_charge_operation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_refund_operation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply_top_up(uuid, numeric, text, text) TO authenticated;
