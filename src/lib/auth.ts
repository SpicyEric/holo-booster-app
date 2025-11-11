import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'partner' | 'merchant' | 'customer';

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
  try {
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[getUserRole] Error fetching role:', error);
      return null;
    }
    if (!data) return null;
    return data.role as UserRole;
  } catch (err) {
    console.error('[getUserRole] Exception:', err);
    return null;
  }
};

export const deriveUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    // First try user_roles table
    const { data: roleData, error: roleError } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error('[deriveUserRole] Error fetching from user_roles:', roleError);
    }
    
    if (roleData?.role) {
      console.log('[deriveUserRole] Found role in user_roles:', roleData.role);
      return roleData.role as UserRole;
    }
    
    // If no role found, check if user is linked to a customer
    const { data: customerLink, error: linkError } = await (supabase as any)
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (linkError) {
      console.error('[deriveUserRole] Error checking customer_users:', linkError);
      return null;
    }
    
    if (customerLink) {
      console.log('[deriveUserRole] User is linked to customer, inferring customer role');
      return 'customer';
    }
    
    console.warn('[deriveUserRole] No role found for user:', userId);
    return null;
  } catch (err) {
    console.error('[deriveUserRole] Exception:', err);
    return null;
  }
};

export const checkAdminRole = async (userId: string): Promise<boolean> => {
  const role = await getUserRole(userId);
  return role === 'admin';
};
