// Shared by next.config (build/start) and client/server configuration.
// Errors intentionally never include values or decoded credentials.
export function validatePublicSupabase(url?: string, key?: string) {
  if (!url && !key) return false;
  if (!url || !key)
    throw new Error("Configure as duas variáveis públicas do Supabase.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL pública do Supabase inválida.");
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !(
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
    )
  )
    throw new Error(
      "Supabase exige HTTPS (HTTP somente em localhost), sem credenciais na URL.",
    );
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  // Support legacy anon JWTs, but never a service_role token in a public variable.
  try {
    const parts = key.split(".");
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (parts.length === 3 && payload.role === "anon") return true;
  } catch {
    /* Reject without logging the input. */
  }
  throw new Error(
    "Use somente a chave publishable/anon do Supabase. Chaves secret/service_role são proibidas no aplicativo.",
  );
}
