-- The VIP role is being removed from the app layer (no more VIP dashboard/role
-- assignment). No production user currently holds 'vip' (verified before this
-- migration). Simplify the tie-break ordering used when a user somehow has more
-- than one row in user_roles; the 'vip' case is dropped since the UI no longer
-- assigns it, and the underlying app_role enum value is left in place (dropping
-- a Postgres enum value requires recreating the type and is not worth the risk
-- for an already-unused value).
CREATE OR REPLACE FUNCTION public.get_admin_users_with_roles()
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, role app_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
          ELSE 3
        END
        LIMIT 1
      ),
      'user'::public.app_role
    ) AS role
  FROM public.profiles p
  WHERE auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$function$;
