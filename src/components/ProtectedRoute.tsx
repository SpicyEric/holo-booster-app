import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (role && !allowedRoles.includes(role)) {
        // Redirect basierend auf tatsächlicher Rolle
        switch (role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'merchant':
            navigate('/kunde');
            break;
          case 'partner':
            navigate('/partner/dashboard');
            break;
          default:
            navigate('/auth');
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

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
