-- Surface electricity tokens in user purchase history and restore variable VTU
-- fee charging for airtime/electricity.

UPDATE public.vtu_products
SET fee_percent = 4,
    fee_flat = 0,
    updated_at = now()
WHERE provider = 'ikonect'
  AND category IN ('airtime', 'electricity')
  AND is_active;

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
  token text,
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
    COALESCE(
      t.service_identifier,
      NULLIF(t.provider_response->>'meter_number', ''),
      NULLIF(t.provider_response->>'smartcard_number', ''),
      t.phone
    ) AS service_identifier,
    COALESCE(
      NULLIF(t.provider_response->>'token', ''),
      NULLIF(t.provider_response->>'electricity_token', ''),
      NULLIF(t.provider_response->>'meter_token', ''),
      NULLIF(t.provider_response->>'recharge_token', ''),
      NULLIF(t.provider_response->'data'->>'token', ''),
      NULLIF(t.provider_response->'data'->>'electricity_token', ''),
      NULLIF(t.provider_response->'data'->>'meter_token', ''),
      NULLIF(t.provider_response->'data'->>'recharge_token', '')
    ) AS token,
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

REVOKE ALL ON FUNCTION public.quote_vtu_purchase(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.quote_vtu_purchase(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
