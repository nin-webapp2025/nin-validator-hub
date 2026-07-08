-- Smart API airtime/data catalog, server-side quoting, and settlement ledger.

CREATE TABLE IF NOT EXISTS public.vtu_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'smartapi',
  category text NOT NULL CHECK (category IN ('airtime', 'data')),
  network text NOT NULL,
  name text NOT NULL,
  provider_plan_id text NOT NULL,
  provider_cost numeric(12,2) NOT NULL CHECK (provider_cost >= 0),
  retail_price numeric(12,2),
  fee_percent numeric(7,4) NOT NULL DEFAULT 0 CHECK (fee_percent >= 0),
  fee_flat numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_flat >= 0),
  min_amount numeric(12,2),
  max_amount numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, category, provider_plan_id),
  CHECK (
    (category = 'data' AND retail_price IS NOT NULL AND retail_price > provider_cost)
    OR
    (
      category = 'airtime'
      AND retail_price IS NULL
      AND min_amount IS NOT NULL
      AND max_amount IS NOT NULL
      AND min_amount > 0
      AND max_amount >= min_amount
      AND (fee_percent > 0 OR fee_flat > 0)
    )
  )
);

ALTER TABLE public.vtu_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage VTU products" ON public.vtu_products;
CREATE POLICY "Admins can manage VTU products"
  ON public.vtu_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_vtu_products_active_catalog
  ON public.vtu_products (category, is_active, sort_order, network);

CREATE TABLE IF NOT EXISTS public.vtu_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.vtu_products(id) ON DELETE SET NULL,
  request_key text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('airtime_purchase', 'data_purchase')),
  category text NOT NULL CHECK (category IN ('airtime', 'data')),
  network text NOT NULL,
  product_name text NOT NULL,
  phone text NOT NULL,
  provider text NOT NULL DEFAULT 'smartapi',
  provider_plan_id text NOT NULL,
  provider_reference text,
  face_value numeric(12,2) NOT NULL CHECK (face_value > 0),
  charged_amount numeric(12,2) NOT NULL CHECK (charged_amount > 0),
  fee_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'reversed', 'unknown')),
  provider_response jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_key),
  UNIQUE (user_id, request_key)
);

ALTER TABLE public.vtu_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own VTU transactions" ON public.vtu_transactions;

