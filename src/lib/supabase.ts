import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configurationError = !url || !key
  ? 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the app.'
  : null;

// A placeholder keeps rendering possible so configuration errors can be shown in the UI.
export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'unconfigured', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
