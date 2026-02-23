import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessApp, canAccessWeb, getRoleDefaultPath, normalizeRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';

interface AppProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for App routes (/app/*)
 * Only allows end_customer role
 * Redirects web users to their appropriate dashboard
 * 
 * IMPORTANT: Includes a session re-check before redirecting to auth.
 * This prevents false redirects during NFC pause/resume cycles where
 * the auth state briefly becomes null.
 */
export const AppProtectedRoute = ({ children }: AppProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const hadUserRef = useRef(false);

  // Track if we ever had a user (to distinguish "lost session" from "never had session")
  useEffect(() => {
    if (user) {
      hadUserRef.current = true;
      setConfirmed(true);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (hadUserRef.current) {
        // User was previously authenticated but is now null.
        // This can happen during NFC pause/resume cycles.
        // Re-check the actual session before redirecting.
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            console.log('[AppProtectedRoute] Session confirmed gone, redirecting to auth');
            navigate('/app/auth');
          } else {
            console.log('[AppProtectedRoute] Session still valid despite null user hook, staying');
            // Session is still valid — the useAuth hook will catch up
          }
        });
      } else {
        // Never had a user — redirect immediately
        navigate('/app/auth');
      }
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
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // If we previously confirmed a user, keep rendering children even if user is briefly null
  // (prevents flash to blank during NFC pause/resume)
  if (confirmed || user) {
    const normalizedRole = role ? normalizeRole(role) : null;
    if (user && normalizedRole && !canAccessApp(normalizedRole)) {
      return null;
    }
    return <>{children}</>;
  }

  return null;
};
