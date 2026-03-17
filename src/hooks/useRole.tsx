import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'user' | 'staff' | 'vip';

const DEV_ROLE_KEY = 'sparkid_dev_role';

/** Read the dev-mode override (if any). Returns null when not overridden. */
export function getDevRoleOverride(): UserRole | null {
  if (import.meta.env.PROD) return null; // disabled in production builds
  const stored = localStorage.getItem(DEV_ROLE_KEY);
  if (stored && ['admin', 'user', 'staff', 'vip'].includes(stored)) {
    return stored as UserRole;
  }
  return null;
}

/** Set or clear the dev-mode role override. */
export function setDevRoleOverride(role: UserRole | null) {
  if (role) {
    localStorage.setItem(DEV_ROLE_KEY, role);
  } else {
    localStorage.removeItem(DEV_ROLE_KEY);
  }
  // Dispatch storage event so other tabs / hooks react
  window.dispatchEvent(new Event('dev-role-changed'));
}

interface UseRoleReturn {
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isStaff: boolean;
  isVip: boolean;
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

  const fetchRole = async () => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    // Dev-mode override takes priority
    const devOverride = getDevRoleOverride();
    if (devOverride) {
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

      // Default to 'user' if no role is set
      setRole(data?.role || 'user');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user role'));
      // Default to 'user' on error
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  };

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
    isLoading,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isStaff: role === 'staff',
    isVip: role === 'vip',
    error,
    refetch: fetchRole,
  };
}
