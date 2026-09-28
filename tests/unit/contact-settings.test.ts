import { describe, it, expect } from "vitest";
import {
  contactSettingsSchema,
  socialUrl,
} from "../../src/lib/contact-settings";
describe("contact settings", () => {
  it("accepts generic platform links for initial handover", () => {
    expect(socialUrl("https://www.instagram.com/", "instagram")).toBe("https://www.instagram.com/");
    expect(socialUrl("https://www.facebook.com/", "facebook")).toBe("https://www.facebook.com/");
  });
  it("normalizes handles, page links and Brazilian phone numbers", () => {
    expect(
      contactSettingsSchema.parse({
        instagram: "@loja.test",
        facebook: "facebook.com/lojatest/",
        whatsapp: "+55 (11) 99999-9999",
      }),
    ).toEqual({
      instagram: "https://www.instagram.com/loja.test",
      facebook: "https://www.facebook.com/lojatest",
      whatsapp: "5511999999999",
    });
    expect(
      socialUrl(
        "https://www.facebook.com/profile.php?id=12345&ref=share",
        "facebook",
      ),
    ).toBe("https://www.facebook.com/profile.php?id=12345");
  });
  it("allows removing channels", () => {
    expect(
      contactSettingsSchema.parse({
        instagram: "",
        facebook: "",
        whatsapp: "",
      }),
    ).toEqual({ instagram: "", facebook: "", whatsapp: "" });
  });
  it.each([
    "javascript:alert(1)",
    "https://instagram.com.evil.com/store",
    "https://evil.com/store",
    "https://user:pass@instagram.com/store",
    "http://instagram.com/store",
  ])("rejects unsafe links %s", (value) => {
    expect(socialUrl(value, "instagram")).toBeNull();
  });
  it("rejects forged visual settings and malformed phone numbers", () => {
    const base = { instagram: "", facebook: "", whatsapp: "11999999999" };
    expect(
      contactSettingsSchema.safeParse({ ...base, hero_title: "changed" })
        .success,
    ).toBe(false);
    for (const whatsapp of [
      "123",
      "abcdefghijk",
      "00000000000",
      "55119999999999999",
    ])
      expect(
        contactSettingsSchema.safeParse({ ...base, whatsapp }).success,
      ).toBe(false);
  });
});
