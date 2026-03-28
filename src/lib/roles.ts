/**
 * Unified Role System for Eloyo Master Project
 * 
 * Roles:
 * - admin: Full access to admin dashboard
 * - sales_partner: Access to partner dashboard
 * - merchant: Access to merchant dashboard (Kunde)
 * - end_customer: Access to app only (Endkunde)
 */

export type UserRole = 'admin' | 'sales_partner' | 'merchant' | 'end_customer';

// Mapping for legacy role names
export const normalizeRole = (role: string): UserRole | null => {
  const roleMap: Record<string, UserRole> = {
    'admin': 'admin',
    'partner': 'sales_partner',
    'sales_partner': 'sales_partner',
    'merchant': 'merchant',
    'kunde': 'merchant',
    'customer': 'end_customer',
    'end_customer': 'end_customer',
    'endkunde': 'end_customer',
  };
  return roleMap[role.toLowerCase()] || null;
};

// Web roles (can access website dashboards)
export const WEB_ROLES: UserRole[] = ['admin', 'sales_partner', 'merchant'];

// App roles (can access mobile app)
export const APP_ROLES: UserRole[] = ['end_customer'];

// Check if role can access web dashboards
export const canAccessWeb = (role: UserRole | null): boolean => {
  return role !== null && WEB_ROLES.includes(role);
};

// Check if role can access app
export const canAccessApp = (role: UserRole | null): boolean => {
  return role !== null && APP_ROLES.includes(role);
};

// Get default redirect path for role
export const getRoleDefaultPath = (role: UserRole | null): string => {
  if (!role) return '/auth';
  
  switch (role) {
    case 'admin':
      return '/admin';
    case 'sales_partner':
      return '/vertriebler';
    case 'merchant':
      return '/kunde';
    case 'end_customer':
      return '/app';
    default:
      return '/auth';
  }
};

// Get login redirect based on context (web vs app)
export const getLoginRedirect = (role: UserRole | null, isAppContext: boolean): string => {
  if (!role) return '/auth';
  
  // If in app context but has web role, show error
  if (isAppContext && canAccessWeb(role) && !canAccessApp(role)) {
    return '/app/wrong-account';
  }
  
  // If in web context but has app role, redirect to app
  if (!isAppContext && canAccessApp(role) && !canAccessWeb(role)) {
    return '/app';
  }
  
  return getRoleDefaultPath(role);
};
