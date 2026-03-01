import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'user' | 'staff' | 'vip';

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
