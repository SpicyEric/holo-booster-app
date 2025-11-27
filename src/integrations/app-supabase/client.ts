/**
 * Supabase Client für die App-Datenbank (Eloyo App)
 * 
 * Diese Datenbank enthält die Haupt-Geschäftslogik:
 * - merchants (Händler)
 * - loyalty_accounts (Treuekonten)
 * - transactions (Punktetransaktionen)
 * - user_roles (mit app_role: 'endkunde', 'kunde', 'admin')
 * - rewards, offers, etc.
 */
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from './types';

// App-DB Credentials (ANON_KEY ist publishable/sicher für Frontend)
const APP_SUPABASE_URL = 'https://eixlhqrgjdzzdpxipjuz.supabase.co';
const APP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeGxocXJnamR6emRweGlwanV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTI5NzAsImV4cCI6MjA3OTM4ODk3MH0.jFWzv11wHHjdJZglK9DipJ_Erq655BzmRWe6AzxHPu4';

export const appSupabase = createClient<AppDatabase>(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export für einfachen Zugriff
export const APP_SUPABASE_URL_EXPORT = APP_SUPABASE_URL;
