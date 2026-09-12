-- Add Ikonect-backed VTU/bill-payment categories while keeping prices server-controlled.

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_category_pricing_check;

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_category_check;

ALTER TABLE public.vtu_products
  ADD CONSTRAINT vtu_products_category_check
  CHECK (category IN ('airtime', 'data', 'tv', 'electricity'));

ALTER TABLE public.vtu_products
  ADD CONSTRAINT vtu_products_category_pricing_check CHECK (
    (
      category IN ('data', 'tv')
      AND retail_price IS NOT NULL
      AND retail_price > provider_cost
    )
    OR
    (
      category IN ('airtime', 'electricity')
      AND retail_price IS NULL
      AND min_amount IS NOT NULL
      AND min_amount >= 50
      AND (max_amount IS NULL OR max_amount >= min_amount)
      AND fee_percent >= 0
      AND fee_percent < 100
      AND fee_flat >= 0
    )
  );

ALTER TABLE public.vtu_transactions
  DROP CONSTRAINT IF EXISTS vtu_transactions_operation_check;

ALTER TABLE public.vtu_transactions
  ADD CONSTRAINT vtu_transactions_operation_check
  CHECK (operation IN ('airtime_purchase', 'data_purchase', 'tv_purchase', 'electricity_purchase'));

ALTER TABLE public.vtu_transactions
  DROP CONSTRAINT IF EXISTS vtu_transactions_category_check;

ALTER TABLE public.vtu_transactions
  ADD CONSTRAINT vtu_transactions_category_check
  CHECK (category IN ('airtime', 'data', 'tv', 'electricity'));

INSERT INTO public.vtu_products (
  provider,
  category,
  network,
  name,
  provider_plan_id,
  provider_cost,
  retail_price,
  fee_percent,
  fee_flat,
  min_amount,
  max_amount,
  is_active,
  sort_order,
  updated_at
)
VALUES
  ('ikonect', 'airtime', 'MTN', 'MTN Airtime', 'mtn', 0, NULL, 3, 0, 50, 50000, true, 10, now()),
  ('ikonect', 'airtime', 'Airtel', 'Airtel Airtime', 'airtel', 0, NULL, 3, 0, 50, 50000, true, 20, now()),
  ('ikonect', 'airtime', 'Glo', 'Glo Airtime', 'glo', 0, NULL, 3, 0, 50, 50000, true, 30, now()),
  ('ikonect', 'airtime', '9mobile', '9mobile Airtime', '9mobile', 0, NULL, 3, 0, 50, 50000, true, 40, now()),
  ('ikonect', 'electricity', 'ikeja', 'Ikeja Electric', 'ikeja', 0, NULL, 0, 0, 1000, NULL, true, 10, now()),
  ('ikonect', 'electricity', 'eko', 'Eko Electric', 'eko', 0, NULL, 0, 0, 1000, NULL, true, 20, now()),
  ('ikonect', 'electricity', 'abuja', 'Abuja Electric', 'abuja', 0, NULL, 0, 0, 1000, NULL, true, 30, now()),
  ('ikonect', 'electricity', 'portharcourt', 'Port Harcourt Electric', 'portharcourt', 0, NULL, 0, 0, 1000, NULL, true, 40, now()),
  ('ikonect', 'electricity', 'benin', 'Benin Electric', 'benin', 0, NULL, 0, 0, 1000, NULL, true, 50, now()),
  ('ikonect', 'electricity', 'kaduna', 'Kaduna Electric', 'kaduna', 0, NULL, 0, 0, 1000, NULL, true, 60, now())
