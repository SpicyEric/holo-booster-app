import { supabase } from "@/integrations/supabase/client";

// Alle Rollen (Website + App)
export type UserRole = 'admin' | 'merchant' | 'partner' | 'end_customer' | 'customer';

// Mapping für Redirects nach Login
export const getRoleDashboardPath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'merchant':
      return '/kunde';
    case 'partner':
      return '/partner/dashboard';
    case 'end_customer':
    case 'customer':
      return '/app';
    default:
      return '/';
  }
};

export const signUp = async (email: string, password: string, fullName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  // Registrierung über Lovable Cloud (Website-Auth)
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
  // Login über Lovable Cloud (Website-Auth)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  // Ignoriere Session-bezogene Fehler - Session ist bereits beendet
  if (error && error.message?.toLowerCase().includes('session')) {
    return { error: null };
  }
  return { error };
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    // Rollen aus Lovable Cloud user_roles Tabelle
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[getUserRole] Error fetching role from Lovable Cloud:', error);
      return null;
    }
    if (!data) return null;
    
    const roleValue = data.role as string;
    
    // Alle gültigen Rollen zurückgeben
    if (roleValue === 'admin' || roleValue === 'merchant' || roleValue === 'partner' || roleValue === 'end_customer' || roleValue === 'customer') {
      // Normalize customer to end_customer
      if (roleValue === 'customer') return 'end_customer';
      return roleValue as UserRole;
    }
    
    return null;
  } catch (err) {
    console.error('[getUserRole] Exception:', err);
    return null;
  }
};

export const deriveUserRole = async (userId: string, userEmail?: string): Promise<UserRole | null> => {
  try {
    // HARDCODED ADMIN CHECK - Diese Email ist IMMER Admin auf der Website
    const knownAdminEmails = ['ericpfadisch@gmx.de'];
    if (userEmail && knownAdminEmails.includes(userEmail.toLowerCase())) {
      console.log('[deriveUserRole] User is admin via email whitelist:', userEmail);
      return 'admin';
    }
    
    // Rollen aus Lovable Cloud user_roles Tabelle prüfen
    const { data: rolesData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (roleError) {
      console.error('[deriveUserRole] Error fetching from Lovable Cloud user_roles:', roleError);
    }
    
    if (rolesData && rolesData.length > 0) {
      const roles = rolesData.map((r) => r.role as string);
      console.log('[deriveUserRole] Found roles in Lovable Cloud:', roles);
      
      // Context-aware: in der App (/app/*) bevorzuge end_customer,
      // sonst Web-Priorisierung admin > merchant > partner > end_customer
      const isAppContext = typeof window !== 'undefined' && window.location.pathname.startsWith('/app');
      
      if (isAppContext && (roles.includes('end_customer') || roles.includes('customer'))) {
        return 'end_customer';
      }
      
      if (roles.includes('admin')) {
        return 'admin';
      }
      if (roles.includes('merchant')) {
        return 'merchant';
      }
      if (roles.includes('partner')) {
        return 'partner';
      }
      if (roles.includes('end_customer') || roles.includes('customer')) {
        return 'end_customer';
      }
    }
    
    // Wenn keine Rolle gefunden, prüfen ob User als customer_user existiert
    const { data: customerUserData, error: customerUserError } = await supabase
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerUserError) {
      console.error('[deriveUserRole] Error checking customer_users:', customerUserError);
    }
    
    if (customerUserData) {
      console.log('[deriveUserRole] User is linked to customer, inferring merchant role');
      return 'merchant';
    }
    
    // Prüfen ob es eine merchant_assignment gibt
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('merchant_assignments')
      .select('id')
      .eq('merchant_user_id', userId)
      .maybeSingle();
    
    if (assignmentError) {
      console.error('[deriveUserRole] Error checking merchant_assignments:', assignmentError);
    }
    
    if (assignmentData) {
      console.log('[deriveUserRole] User has merchant assignment, inferring merchant role');
      return 'merchant';
    }
    
    console.warn('[deriveUserRole] No website role found for user:', userId);
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

// Prüft ob User ein Händler ist (merchant oder admin)
export const checkMerchantRole = async (userId: string): Promise<boolean> => {
  const role = await getUserRole(userId);
  return role === 'merchant' || role === 'admin';
};

// Holt den Customer aus Lovable Cloud anhand der Email des eingeloggten Users
export const getUserMerchantByEmail = async (userEmail: string) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (error) {
      console.error('[getUserMerchantByEmail] Error:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('[getUserMerchantByEmail] Exception:', err);
    return null;
  }
};

// Holt den Customer aus Lovable Cloud anhand der User-ID
export const getUserCustomer = async (userId: string) => {
  try {
    // Erst customer_users prüfen für die Verknüpfung
    const { data: linkData, error: linkError } = await supabase
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (linkError || !linkData) {
      console.log('[getUserCustomer] No customer_users link found');
      return null;
    }
    
    // Dann den Customer laden
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', linkData.customer_id)
      .maybeSingle();
    
    if (customerError) {
      console.error('[getUserCustomer] Error fetching customer:', customerError);
      return null;
    }
    
    return customerData;
  } catch (err) {
    console.error('[getUserCustomer] Exception:', err);
    return null;
  }
};
