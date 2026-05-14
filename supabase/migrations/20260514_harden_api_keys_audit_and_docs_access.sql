-- Harden api_keys updates, make audit_log server-written, and support
-- explicit API docs access checks for non-admin users.

-- Split api_keys policy so future changes are easier to reason about.
DROP POLICY IF EXISTS "Users can manage own api_keys" ON public.api_keys;

CREATE POLICY "Users can view own api_keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_api_key_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You are not allowed to update this API key.';
  END IF;

  -- Non-admin users may only rename or activate/deactivate their keys.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.key_hash IS DISTINCT FROM OLD.key_hash
    OR NEW.key_prefix IS DISTINCT FROM OLD.key_prefix
    OR NEW.permissions IS DISTINCT FROM OLD.permissions
    OR NEW.last_used_at IS DISTINCT FROM OLD.last_used_at
    OR NEW.rate_limit IS DISTINCT FROM OLD.rate_limit
    OR NEW.total_requests IS DISTINCT FROM OLD.total_requests
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.is_test IS DISTINCT FROM OLD.is_test
  THEN
    RAISE EXCEPTION 'Only name, is_active, and expires_at can be changed by users.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_api_key_updates ON public.api_keys;
CREATE TRIGGER guard_api_key_updates
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.guard_api_key_updates();

-- Make audit_log inserts server-controlled instead of direct client writes.
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