ON CONFLICT (provider, category, network, provider_plan_id) DO UPDATE
SET
  name = EXCLUDED.name,
  provider_cost = EXCLUDED.provider_cost,
  retail_price = EXCLUDED.retail_price,
  fee_percent = EXCLUDED.fee_percent,
  fee_flat = EXCLUDED.fee_flat,
  min_amount = EXCLUDED.min_amount,
  max_amount = EXCLUDED.max_amount,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_import_ikonect_data_products(
  p_plans jsonb,
  p_retail_multiplier numeric DEFAULT 1.04
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_plan jsonb;
  v_plan_id text;
  v_network text;
  v_name text;
  v_amount_text text;
  v_provider_cost numeric(12,2);
  v_retail_price numeric(12,2);
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can import Ikonect products.';
  END IF;

  IF p_retail_multiplier IS NULL OR p_retail_multiplier <= 1 THEN
    RAISE EXCEPTION 'Retail multiplier must be greater than 1.';
  END IF;

  v_items := CASE
    WHEN jsonb_typeof(p_plans) = 'array' THEN p_plans
    WHEN jsonb_typeof(p_plans->'dataPlans') = 'array' THEN p_plans->'dataPlans'
    WHEN jsonb_typeof(p_plans->'data') = 'array' THEN p_plans->'data'
    ELSE '[]'::jsonb
  END;

  UPDATE public.vtu_products
  SET is_active = false, updated_at = now()
  WHERE provider <> 'ikonect'
    AND category = 'data';

  FOR v_plan IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_plan_id := NULLIF(trim(COALESCE(v_plan->>'serviceID', v_plan->>'service_id', v_plan->>'id')), '');
    v_network := NULLIF(trim(COALESCE(v_plan->>'network', '')), '');
    v_name := NULLIF(trim(concat_ws(
      ' ',
      v_network,
      NULLIF(trim(COALESCE(v_plan->>'dataType', v_plan->>'category')), ''),
      NULLIF(trim(COALESCE(v_plan->>'dataPlan', v_plan->>'name')), ''),
      CASE
        WHEN COALESCE(v_plan->>'validity', '') <> '' THEN '- ' || v_plan->>'validity'
        ELSE ''
      END
    )), '');
    v_amount_text := regexp_replace(COALESCE(v_plan->>'amount', v_plan->>'price', ''), '[^0-9.]', '', 'g');

    IF v_plan_id IS NULL OR v_network IS NULL OR v_name IS NULL OR v_amount_text !~ '^[0-9]+(\.[0-9]+)?$' THEN
      CONTINUE;
    END IF;

    v_provider_cost := round(v_amount_text::numeric, 2);
    v_retail_price := round(v_provider_cost * p_retail_multiplier, 2);

    v_network := CASE lower(v_network)
      WHEN 'mtn' THEN 'MTN'
      WHEN 'glo' THEN 'Glo'
      WHEN 'airtel' THEN 'Airtel'
      WHEN '9mobile' THEN '9mobile'
      ELSE initcap(lower(v_network))
    END;

    INSERT INTO public.vtu_products (
      provider, category, network, name, provider_plan_id,
      provider_cost, retail_price, fee_percent, fee_flat,
      min_amount, max_amount, is_active, sort_order, updated_at
    )
    VALUES (
      'ikonect', 'data', v_network, v_name, v_plan_id,
      v_provider_cost, v_retail_price, 0, 0,
      NULL, NULL, true, v_count * 10, now()
    )
    ON CONFLICT (provider, category, network, provider_plan_id) DO UPDATE
    SET
      name = EXCLUDED.name,
      provider_cost = EXCLUDED.provider_cost,
      retail_price = EXCLUDED.retail_price,
      is_active = true,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'imported', v_count);
