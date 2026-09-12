-- Make audit_log inserts server-controlled instead of direct client writes.
-- The previous "Authenticated users can insert audit_log" policy allowed
-- ANY signed-in user to insert arbitrary rows directly (WITH CHECK (true)),
-- letting a non-admin forge audit entries. Route inserts through this
-- SECURITY DEFINER function instead, which enforces admin-only + sets
-- actor_id from the authenticated session rather than trusting client input.
--
-- Note: this table also has an existing local migration
-- (20260514_harden_api_keys_audit_and_docs_access.sql) that bundles this
-- same audit_log fix together with unrelated api_keys RLS/trigger changes.
-- Only the audit_log portion is applied here; the api_keys portion was
-- never applied to production and is left for a separate, dedicated change.
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON public.audit_log;

CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action text,
  p_target_type text,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can write audit logs';
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_audit_log(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(text, text, text, jsonb) TO authenticated;
