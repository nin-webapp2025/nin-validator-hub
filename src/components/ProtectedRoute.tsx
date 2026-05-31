import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole, UserRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * Route protection component - Industry standard implementation
 * 
 * Prevents unauthorized access to role-specific routes
 * 
 * Usage:
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const {
    user,
    loading: authLoading,
    mfaLoading,
    mfaHasVerifiedFactor,
    mfaAssuranceLevel,
  } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const requiresAdminMfa = !!allowedRoles?.includes('admin') && role === 'admin';

  useEffect(() => {
    // Wait for both auth and role to load
    if (authLoading || roleLoading || mfaLoading) return;

    // Redirect to auth if not logged in
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // If allowedRoles specified, check if user has permission
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        // Redirect to their appropriate dashboard
        const userDashboardMap: Record<UserRole, string> = {
          admin: '/dashboard/admin',
          staff: '/dashboard/staff',
          vip: '/dashboard/vip',
          user: '/dashboard/user',
        };
        
        const targetPath = role ? userDashboardMap[role] : '/dashboard/user';
        navigate(targetPath, { replace: true });
        return;
      }
    }

    if (requiresAdminMfa && (!mfaHasVerifiedFactor || mfaAssuranceLevel !== 'aal2')) {
      navigate('/mfa-required', {
        replace: true,
        state: { returnTo: location.pathname },
      });
    }
  }, [
    user,
    role,
    authLoading,
    roleLoading,
    mfaLoading,
    mfaHasVerifiedFactor,
    mfaAssuranceLevel,
    allowedRoles,
    navigate,
    redirectTo,
    requiresAdminMfa,
    location.pathname,
  ]);

  // Show loading state while checking auth and role
  if (authLoading || roleLoading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}
