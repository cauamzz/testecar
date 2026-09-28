import { createClient } from "@supabase/supabase-js";
import { staffHandler } from "./handler.ts";

// This credential stays inside Supabase. Never put it in Next.js or NEXT_PUBLIC_*.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(staffHandler(admin));
