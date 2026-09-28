export const CONSENT_KEY = "novadrive:privacy";
// Bump whenever a vendor, purpose or policy materially changes (including adding Pixel).
export const CONSENT_VERSION = 2;
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
export type ConsentChoices = {
  analytics: boolean;
  marketing: boolean;
  external: boolean;
};
export type Consent = ConsentChoices & {
  version: number;
  savedAt: number;
  expiresAt: number;
};
export const DENIED: ConsentChoices = {
  analytics: false,
  marketing: false,
  external: false,
};
export function makeConsent(
  choices: ConsentChoices,
  now = Date.now(),
): Consent {
  return {
    ...choices,
    version: CONSENT_VERSION,
    savedAt: now,
    expiresAt: now + CONSENT_MAX_AGE,
  };
}
export function parseConsent(
  raw: string | null,
  now = Date.now(),
): Consent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (
      v.version !== CONSENT_VERSION ||
      !Number.isFinite(v.savedAt) ||
      !Number.isFinite(v.expiresAt) ||
      v.savedAt > now ||
      v.expiresAt <= now ||
      v.expiresAt !== v.savedAt + CONSENT_MAX_AGE ||
      [v.analytics, v.marketing, v.external].some((x) => typeof x !== "boolean")
    )
      return null;
    return {
      version: v.version,
      savedAt: v.savedAt,
      expiresAt: v.expiresAt,
      analytics: v.analytics,
      marketing: v.marketing,
      external: v.external,
    };
  } catch {
    return null;
  }
}
export function allowsConsent(
  consent: Consent | null,
  category: keyof ConsentChoices,
  now = Date.now(),
) {
  return Boolean(
    consent && parseConsent(JSON.stringify(consent), now)?.[category],
  );
}
