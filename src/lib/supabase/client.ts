import { createClient } from '@supabase/supabase-js';
import type { Database, SupabaseConfigStatus } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigStatus: SupabaseConfigStatus = supabaseUrl && supabasePublishableKey ? 'configured' : 'missing';

export const supabase = supabaseConfigStatus === 'configured'
  ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function getAuthCallbackUrl() {
  const origin = window.location.origin;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${origin}${basePath}/?auth=callback`;
}
