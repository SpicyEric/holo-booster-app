import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessApp, canAccessWeb, getRoleDefaultPath, normalizeRole } from '@/lib/roles';

interface AppProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for App routes (/app/*)
 * Only allows end_customer role
 * Redirects web users to their appropriate dashboard
 */
export const AppProtectedRoute = ({ children }: AppProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/app/auth');
      } else if (role) {
        const normalizedRole = normalizeRole(role);
        if (normalizedRole && !canAccessApp(normalizedRole)) {
          if (canAccessWeb(normalizedRole)) {
            navigate(getRoleDefaultPath(normalizedRole));
          } else {
            navigate('/auth');
          }
        }
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const normalizedRole = role ? normalizeRole(role) : null;
  if (!user || !normalizedRole || !canAccessApp(normalizedRole)) {
    return null;
  }

  return <>{children}</>;
};
