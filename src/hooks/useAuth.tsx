import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { appSupabase } from '@/integrations/app-supabase/client';
import { UserRole, deriveUserRole } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST (App-DB)
    const { data: { subscription } } = appSupabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            deriveUserRole(session.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    appSupabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        deriveUserRole(session.user.id).then(setRole);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, role, loading };
};
