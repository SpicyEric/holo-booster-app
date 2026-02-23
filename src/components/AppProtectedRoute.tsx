import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessApp, canAccessWeb, getRoleDefaultPath, normalizeRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';

const AUTH_FLAG_KEY = 'eloyo_was_authenticated';

interface AppProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for App routes (/app/*)
 * Only allows end_customer role
 * Redirects web users to their appropriate dashboard
 * 
 * IMPORTANT: Uses sessionStorage to survive WebView reloads during NFC scans.
 * When Android delivers an NFC intent, the WebView may fully reload, resetting
 * all React state. The sessionStorage flag ensures we wait for session restoration
 * instead of immediately redirecting to auth.
 */
export const AppProtectedRoute = ({ children }: AppProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [waitingForSession, setWaitingForSession] = useState(false);
  const sessionCheckDone = useRef(false);

  // Persist auth flag to survive WebView reloads
  useEffect(() => {
    if (user) {
      try { sessionStorage.setItem(AUTH_FLAG_KEY, '1'); } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (sessionCheckDone.current) return;

    if (!user) {
      // Check if user was previously authenticated (survives WebView reload)
      let wasAuthenticated = false;
      try { wasAuthenticated = sessionStorage.getItem(AUTH_FLAG_KEY) === '1'; } catch {}

      if (wasAuthenticated) {
        // User was authenticated before this WebView reload.
        // Wait for session to be restored from storage before redirecting.
        setWaitingForSession(true);
        
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            // Session truly gone — clear flag and redirect
            console.log('[AppProtectedRoute] Session confirmed gone after reload, redirecting');
            try { sessionStorage.removeItem(AUTH_FLAG_KEY); } catch {}
            navigate('/app/auth');
          } else {
            console.log('[AppProtectedRoute] Session restored after reload, staying');
            // Session is valid — useAuth will catch up shortly
          }
          sessionCheckDone.current = true;
          setWaitingForSession(false);
        });
      } else {
        // Never authenticated — redirect immediately
        navigate('/app/auth');
        sessionCheckDone.current = true;
      }
    } else if (role) {
      sessionCheckDone.current = true;
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

  // Reset sessionCheckDone when user changes (e.g. logout then login)
  useEffect(() => {
    if (user) {
      sessionCheckDone.current = false;
    }
  }, [user]);

  if (loading || waitingForSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Render children if user is authenticated with correct role, OR if we're still waiting for auth to settle
  if (user) {
    const normalizedRole = role ? normalizeRole(role) : null;
    if (normalizedRole && !canAccessApp(normalizedRole)) {
      return null;
    }
    return <>{children}</>;
  }

  // Check sessionStorage — if flag is set, keep rendering while session restores
  let stillExpectingSession = false;
  try { stillExpectingSession = sessionStorage.getItem(AUTH_FLAG_KEY) === '1'; } catch {}
  if (stillExpectingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return null;
};
