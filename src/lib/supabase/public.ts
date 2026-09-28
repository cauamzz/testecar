import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfigured, supabaseEnv } from "./config";

// Public reads always run as anon. They never inherit an administrator's cookie.
export function publicClient() {
  if (!supabaseConfigured()) return null;
  const { url, key } = supabaseEnv();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
