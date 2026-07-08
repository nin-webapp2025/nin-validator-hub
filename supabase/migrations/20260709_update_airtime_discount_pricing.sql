-- Treat airtime margin as a provider discount, not a customer surcharge.
-- Example: user buys NGN 100, wallet charge is NGN 100, provider cost is
-- effectively NGN 97, and NGN 3 is recorded as fee_amount/profit.

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_check;

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_category_pricing_check;

ALTER TABLE public.vtu_products
  ADD CONSTRAINT vtu_products_category_pricing_check CHECK (
    (
      category = 'data'
      AND retail_price IS NOT NULL
      AND retail_price > provider_cost
    )
    OR
    (
      category = 'airtime'
      AND retail_price IS NULL
      AND min_amount IS NOT NULL
      AND min_amount >= 50
      AND (max_amount IS NULL OR max_amount >= min_amount)
      AND fee_percent >= 0
      AND fee_percent < 100
      AND fee_flat >= 0
    )
  );

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_provider_category_provider_plan_id_key;

ALTER TABLE public.vtu_products
  DROP CONSTRAINT IF EXISTS vtu_products_provider_category_network_provider_plan_id_key;

ALTER TABLE public.vtu_products
  ADD CONSTRAINT vtu_products_provider_category_network_provider_plan_id_key
  UNIQUE (provider, category, network, provider_plan_id);

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
  ('smartapi', 'airtime', 'MTN', 'MTN Airtime', '1', 0, NULL, 3, 0, 50, NULL, true, 10, now()),
  ('smartapi', 'airtime', 'Airtel', 'Airtel Airtime', '1', 0, NULL, 3, 0, 50, NULL, true, 20, now()),
  ('smartapi', 'airtime', 'Glo', 'Glo Airtime', '1', 0, NULL, 3, 0, 50, NULL, true, 30, now())
ON CONFLICT (provider, category, network, provider_plan_id) DO UPDATE
SET
  name = EXCLUDED.name,
  provider_cost = 0,
  retail_price = NULL,
  fee_percent = 3,
  fee_flat = 0,
  min_amount = 50,
  max_amount = NULL,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE public.vtu_products
SET
  fee_percent = 3,
  fee_flat = 0,
  min_amount = 50,
  max_amount = NULL,
  updated_at = now()
WHERE provider = 'smartapi'
  AND category = 'airtime'
  AND lower(network) IN ('mtn', 'airtel', 'glo');

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
    IF p_amount IS NULL
      OR p_amount < v_product.min_amount
      OR (v_product.max_amount IS NOT NULL AND p_amount > v_product.max_amount)
    THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', CASE
          WHEN v_product.max_amount IS NULL THEN format(
            'Amount must be at least NGN %s.',
            trim(to_char(v_product.min_amount, 'FM9999999990.00'))
          )
          ELSE format(
            'Amount must be between NGN %s and NGN %s.',
            trim(to_char(v_product.min_amount, 'FM9999999990.00')),
            trim(to_char(v_product.max_amount, 'FM9999999990.00'))
          )
        END
      );
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

REVOKE ALL ON FUNCTION public.quote_vtu_purchase(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_vtu_purchase(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_import_smartapi_data_products(
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
  v_name text;
  v_amount_text text;
  v_provider_cost numeric(12,2);
  v_retail_price numeric(12,2);
  v_network text;
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can import Smart API products.';
  END IF;

  IF p_retail_multiplier IS NULL OR p_retail_multiplier <= 1 THEN
    RAISE EXCEPTION 'Retail multiplier must be greater than 1.';
  END IF;

  v_items := CASE
    WHEN jsonb_typeof(p_plans) = 'array' THEN p_plans
    WHEN jsonb_typeof(p_plans->'data') = 'array' THEN p_plans->'data'
    WHEN jsonb_typeof(p_plans->'result') = 'array' THEN p_plans->'result'
    WHEN jsonb_typeof(p_plans->'plans') = 'array' THEN p_plans->'plans'
    ELSE '[]'::jsonb
  END;

  FOR v_plan IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_plan_id := COALESCE(
      NULLIF(trim(v_plan->>'plan_id'), ''),
      NULLIF(trim(v_plan->>'id'), '')
    );
    v_name := COALESCE(
      NULLIF(trim(v_plan->>'name'), ''),
      NULLIF(trim(v_plan->>'plan_name'), ''),
      NULLIF(trim(v_plan->>'product'), '')
    );
    v_amount_text := regexp_replace(
      COALESCE(
        NULLIF(trim(v_plan->>'amount'), ''),
        NULLIF(trim(v_plan->>'price'), ''),
        NULLIF(trim(v_plan->>'cost'), '')
      ),
      '[^0-9.]',
      '',
      'g'
    );

    IF v_plan_id IS NULL
      OR v_name IS NULL
      OR COALESCE(v_amount_text !~ '^[0-9]+(\.[0-9]+)?$', true)
    THEN
      CONTINUE;
    END IF;

    v_provider_cost := round(v_amount_text::numeric, 2);
    IF v_provider_cost <= 0 THEN
      CONTINUE;
    END IF;

    v_retail_price := round(v_provider_cost * p_retail_multiplier, 2);
    IF lower(v_name) LIKE 'mtn%' THEN
      v_network := 'MTN';
    ELSIF lower(v_name) LIKE 'airtel%' THEN
      v_network := 'Airtel';
    ELSIF lower(v_name) LIKE 'glo%' THEN
      v_network := 'Glo';
    ELSIF lower(v_name) LIKE '9mobile%' THEN
      v_network := '9mobile';
    ELSIF lower(v_name) LIKE 'smile%' THEN
      v_network := 'Smile';
    ELSIF lower(v_name) LIKE 'freedom%' THEN
      v_network := 'Freedom Mobile';
    ELSE
      v_network := 'Other';
    END IF;

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
    VALUES (
      'smartapi',
      'data',
      v_network,
      v_name,
      v_plan_id,
      v_provider_cost,
      v_retail_price,
      0,
      0,
      NULL,
      NULL,
      true,
      v_count * 10,
      now()
    )
    ON CONFLICT (provider, category, network, provider_plan_id) DO UPDATE
    SET
      network = EXCLUDED.network,
      name = EXCLUDED.name,
      provider_cost = EXCLUDED.provider_cost,
      retail_price = EXCLUDED.retail_price,
      is_active = true,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'imported', v_count,
    'retail_multiplier', p_retail_multiplier,
    'markup_percent', round((p_retail_multiplier - 1) * 100, 4)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_import_smartapi_data_products(jsonb, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_import_smartapi_data_products(jsonb, numeric) TO authenticated;
