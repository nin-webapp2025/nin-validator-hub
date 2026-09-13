ALTER TABLE public.vtu_transactions
  ADD COLUMN IF NOT EXISTS service_identifier text;

DROP FUNCTION IF EXISTS public.prepare_vtu_purchase(uuid, uuid, text, text, numeric);

CREATE OR REPLACE FUNCTION public.prepare_vtu_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_request_key text,
  p_phone text,
  p_amount numeric DEFAULT NULL,
  p_service_identifier text DEFAULT NULL
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
    product_name, phone, service_identifier, provider, provider_plan_id, provider_reference,
    face_value, charged_amount, fee_amount, status, updated_at
  )
  VALUES (
    p_user_id, p_product_id, p_request_key, v_operation, v_quote->>'category', v_quote->>'network',
    v_quote->>'product_name', p_phone, NULLIF(trim(COALESCE(p_service_identifier, p_phone)), ''),
    v_quote->>'provider', v_quote->>'provider_plan_id', p_request_key,
    (v_quote->>'provider_amount')::numeric, (v_quote->>'charge_amount')::numeric, (v_quote->>'fee_amount')::numeric,
    'pending', now()
  )
  ON CONFLICT (user_id, request_key) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_quote || jsonb_build_object('transaction_id', v_id);
END;
$$;

DROP FUNCTION IF EXISTS public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric);

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
  p_fee_amount numeric DEFAULT 0,
  p_service_identifier text DEFAULT NULL
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
    product_name, phone, service_identifier, provider, provider_plan_id, provider_reference,
    face_value, charged_amount, fee_amount, status, updated_at
  )
  VALUES (
    p_user_id, NULL, p_request_key, v_operation, v_category, p_network,
    p_product_name, p_phone, NULLIF(trim(COALESCE(p_service_identifier, p_phone)), ''),
    p_provider, p_provider_plan_id, p_request_key,
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

DROP FUNCTION IF EXISTS public.list_my_vtu_transactions(text, integer, integer);

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
  service_identifier text,
  provider text,
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
    COALESCE(t.service_identifier, t.phone) AS service_identifier,
    t.provider,
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

REVOKE ALL ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.prepare_vtu_purchase(uuid, uuid, text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
