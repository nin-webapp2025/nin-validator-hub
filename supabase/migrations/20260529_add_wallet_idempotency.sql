-- Add idempotent request tracking for wallet-backed operations so retries
-- charge once, refund once, and return stable results.

CREATE TABLE IF NOT EXISTS public.wallet_operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  request_key text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'charged' CHECK (status IN ('charged', 'refunded')),
  charge_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  refund_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  balance_after_charge numeric(12,2),
  balance_after_refund numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation, request_key)
);

ALTER TABLE public.wallet_operation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet operation requests" ON public.wallet_operation_requests;
CREATE POLICY "Users can view own wallet operation requests"
  ON public.wallet_operation_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage wallet operation requests" ON public.wallet_operation_requests;
CREATE POLICY "Admins can manage wallet operation requests"
  ON public.wallet_operation_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wallet_operation_requests_user_created
  ON public.wallet_operation_requests (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.wallet_charge_operation(
  p_user_id uuid,
  p_operation text,
  p_request_key text
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
  v_existing public.wallet_operation_requests%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'Request key is required';
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
  PERFORM pg_advisory_xact_lock(hashtext(format('wallet-charge:%s:%s:%s', p_user_id::text, p_operation, p_request_key)));

  SELECT *
  INTO v_existing
  FROM public.wallet_operation_requests
  WHERE user_id = p_user_id
    AND operation = p_operation
    AND request_key = p_request_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = 'charged' THEN
      RETURN jsonb_build_object(
        'success', true,
        'balance', COALESCE(v_existing.balance_after_charge, public.wallet_get_balance(p_user_id)),
        'amount', v_existing.amount,
        'already_processed', true,
        'request_status', v_existing.status
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'balance', COALESCE(v_existing.balance_after_refund, public.wallet_get_balance(p_user_id)),
      'amount', v_existing.amount,
      'already_processed', true,
      'request_status', v_existing.status,
      'message', 'This request was already charged and later refunded. Use a new request key to run it again.'
    );
  END IF;

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
    reference,
    operation,
    status
  )
  VALUES (
    p_user_id,
    'deduction',
    v_price,
    format('%s - ₦%s', v_label, trim(to_char(v_price, 'FM9999999990.00'))),
    p_request_key,
    p_operation,
    'success'
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.wallet_operation_requests (
    user_id,
    operation,
    request_key,
    amount,
    status,
    charge_transaction_id,
    balance_after_charge,
    updated_at
  )
  VALUES (
    p_user_id,
    p_operation,
    p_request_key,
    v_price,
    'charged',
    v_transaction_id,
    v_new_balance,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_price,
    'already_processed', false,
    'request_status', 'charged'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_refund_operation(
  p_user_id uuid,
  p_operation text,
  p_reason text DEFAULT NULL,
  p_request_key text DEFAULT NULL
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
  v_existing public.wallet_operation_requests%ROWTYPE;
  v_transaction_id uuid;
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

  IF COALESCE(trim(p_request_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext(format('wallet-charge:%s:%s:%s', p_user_id::text, p_operation, p_request_key)));

    SELECT *
    INTO v_existing
    FROM public.wallet_operation_requests
    WHERE user_id = p_user_id
      AND operation = p_operation
      AND request_key = p_request_key
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'balance', public.wallet_get_balance(p_user_id),
        'message', 'No charged wallet request matched this refund key.'
      );
    END IF;

    IF v_existing.status = 'refunded' THEN
      RETURN jsonb_build_object(
        'success', true,
        'balance', COALESCE(v_existing.balance_after_refund, public.wallet_get_balance(p_user_id)),
        'amount', v_existing.amount,
        'already_processed', true,
        'request_status', v_existing.status
      );
    END IF;
  END IF;

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
    reference,
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
    NULLIF(trim(p_request_key), ''),
    p_operation,
    'success'
  )
  RETURNING id INTO v_transaction_id;

  IF COALESCE(trim(p_request_key), '') <> '' THEN
    UPDATE public.wallet_operation_requests
    SET
      status = 'refunded',
      refund_transaction_id = v_transaction_id,
      balance_after_refund = v_new_balance,
      updated_at = now()
    WHERE id = v_existing.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_price,
    'already_processed', false,
    'request_status', CASE WHEN COALESCE(trim(p_request_key), '') <> '' THEN 'refunded' ELSE 'manual_refund' END
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
    RAISE EXCEPTION 'User id is required.';
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
  PERFORM pg_advisory_xact_lock(hashtext(format('wallet-topup:%s', p_reference)));

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

REVOKE ALL ON FUNCTION public.wallet_charge_operation(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_refund_operation(uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.wallet_charge_operation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_refund_operation(uuid, text, text, text) TO authenticated;
