// Replace these two values with your Supabase project values.
// NEVER put the service_role key here.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

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
