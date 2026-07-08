-- Admin-only helper for importing Smart API data plans with a retail markup.
-- Expected plan items include plan_id, name, and amount from Smart API's
-- /vtu/api/plans/{API_KEY} endpoint.

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
    ON CONFLICT (provider, category, provider_plan_id) DO UPDATE
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
