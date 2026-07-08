-- Admin-safe RPCs for user role management.
-- These avoid depending on direct table queries from the client for
-- cross-user reads/writes, which makes admin operations more resilient
-- to RLS policy drift.

CREATE OR REPLACE FUNCTION public.get_admin_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.created_at,
    COALESCE(
      (
        SELECT ur.role
        FROM public.user_roles ur
        WHERE ur.user_id = p.id
        ORDER BY CASE ur.role
          WHEN 'admin' THEN 1
          WHEN 'staff' THEN 2
          WHEN 'vip' THEN 3
          ELSE 4
        END
        LIMIT 1
      ),
      'user'::public.app_role
    ) AS role
  FROM public.profiles p
  WHERE auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.';
  END IF;

  IF p_role IS NULL THEN
    RAISE EXCEPTION 'Role is required.';
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins may manage user roles.';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users_with_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
