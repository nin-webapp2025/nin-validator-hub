import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getDevRoleOverride, setDevRoleOverride } from '@/lib/devRoleOverride';

export type UserRole = 'admin' | 'user' | 'staff';

export { getDevRoleOverride, setDevRoleOverride };

interface UseRoleReturn {
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isStaff: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage user role and provide role-based booleans
 * Fetches role from user_roles table based on authenticated user
 */
export function useRole(): UseRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Tracks which user id `role` was actually resolved for, so we can tell
  // a genuinely-resolved role apart from a stale one left over from the
  // previous user (see the isLoading derivation below).
  const resolvedForUserId = useRef<string | null>(null);

  const fetchRole = async () => {
    if (!user) {
      resolvedForUserId.current = null;
      setRole(null);
      setIsLoading(false);
      return;
    }

    // Dev-mode override takes priority (scoped to this user id — see devRoleOverride.ts)
    const devOverride = getDevRoleOverride(user.id);
    if (devOverride) {
      resolvedForUserId.current = user.id;
      setRole(devOverride);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        throw roleError;
      }

      // Default to 'user' if no role is set. The 'vip' enum value still
      // exists at the database layer (see supabase/migrations) even though
      // the app no longer assigns or understands it — fall back to 'user'
      // if a row somehow still carries it.
      const fetchedRole = data?.role;
      setRole(fetchedRole && fetchedRole !== 'vip' ? fetchedRole : 'user');
      resolvedForUserId.current = user.id;
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user role'));
      // Default to 'user' on error
      setRole('user');
      resolvedForUserId.current = user.id;
    } finally {
      setIsLoading(false);
    }
  };

  // `isLoading` (state) only flips once fetchRole's own effect has run for
  // the current user. Right when `user` transitions from null to a real
  // user, there's a render where that effect hasn't fired yet, so `role`
  // and `isLoading` are still whatever was left over from the logged-out
  // state (null / false). Consumers like ProtectedRoute treat that as "role
  // resolved to null" and redirect incorrectly. Deriving isLoading here —
  // comparing against the user id the current `role` was actually fetched
  // for — closes that window without waiting for another render.
  const effectiveIsLoading = isLoading || (!!user && resolvedForUserId.current !== user.id);

  useEffect(() => {
    fetchRole();
  }, [user?.id]);

  // Re-fetch when dev override changes
  useEffect(() => {
    const handler = () => fetchRole();
    window.addEventListener('dev-role-changed', handler);
    return () => window.removeEventListener('dev-role-changed', handler);
  }, [user?.id]);

  return {
    role,
    isLoading: effectiveIsLoading,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isStaff: role === 'staff',
    error,
    refetch: fetchRole,
  };
}
