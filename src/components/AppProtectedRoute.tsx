import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessApp, canAccessWeb, getRoleDefaultPath, normalizeRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useAppViewportLock } from '@/app/hooks/useAppViewportLock';

const AUTH_FLAG_KEY = 'eloyo_was_authenticated';
const GRACE_PERIOD_MS = 3000;

interface AppProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for App routes (/app/*)
 * 
 * CRITICAL: NFC scans on Android cause Activity pause/resume cycles that can
 * briefly reset React state (user becomes null). We use multiple safeguards:
 * 1. sessionStorage flag survives full WebView reloads
 * 2. Grace period prevents redirect during brief null flashes
 * 3. Explicit session re-verification before any redirect
 */
export const AppProtectedRoute = ({ children }: AppProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  useAppViewportLock();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const hadUserRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if we ever had a user & persist to sessionStorage
  useEffect(() => {
    if (user) {
      hadUserRef.current = true;
      try { sessionStorage.setItem(AUTH_FLAG_KEY, '1'); } catch {}
      setVerified(true);
      // Cancel any pending redirect
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    }
  }, [user]);

  // Main guard: only act when loading is done
  useEffect(() => {
    if (loading) return;

    // User is present — check role
    if (user) {
      if (role) {
        const normalizedRole = normalizeRole(role);
        if (normalizedRole && !canAccessApp(normalizedRole)) {
          if (canAccessWeb(normalizedRole)) {
            navigate(getRoleDefaultPath(normalizedRole));
          } else {
            navigate('/auth');
          }
        }
      }
      return;
    }

    // User is null — but was previously logged in (NFC pause/resume race)
    if (hadUserRef.current) {
      console.log('[AppProtectedRoute] User went null but was previously logged in — waiting for session');
      // Don't redirect, just wait. useAuth will restore the user.
      return;
    }

    // User is null — check sessionStorage (survives full WebView reload)
    let wasAuthenticated = false;
    try { wasAuthenticated = sessionStorage.getItem(AUTH_FLAG_KEY) === '1'; } catch {}

    if (wasAuthenticated && !checking) {
      // Had a session before this page load — verify it's still valid
      setChecking(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('[AppProtectedRoute] Session restored from storage');
          // useAuth will pick this up and set user
        } else {
          console.log('[AppProtectedRoute] Session truly gone, redirecting');
          try { sessionStorage.removeItem(AUTH_FLAG_KEY); } catch {}
          navigate('/app/auth');
        }
        setChecking(false);
      });
      return;
    }

    // Never had a session — redirect after a brief grace period
    // (in case auth is still initializing from a deep link)
    if (!redirectTimerRef.current) {
      redirectTimerRef.current = setTimeout(() => {
        // Re-check one more time
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            console.log('[AppProtectedRoute] No session after grace period, redirecting');
            navigate('/app/auth');
          }
          redirectTimerRef.current = null;
        });
      }, 500);
    }
  }, [user, role, loading, navigate, checking]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Show loading spinner while auth is resolving
  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // User is authenticated with correct role
  if (user) {
    const normalizedRole = role ? normalizeRole(role) : null;
    if (normalizedRole && !canAccessApp(normalizedRole)) {
      return null;
    }
    return <>{children}</>;
  }

  // User is null but we expect session restoration (NFC reload or hadUser)
  let expectingSession = hadUserRef.current;
  if (!expectingSession) {
    try { expectingSession = sessionStorage.getItem(AUTH_FLAG_KEY) === '1'; } catch {}
  }
  
  if (expectingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return null;
};
