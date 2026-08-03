// src/services/supabase.js
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/services/supabase.js
// (Create the "services" folder inside src/ if it doesn't exist)
// ─────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
    "Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:    true,   // keep user logged in on refresh
    autoRefreshToken:  true,   // auto-renew JWT before expiry
    detectSessionInUrl: true,  // handle email confirm links
  },
});

if (import.meta.env.DEV) {
  window.supabase = supabase;
}
