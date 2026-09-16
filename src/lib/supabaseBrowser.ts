'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client. Publishable key only, and the vdemo_* tables grant it
 * SELECT and nothing else — it exists purely to hold open the Realtime
 * subscription. All mutations go through this app's own API routes.
 */

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Returning null rather than throwing: if Realtime cannot be configured the
  // demo must still work on polling alone. A missing key degrades the refresh
  // rate, it does not take the event down.
  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  return cached;
}
