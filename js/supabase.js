// Replace these two values with your Supabase project values.
// NEVER put the service_role key here.
const SUPABASE_URL = "rczlyfjqegkliihhljcy";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uQEPwdxcSnjXSWQhW6d3gw_61-i3dZj";

if (SUPABASE_URL.includes("YOUR_") || SUPABASE_PUBLISHABLE_KEY.includes("YOUR_")) {
  console.warn("Configure js/supabase.js before using EventMediaHub.");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
