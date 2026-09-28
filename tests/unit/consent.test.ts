import { describe, expect, it } from "vitest";
import {
  allowsConsent,
  CONSENT_MAX_AGE,
  DENIED,
  makeConsent,
  parseConsent,
} from "../../src/lib/consent";

describe("consentimento opcional", () => {
  const now = 1_800_000_000_000;
  it("não autoriza sem escolha válida", () => {
    for (const raw of [null, "", "{", "null", "{}", "true"]) {
      expect(parseConsent(raw, now)).toBeNull();
    }
    expect(allowsConsent(null, "marketing", now)).toBe(false);
  });
  it("separa as finalidades e mantém a recusa", () => {
    const saved = makeConsent({ ...DENIED, external: true }, now);
    const parsed = parseConsent(JSON.stringify(saved), now);
    expect(allowsConsent(parsed, "external", now)).toBe(true);
    expect(allowsConsent(parsed, "marketing", now)).toBe(false);
    expect(allowsConsent(parsed, "analytics", now)).toBe(false);
    expect(
      parseConsent(JSON.stringify(makeConsent(DENIED, now)), now),
    ).toMatchObject(DENIED);
  });
  it("exige nova escolha ao expirar ou mudar a política", () => {
    const saved = makeConsent(
      { analytics: true, marketing: true, external: true },
      now,
    );
    expect(
      parseConsent(JSON.stringify(saved), now + CONSENT_MAX_AGE),
    ).toBeNull();
    expect(allowsConsent(saved, "marketing", now + CONSENT_MAX_AGE)).toBe(
      false,
    );
    expect(
      parseConsent(JSON.stringify({ ...saved, version: 0 }), now),
    ).toBeNull();
  });
  it("rejeita datas e categorias inválidas", () => {
    const saved = makeConsent(DENIED, now);
    for (const patch of [
      { marketing: "true" },
      { analytics: null },
      { savedAt: now + 1 },
      { expiresAt: saved.expiresAt + 1 },
    ]) {
      expect(
        parseConsent(JSON.stringify({ ...saved, ...patch }), now),
      ).toBeNull();
    }
  });
});
