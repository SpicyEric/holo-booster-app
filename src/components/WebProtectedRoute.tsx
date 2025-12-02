import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, canAccessWeb, getRoleDefaultPath } from '@/lib/roles';

interface WebProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Route guard for Web routes (/admin/*, /partner/*, /kunde/*)
 * Only allows specified web roles
 * Redirects app users to /app
 */
export const WebProtectedRoute = ({ children, allowedRoles }: WebProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (role) {
        // Map legacy roles
        const normalizedRole = role as UserRole;
        
        if (!canAccessWeb(normalizedRole)) {
          // App user trying to access web - redirect to app
          navigate('/app');
        } else if (!allowedRoles.includes(normalizedRole)) {
          // Wrong web role - redirect to their dashboard
          navigate(getRoleDefaultPath(normalizedRole));
        }
      }
    }
  }, [user, role, loading, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role as UserRole)) {
    return null;
  }

  return <>{children}</>;
};
