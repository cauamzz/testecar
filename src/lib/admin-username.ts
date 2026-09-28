// Supabase Auth uses an internal email identifier; the UI accepts only usernames.
// .invalid is reserved and cannot receive password recovery mail.
const domain = "login.novadrive.invalid";

export function usernameToAuthEmail(value: string): string | null {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return null;
  return `${username}@${domain}`;
}

export function adminDisplayName(email?: string): string {
  return email?.endsWith(`@${domain}`)
    ? email.slice(0, -(domain.length + 1))
    : "Administrador";
}
