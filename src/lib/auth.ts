import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'partner' | 'merchant';

export const signUp = async (email: string, password: string, fullName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName || '',
      }
    }
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('user_roles' as any)
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return null;
  return data.role as UserRole;
};

export const checkAdminRole = async (userId: string): Promise<boolean> => {
  const role = await getUserRole(userId);
  return role === 'admin';
};
