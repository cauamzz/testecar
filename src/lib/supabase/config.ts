import { validatePublicSupabase } from "../public-env";
export const supabaseConfigured = () =>
  validatePublicSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
export const supabaseEnv = () => {
  if (!supabaseConfigured()) throw new Error("Supabase não configurado.");
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };
};
