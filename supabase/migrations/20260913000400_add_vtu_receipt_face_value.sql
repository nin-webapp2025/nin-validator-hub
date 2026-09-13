-- Expose provider face value to receipts so electricity units can be derived
-- from the recharge amount instead of the wallet charge that may include fees.

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
  face_value numeric,
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
    t.face_value,
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

REVOKE ALL ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_vtu_transactions(text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
