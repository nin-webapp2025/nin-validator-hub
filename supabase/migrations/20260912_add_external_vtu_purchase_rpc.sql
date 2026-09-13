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

REVOKE ALL ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_external_vtu_purchase(uuid, text, text, text, text, text, text, text, numeric, numeric, numeric) TO service_role;

NOTIFY pgrst, 'reload schema';
