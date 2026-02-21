import { useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, deriveUserRole } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const roleResolvingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const resolveRole = async (userId: string, email?: string) => {
      if (roleResolvingRef.current) {
        console.log('[useAuth] resolveRole skipped - already resolving');
        return;
      }
      roleResolvingRef.current = true;
      console.log('[useAuth] resolveRole START for', userId, email);
      try {
        const resolved = await deriveUserRole(userId, email);
        console.log('[useAuth] resolveRole RESULT:', resolved);
        if (isMounted) {
          setRole(resolved);
        }
      } catch (err) {
        console.error('[useAuth] Role resolution failed:', err);
      } finally {
        roleResolvingRef.current = false;
        if (isMounted) {
          console.log('[useAuth] Setting loading=false');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Don't set loading=false here; wait for role resolution
          setTimeout(() => {
            resolveRole(currentSession.user.id, currentSession.user.email);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          await resolveRole(existingSession.user.id, existingSession.user.email);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[useAuth] Init error:', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, role, loading };
};