END;
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
    AND provider = 'ikonect'
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'This product is unavailable.');
  END IF;

  IF v_product.category IN ('data', 'tv') THEN
    v_face_value := v_product.provider_cost;
    v_fee := v_product.retail_price - v_product.provider_cost;
    v_charge := v_product.retail_price;
  ELSE
    IF p_amount IS NULL
      OR p_amount < v_product.min_amount
      OR (v_product.max_amount IS NOT NULL AND p_amount > v_product.max_amount)
    THEN
      RETURN jsonb_build_object('success', false, 'message', 'The amount is outside the allowed range.');
    END IF;

    v_face_value := round(p_amount, 2);
    v_fee := round(v_product.fee_flat + (v_face_value * v_product.fee_percent / 100), 2);
    v_charge := v_face_value;
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
    AND p.provider = 'ikonect'
    AND (p_category IS NULL OR p.category = lower(trim(p_category)))
  ORDER BY p.sort_order, p.network, p.retail_price NULLS FIRST, p.name;
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
    WHEN 'data' THEN 'data_purchase'
    WHEN 'tv' THEN 'tv_purchase'
    WHEN 'electricity' THEN 'electricity_purchase'
  END;

  SELECT amount
  INTO v_charged_amount
  FROM public.wallet_operation_requests
  WHERE user_id = p_user_id
    AND operation = v_operation
    AND request_key = p_request_key
    AND status = 'charged';

  IF NOT FOUND OR v_charged_amount <> (v_quote->>'charge_amount')::numeric THEN
    RETURN jsonb_build_object('success', false, 'message', 'The wallet charge does not match the current product quote.');
  END IF;

  INSERT INTO public.vtu_transactions (
    user_id, product_id, request_key, operation, category, network,
    product_name, phone, provider, provider_plan_id, provider_reference,
    face_value, charged_amount, fee_amount, status, updated_at
  )
  VALUES (
    p_user_id, p_product_id, p_request_key, v_operation, v_quote->>'category', v_quote->>'network',
    v_quote->>'product_name', p_phone, v_quote->>'provider', v_quote->>'provider_plan_id', p_request_key,
    (v_quote->>'provider_amount')::numeric, (v_quote->>'charge_amount')::numeric, (v_quote->>'fee_amount')::numeric,
    'pending', now()
  )
  ON CONFLICT (user_id, request_key) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_quote || jsonb_build_object('transaction_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_external_vtu_purchase(
  p_user_id uuid,
  p_request_key text,
  p_category text,
  p_network text,
  p_product_name text,
  p_phone text,
  p_provider text,
  p_provider_plan_id text,
  p_provider_amount numeric,
  p_charge_amount numeric,
  p_fee_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_operation text;
  v_charged_amount numeric(12,2);
  v_category text := lower(trim(p_category));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only trusted backend services can prepare external VTU purchases.';
  END IF;

  IF v_category <> 'data' THEN
    RETURN jsonb_build_object('success', false, 'message', 'External live catalog purchases are only enabled for mobile data.');
  END IF;

  IF p_request_key IS NULL OR trim(p_request_key) = ''
    OR p_network IS NULL OR trim(p_network) = ''
    OR p_product_name IS NULL OR trim(p_product_name) = ''
    OR p_phone IS NULL OR trim(p_phone) = ''
    OR p_provider IS NULL OR trim(p_provider) = ''
    OR p_provider_plan_id IS NULL OR trim(p_provider_plan_id) = ''
    OR p_provider_amount IS NULL OR p_provider_amount <= 0
    OR p_charge_amount IS NULL OR p_charge_amount <= 0
  THEN
    RETURN jsonb_build_object('success', false, 'message', 'The live data purchase quote is incomplete.');
  END IF;

  v_operation := 'data_purchase';

  SELECT amount
  INTO v_charged_amount
  FROM public.wallet_operation_requests
  WHERE user_id = p_user_id
    AND operation = v_operation
    AND request_key = p_request_key
    AND status = 'charged';

  IF NOT FOUND OR v_charged_amount <> round(p_charge_amount, 2) THEN
    RETURN jsonb_build_object('success', false, 'message', 'The wallet charge does not match the current live data quote.');
  END IF;

  INSERT INTO public.vtu_transactions (
    user_id, product_id, request_key, operation, category, network,
    product_name, phone, provider, provider_plan_id, provider_reference,
    face_value, charged_amount, fee_amount, status, updated_at
  )
  VALUES (
    p_user_id, NULL, p_request_key, v_operation, v_category, p_network,
    p_product_name, p_phone, p_provider, p_provider_plan_id, p_request_key,
    round(p_provider_amount, 2), round(p_charge_amount, 2), GREATEST(round(COALESCE(p_fee_amount, 0), 2), 0),
    'pending', now()
  )
  ON CONFLICT (user_id, request_key) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_id,
    'product_id', NULL,
    'category', v_category,
    'network', p_network,
    'product_name', p_product_name,
    'provider', p_provider,
    'provider_plan_id', p_provider_plan_id,
    'provider_amount', round(p_provider_amount, 2),
    'charge_amount', round(p_charge_amount, 2),
    'fee_amount', GREATEST(round(COALESCE(p_fee_amount, 0), 2), 0)
  );
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

  IF p_operation NOT IN ('airtime_purchase', 'data_purchase', 'tv_purchase', 'electricity_purchase') THEN
    RAISE EXCEPTION 'Unsupported variable-price operation.';
  END IF;

  IF p_user_id IS NULL OR COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'User id and request key are required.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Charge amount must be greater than zero.';
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
      RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_existing.balance_after_charge, public.wallet_get_balance(p_user_id)), 'amount', v_existing.amount, 'already_processed', true, 'request_status', v_existing.status);
    END IF;

    RETURN jsonb_build_object('success', false, 'balance', COALESCE(v_existing.balance_after_refund, public.wallet_get_balance(p_user_id)), 'amount', v_existing.amount, 'already_processed', true, 'request_status', v_existing.status, 'message', 'This request was already refunded. Start a new purchase to try again.');
  END IF;

  SELECT balance, total_spent
  INTO v_balance, v_total_spent
  FROM public.wallet_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);
  v_total_spent := COALESCE(v_total_spent, 0);

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'balance', v_balance, 'message', format('Insufficient balance. This purchase costs NGN %s but your wallet has NGN %s.', trim(to_char(p_amount, 'FM9999999990.00')), trim(to_char(v_balance, 'FM9999999990.00'))));
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE public.wallet_balances
  SET balance = v_new_balance, total_spent = v_total_spent + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference, operation, status)
  VALUES (p_user_id, 'deduction', p_amount, COALESCE(NULLIF(trim(p_description), ''), p_operation), p_request_key, p_operation, 'success')
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.wallet_operation_requests (
    user_id, operation, request_key, amount, status, charge_transaction_id, balance_after_charge, updated_at
  )
  VALUES (p_user_id, p_operation, p_request_key, p_amount, 'charged', v_transaction_id, v_new_balance, now());

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'amount', p_amount, 'already_processed', false, 'request_status', 'charged');
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

  IF p_operation NOT IN ('airtime_purchase', 'data_purchase', 'tv_purchase', 'electricity_purchase') THEN
    RAISE EXCEPTION 'Unsupported variable-price operation.';
  END IF;

  IF p_user_id IS NULL OR COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'User id and request key are required.';
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

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'balance', public.wallet_get_balance(p_user_id), 'message', 'No charged wallet request matched this refund key.');
  END IF;

  IF v_existing.status = 'refunded' THEN
    RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_existing.balance_after_refund, public.wallet_get_balance(p_user_id)), 'amount', v_existing.amount, 'already_processed', true, 'request_status', v_existing.status);
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
    WHEN 'data_purchase' THEN 'Mobile Data Purchase'
    WHEN 'tv_purchase' THEN 'TV Subscription'
    ELSE 'Electricity Payment'
  END;

  UPDATE public.wallet_balances
  SET balance = v_new_balance, total_spent = GREATEST(v_total_spent - v_existing.amount, 0), updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference, operation, status)
  VALUES (
    p_user_id, 'top_up', v_existing.amount,
    CASE WHEN COALESCE(trim(p_reason), '') <> '' THEN format('Refund - %s (%s)', v_label, p_reason) ELSE format('Refund - %s', v_label) END,
    p_request_key, p_operation, 'success'
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.wallet_operation_requests
  SET status = 'refunded', refund_transaction_id = v_transaction_id, balance_after_refund = v_new_balance, updated_at = now()
  WHERE id = v_existing.id;

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'amount', v_existing.amount, 'already_processed', false, 'request_status', 'refunded');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_import_ikonect_data_products(jsonb, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_import_ikonect_data_products(jsonb, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.list_vtu_products(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quote_vtu_purchase(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_charge_variable_operation(uuid, text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_refund_variable_operation(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_vtu_products(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_vtu_purchase(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_charge_variable_operation(uuid, text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_refund_variable_operation(uuid, text, text, text) TO service_role;