DROP POLICY IF EXISTS "Admins can manage VTU transactions" ON public.vtu_transactions;
CREATE POLICY "Admins can manage VTU transactions"
  ON public.vtu_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_vtu_transactions_user_created
  ON public.vtu_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vtu_transactions_provider_reference
  ON public.vtu_transactions (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vtu_transactions_pending
  ON public.vtu_transactions (status, updated_at)
  WHERE status IN ('pending', 'unknown');

CREATE OR REPLACE FUNCTION public.list_my_vtu_transactions(
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  category text,
  network text,
  product_name text,
  phone text,
  provider_reference text,
  charged_amount numeric,
  status text,
  completed_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.category,
    t.network,
    t.product_name,
    t.phone,
    t.provider_reference,
    t.charged_amount,
    t.status,
    t.completed_at,
    t.created_at
  FROM public.vtu_transactions t
  WHERE t.user_id = auth.uid()
    AND (p_category IS NULL OR t.category = lower(trim(p_category)))
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.list_vtu_products(p_category text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  category text,
  network text,
  name text,
  retail_price numeric,
  fee_percent numeric,
  fee_flat numeric,
  min_amount numeric,
  max_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.category,
    p.network,
    p.name,
    p.retail_price,
    p.fee_percent,
    p.fee_flat,
    p.min_amount,
    p.max_amount
  FROM public.vtu_products p
  WHERE p.is_active
    AND (p_category IS NULL OR p.category = lower(trim(p_category)))
  ORDER BY p.sort_order, p.network, p.retail_price NULLS FIRST, p.name;
$$;

CREATE OR REPLACE FUNCTION public.quote_vtu_purchase(
  p_product_id uuid,
  p_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.vtu_products%ROWTYPE;
  v_face_value numeric(12,2);
  v_fee numeric(12,2);
  v_charge numeric(12,2);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can quote VTU purchases.';
  END IF;

  SELECT *
  INTO v_product
  FROM public.vtu_products
  WHERE id = p_product_id
    AND is_active
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'This product is unavailable.');
  END IF;

  IF v_product.category = 'data' THEN
    v_face_value := v_product.provider_cost;
    v_fee := v_product.retail_price - v_product.provider_cost;
    v_charge := v_product.retail_price;
  ELSE
    IF p_amount IS NULL OR p_amount < v_product.min_amount OR p_amount > v_product.max_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', format(
          'Amount must be between NGN %s and NGN %s.',
          trim(to_char(v_product.min_amount, 'FM9999999990.00')),
          trim(to_char(v_product.max_amount, 'FM9999999990.00'))
        )
      );
    END IF;

    v_face_value := round(p_amount, 2);
    v_fee := round(v_product.fee_flat + (v_face_value * v_product.fee_percent / 100), 2);
    v_charge := v_face_value + v_fee;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product.id,
    'category', v_product.category,
    'network', v_product.network,
    'product_name', v_product.name,
    'provider', v_product.provider,
    'provider_plan_id', v_product.provider_plan_id,
    'provider_amount', v_face_value,
    'charge_amount', v_charge,
    'fee_amount', v_fee
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_vtu_reference(
  p_user_id uuid,
  p_reference text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.role() <> 'service_role' THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.vtu_transactions t
      WHERE t.user_id = p_user_id
        AND (t.request_key = p_reference OR t.provider_reference = p_reference)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_charge_variable_operation(
  p_user_id uuid,
  p_operation text,
  p_amount numeric,
  p_request_key text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(12,2);
  v_total_spent numeric(12,2);
  v_new_balance numeric(12,2);
  v_existing public.wallet_operation_requests%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can charge variable wallet amounts.';
  END IF;

  IF p_user_id IS NULL OR COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'User id and request key are required.';
  END IF;

  IF p_operation NOT IN ('airtime_purchase', 'data_purchase') THEN
    RAISE EXCEPTION 'Unsupported variable-price operation.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Charge amount must be greater than zero.';
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);
  PERFORM pg_advisory_xact_lock(
    hashtext(format('wallet-charge:%s:%s:%s', p_user_id::text, p_operation, p_request_key))
  );

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
      'message', 'This request was already refunded. Start a new purchase to try again.'
    );
  END IF;

  SELECT balance, total_spent
  INTO v_balance, v_total_spent
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_spent := COALESCE(v_total_spent, 0);

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'balance', v_balance,
      'message', format(
        'Insufficient balance. This purchase costs NGN %s but your wallet has NGN %s.',
        trim(to_char(p_amount, 'FM9999999990.00')),
        trim(to_char(v_balance, 'FM9999999990.00'))
      )
    );
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE public.wallet_balances
  SET
    balance = v_new_balance,
    total_spent = v_total_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, reference, operation, status
  )
  VALUES (
    p_user_id,
    'deduction',
    p_amount,
    COALESCE(NULLIF(trim(p_description), ''), p_operation),
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
    p_amount,
    'charged',
    v_transaction_id,
    v_new_balance,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', p_amount,
    'already_processed', false,
    'request_status', 'charged'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_vtu_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_request_key text,
  p_phone text,
  p_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote jsonb;
  v_id uuid;
  v_operation text;
  v_charged_amount numeric(12,2);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can prepare VTU purchases.';
  END IF;

  v_quote := public.quote_vtu_purchase(p_product_id, p_amount);
  IF NOT COALESCE((v_quote->>'success')::boolean, false) THEN
    RETURN v_quote;
  END IF;

  v_operation := CASE v_quote->>'category'
    WHEN 'airtime' THEN 'airtime_purchase'
    ELSE 'data_purchase'
  END;

  SELECT amount
  INTO v_charged_amount
  FROM public.wallet_operation_requests
  WHERE user_id = p_user_id
    AND operation = v_operation
    AND request_key = p_request_key
    AND status = 'charged';

  IF NOT FOUND OR v_charged_amount <> (v_quote->>'charge_amount')::numeric THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'The wallet charge does not match the current product quote.'
    );
  END IF;

  INSERT INTO public.vtu_transactions (
    user_id,
    product_id,
    request_key,
    operation,
    category,
    network,
    product_name,
    phone,
    provider,
    provider_plan_id,
    provider_reference,
    face_value,
    charged_amount,
    fee_amount,
    status,
    updated_at
  )
  VALUES (
    p_user_id,
    p_product_id,
    p_request_key,
    v_operation,
    v_quote->>'category',
    v_quote->>'network',
    v_quote->>'product_name',
    p_phone,
    v_quote->>'provider',
    v_quote->>'provider_plan_id',
    p_request_key,
    (v_quote->>'provider_amount')::numeric,
    (v_quote->>'charge_amount')::numeric,
    (v_quote->>'fee_amount')::numeric,
    'pending',
    now()
  )
  ON CONFLICT (user_id, request_key) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_quote || jsonb_build_object('transaction_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_refund_variable_operation(
  p_user_id uuid,
  p_operation text,
  p_request_key text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.wallet_operation_requests%ROWTYPE;
  v_balance numeric(12,2);
  v_total_spent numeric(12,2);
  v_new_balance numeric(12,2);
  v_transaction_id uuid;
  v_label text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can refund variable wallet amounts.';
  END IF;

  IF p_operation NOT IN ('airtime_purchase', 'data_purchase') THEN
    RAISE EXCEPTION 'Unsupported variable-price operation.';
  END IF;

  IF p_user_id IS NULL OR COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'User id and request key are required.';
  END IF;

  PERFORM public.ensure_wallet_balance_row(p_user_id);
  PERFORM pg_advisory_xact_lock(
    hashtext(format('wallet-charge:%s:%s:%s', p_user_id::text, p_operation, p_request_key))
  );

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

  SELECT balance, total_spent
  INTO v_balance, v_total_spent
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_spent := COALESCE(v_total_spent, 0);
  v_new_balance := v_balance + v_existing.amount;
  v_label := CASE p_operation
    WHEN 'airtime_purchase' THEN 'Airtime Purchase'
    ELSE 'Mobile Data Purchase'
  END;

  UPDATE public.wallet_balances
  SET
    balance = v_new_balance,
    total_spent = GREATEST(v_total_spent - v_existing.amount, 0),
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, reference, operation, status
  )
  VALUES (
    p_user_id,
    'top_up',
    v_existing.amount,
    CASE
      WHEN COALESCE(trim(p_reason), '') <> '' THEN format('Refund - %s (%s)', v_label, p_reason)
      ELSE format('Refund - %s', v_label)
    END,
    p_request_key,
    p_operation,
    'success'
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.wallet_operation_requests
  SET
    status = 'refunded',
    refund_transaction_id = v_transaction_id,
    balance_after_refund = v_new_balance,
    updated_at = now()
  WHERE id = v_existing.id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_existing.amount,
    'already_processed', false,
    'request_status', 'refunded'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_vtu_transaction(
  p_request_key text,
  p_state text,
  p_provider_response jsonb DEFAULT NULL,
  p_provider_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.vtu_transactions%ROWTYPE;
  v_status text;
  v_refund jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can settle VTU purchases.';
  END IF;

  v_status := CASE lower(trim(COALESCE(p_state, 'unknown')))
    WHEN 'succeeded' THEN 'succeeded'
    WHEN 'failed' THEN 'failed'
    WHEN 'reversed' THEN 'reversed'
    WHEN 'pending' THEN 'pending'
    WHEN 'submitted' THEN 'pending'
    ELSE 'unknown'
  END;

  SELECT *
  INTO v_transaction
  FROM public.vtu_transactions
  WHERE request_key = p_request_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'VTU transaction was not found.');
  END IF;

  IF v_transaction.status IN ('succeeded', 'failed', 'reversed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'transaction_id', v_transaction.id,
      'user_id', v_transaction.user_id,
      'status', v_transaction.status
    );
  END IF;

  IF v_status IN ('failed', 'reversed') THEN
    v_refund := public.wallet_refund_variable_operation(
      v_transaction.user_id,
      v_transaction.operation,
      v_transaction.request_key,
      format('Smart API purchase %s', v_status)
    );
  END IF;

  UPDATE public.vtu_transactions
  SET
    status = v_status,
    provider_reference = COALESCE(NULLIF(trim(p_provider_reference), ''), provider_reference),
    provider_response = COALESCE(p_provider_response, provider_response),
    completed_at = CASE WHEN v_status IN ('succeeded', 'failed', 'reversed') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_transaction.id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction.id,
    'user_id', v_transaction.user_id,
    'category', v_transaction.category,
    'status', v_status,
    'refunded', COALESCE((v_refund->>'success')::boolean, false),
    'already_processed', false
  );
END;
$$;

REVOKE ALL ON TABLE public.vtu_products FROM anon;
REVOKE ALL ON TABLE public.vtu_transactions FROM anon;
REVOKE ALL ON FUNCTION public.list_vtu_products(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quote_vtu_purchase(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authorize_vtu_reference(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_charge_variable_operation(uuid, text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_refund_variable_operation(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_vtu_transaction(text, text, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_vtu_products(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_vtu_purchase(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.authorize_vtu_reference(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_charge_variable_operation(uuid, text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_refund_variable_operation(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_vtu_transaction(text, text, jsonb, text) TO service_role;
