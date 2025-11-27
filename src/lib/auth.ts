import { appSupabase } from "@/integrations/app-supabase/client";
import type { AppRole } from "@/integrations/app-supabase/types";

// App-Rollen aus der App-Datenbank
export type UserRole = AppRole; // 'endkunde' | 'kunde' | 'admin'

// Mapping für Redirects nach Login
export const getRoleDashboardPath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'kunde':
      return '/kunde/dashboard'; // Händler-Dashboard
    case 'endkunde':
      return '/'; // Endkunden haben kein Dashboard auf der Website
    default:
      return '/';
  }
};

export const signUp = async (email: string, password: string, fullName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  // Registrierung über App-DB (gleiche Auth)
  const { data, error } = await appSupabase.auth.signUp({
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
  const { data, error } = await appSupabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await appSupabase.auth.signOut();
  return { error };
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await appSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[getUserRole] Error fetching role from App-DB:', error);
      return null;
    }
    if (!data) return null;
    
    // Cast explizit zu AppRole
    const roleValue = (data as { role: string }).role;
    return roleValue as UserRole;
  } catch (err) {
    console.error('[getUserRole] Exception:', err);
    return null;
  }
};

export const deriveUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    // Rolle aus App-DB holen
    const { data: roleData, error: roleError } = await appSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error('[deriveUserRole] Error fetching from App-DB user_roles:', roleError);
    }
    
    if (roleData) {
      const roleValue = (roleData as { role: string }).role;
      console.log('[deriveUserRole] Found role in App-DB:', roleValue);
      return roleValue as UserRole;
    }
    
    // Wenn keine Rolle gefunden, prüfen ob User als Merchant-Owner existiert
    const { data: merchantData, error: merchantError } = await appSupabase
      .from('merchants')
      .select('id')
      .eq('owner_user_id', userId)
      .maybeSingle();
    
    if (merchantError) {
      console.error('[deriveUserRole] Error checking merchants:', merchantError);
    }
    
    if (merchantData) {
      console.log('[deriveUserRole] User is merchant owner, inferring kunde role');
      return 'kunde';
    }
    
    console.warn('[deriveUserRole] No role found for user in App-DB:', userId);
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

// Prüft ob User ein Händler ist (kunde oder admin)
export const checkMerchantRole = async (userId: string): Promise<boolean> => {
  const role = await getUserRole(userId);
  return role === 'kunde' || role === 'admin';
};

// Holt den Merchant für einen Händler-User
export const getUserMerchant = async (userId: string) => {
  try {
    const { data, error } = await appSupabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[getUserMerchant] Error:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('[getUserMerchant] Exception:', err);
    return null;
  }
};
