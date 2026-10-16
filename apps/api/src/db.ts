import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

/**
 * Authenticated client — acts AS the logged-in user. RLS applies.
 * Use for everything the user is allowed to touch directly.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Anonymous client — for public reads (RLS shows only public rows). */
export function anonClient(): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

/**
 * Admin client — bypasses RLS. Use ONLY in trusted server-side flows
 * (e.g. the payment webhook), never for user-initiated requests.
 */
export function adminClient(): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
